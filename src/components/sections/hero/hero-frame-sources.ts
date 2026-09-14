/**
 * Frame sources for the scroll-scrubbed hero. The component tells the source
 * how far through the clip the scroll is; the source paints the matching
 * frame through `Painter` whenever it is ready — at once for a loaded still,
 * a few milliseconds later for a decoded video frame.
 */

export type Painter = (
  image: CanvasImageSource,
  width: number,
  height: number,
) => void;

export interface FrameSource {
  /** Paint the frame at `progress` (0–1), or the closest one that is ready. */
  show(progress: number): void;
  /** Paint the current frame again — the canvas was resized and cleared. */
  repaint(): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Video track (WebCodecs)
// ---------------------------------------------------------------------------

/** What `scripts/build-hero-video.ts` writes ahead of the samples. */
type TrackHeader = {
  codec: string;
  width: number;
  height: number;
  description: string;
  sizes: number[];
  keys: number[];
};

export const videoTrackSupported = () =>
  typeof window !== "undefined" &&
  typeof window.VideoDecoder === "function" &&
  typeof window.EncodedVideoChunk === "function";

/** Decoder errors tolerated (re-created each time) before giving up. */
const MAX_DECODER_FAILURES = 3;
/**
 * How long a frame may stay inside the decoder before it is flushed out.
 * Most decoders return each frame as soon as it is decoded; some hardware
 * ones hold the last until more input arrives, which would leave the scrub
 * a frame short of where the user stopped.
 */
const STALL_MS = 100;

type Shown = { image: CanvasImageSource; width: number; height: number };

/**
 * All the frames of the clip from one H.264 stream, decoded on demand.
 *
 * Why not `<video>`: seeking an element is asynchronous, coalesced and paced
 * differently by every browser — the first version of this hero scrubbed
 * `currentTime` and was smooth on some devices and a slideshow on others.
 * Why not stills: each still carries the whole picture, so 96 stills of this
 * scene weighed twice what the full 361-frame clip does as video, and the
 * gaps between them still showed as steps.
 *
 * Scrolling forward is plain playback — one small delta decode per frame.
 * Scrolling back starts from the keyframe at or before the target (at most
 * GOP frames away); the frames passed on the way are copied aside, so the
 * following steps back are ready without decoding again.
 */
export class VideoTrackSource implements FrameSource {
  private count = 0;
  private header: TrackHeader | null = null;
  private offsets: number[] = [];
  private keySet = new Set<number>();
  private data = new Uint8Array(0);
  private received = 0;
  private available = 0;

  private decoder: VideoDecoder | null = null;
  private config: VideoDecoderConfig | null = null;
  private failures = 0;
  private flushing = false;
  private stallTimer = 0;

  /** Last sample handed to the decoder; -1 means the next must be a key. */
  private fed = -1;
  /** Last frame the decoder returned. */
  private lastOut = -1;
  /** Samples fed whose frames have not come back yet. */
  private inFlight = 0;
  /** Target of the backward seek in flight, if any. */
  private backTarget = -1;

  private progress = 0;
  private shownIndex = -1;
  private shown: Shown | null = null;
  /** The frame on screen, if it is a decoder frame that must be closed. */
  private shownFrame: VideoFrame | null = null;
  /** Copies of the frames passed on the way to a backward target. */
  private cache = new Map<number, HTMLCanvasElement>();
  private spare: HTMLCanvasElement[] = [];

  /** Whether the first frame has been checked to actually draw. */
  private verified = false;
  private readonly abort = new AbortController();
  private disposed = false;

  constructor(
    private readonly url: string,
    private readonly paint: Painter,
    private readonly onFail: () => void,
  ) {
    void this.load().catch(() => this.fail());
  }

  show(progress: number) {
    this.progress = progress;
    this.pump();
  }

  repaint() {
    if (this.shown)
      this.paint(this.shown.image, this.shown.width, this.shown.height);
  }

  /** The frame the scroll asks for, limited to what has downloaded. */
  private get want() {
    const index = Math.round(this.progress * (this.count - 1));
    return Math.min(Math.max(index, 0), this.available - 1);
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    window.clearTimeout(this.stallTimer);
    this.shownFrame?.close();
    this.shownFrame = null;
    this.shown = null;
    this.cache.clear();
    this.spare = [];
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    this.decoder = null;
  }

  // ---- download ----

  private async load() {
    const response = await fetch(this.url, { signal: this.abort.signal });
    if (!response.ok || !response.body) throw new Error("track unavailable");
    const reader = response.body.getReader();

    // The header is tiny; buffer until it is complete.
    let head = new Uint8Array(0);
    let headerEnd = -1;
    while (headerEnd < 0) {
      const { value, done } = await reader.read();
      if (done) throw new Error("truncated header");
      head = concat(head, value);
      if (head.length >= 4) {
        const length = new DataView(head.buffer).getUint32(0, true);
        if (head.length >= 4 + length) headerEnd = 4 + length;
      }
    }

    const header = JSON.parse(
      new TextDecoder().decode(head.subarray(4, headerEnd)),
    ) as TrackHeader;
    await this.configure(header);

    let offset = 0;
    this.offsets = header.sizes.map((size) => {
      const at = offset;
      offset += size;
      return at;
    });
    this.data = new Uint8Array(offset);
    this.append(head.subarray(headerEnd));

    // Samples become playable as they arrive, in order — the start of the
    // clip, where every visit begins, is ready long before the end is.
    for (;;) {
      const { value, done } = await reader.read();
      if (done || this.disposed) break;
      this.append(value);
    }
  }

  private append(bytes: Uint8Array) {
    const room = this.data.length - this.received;
    if (room <= 0) return;
    const chunk = bytes.length > room ? bytes.subarray(0, room) : bytes;
    this.data.set(chunk, this.received);
    this.received += chunk.length;

    const sizes = this.header?.sizes ?? [];
    const before = this.available;
    while (
      this.available < sizes.length &&
      this.offsets[this.available]! + sizes[this.available]! <= this.received
    )
      this.available++;
    if (this.available !== before) this.pump();
  }

  // ---- decoder ----

  private async configure(header: TrackHeader) {
    const config: VideoDecoderConfig = {
      codec: header.codec,
      codedWidth: header.width,
      codedHeight: header.height,
      description: Uint8Array.from(atob(header.description), (c) =>
        c.charCodeAt(0),
      ),
      optimizeForLatency: true,
    };
    const support = await VideoDecoder.isConfigSupported(config);
    if (!support.supported) throw new Error(`unsupported ${header.codec}`);
    if (this.disposed) return;

    this.header = header;
    this.count = header.sizes.length;
    this.keySet = new Set(header.keys);
    this.config = config;
    this.createDecoder();
  }

  private createDecoder() {
    if (!this.config) return;
    const decoder = new VideoDecoder({
      output: (frame) => this.onOutput(frame),
      error: () => {
        // Hardware decoders can be reclaimed (a backgrounded tab, a GPU
        // reset). Rebuild on the next request; only repeated failures mean
        // this device cannot play the track at all.
        if (this.decoder === decoder) this.decoder = null;
        if (++this.failures > MAX_DECODER_FAILURES) this.fail();
      },
    });
    decoder.configure(this.config);
    this.decoder = decoder;
    this.flushing = false;
    this.fed = -1;
    this.lastOut = -1;
    this.inFlight = 0;
    this.backTarget = -1;
  }

  private keyBefore(index: number) {
    let key = 0;
    for (const k of this.header?.keys ?? []) {
      if (k > index) break;
      key = k;
    }
    return key;
  }

  private feed(from: number, to: number) {
    const decoder = this.decoder;
    const header = this.header;
    if (!decoder || !header) return;
    for (let i = from; i <= to; i++) {
      const start = this.offsets[i]!;
      decoder.decode(
        new EncodedVideoChunk({
          type: this.keySet.has(i) ? "key" : "delta",
          timestamp: i,
          data: this.data.subarray(start, start + header.sizes[i]!),
        }),
      );
      this.inFlight++;
    }
    this.fed = to;
    this.armStallTimer();
  }

  /** Decide what, if anything, the decoder should do to reach `want`. */
  private pump() {
    if (this.disposed || !this.header || this.flushing) return;
    if (!this.decoder) {
      if (this.failures > MAX_DECODER_FAILURES) return;
      this.createDecoder();
    }
    if (this.available === 0) return;

    const target = this.want;
    if (target === this.shownIndex) return;

    const cached = this.cache.get(target);
    if (cached) {
      const backwards = target < this.shownIndex;
      this.present(target, cached, null);
      if (backwards) this.prefetchBack();
      return;
    }

    // Already on its way.
    if (target > this.lastOut && target <= this.fed) return;

    if (target > this.fed && this.fed >= 0) {
      // Ahead of the stream: keep playing forward, unless a keyframe closer
      // to the target makes the frames in between pointless.
      const key = this.keyBefore(target);
      this.feed(key > this.fed + 1 ? key : this.fed + 1, target);
      return;
    }

    // Behind what was decoded (scrolling back), or nothing decoded yet.
    // Seek from the keyframe — one seek in flight at a time, or quick
    // scrolling would queue up decodes the screen no longer wants.
    if (this.inFlight > 0) return;
    this.backTarget = target;
    this.trimCache(this.keyBefore(target), target);
    this.feed(this.keyBefore(target), target);
  }

  private onOutput(frame: VideoFrame) {
    const index = frame.timestamp;
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.lastOut = index;
    if (this.disposed) {
      frame.close();
      return;
    }
    this.armStallTimer();

    const want = this.want;
    if (index === want) {
      this.present(index, frame, frame);
    } else {
      if (this.backTarget >= 0 && index <= this.backTarget)
        // Decoded on the way to a backward target: the frames the user
        // scrolls back to next.
        this.keep(index, frame);
      else if (this.shownIndex < index && index < want)
        // Catching up forward: show the progress rather than wait for the
        // exact frame.
        this.present(index, frame, frame);
      if (this.shownFrame !== frame) frame.close();
    }

    const seekDone = index === this.backTarget;
    if (seekDone) this.backTarget = -1;
    this.pump();
    if (seekDone && this.want < index) this.prefetchBack();
  }

  /**
   * Scrolling back: decode the previous GOP while the user is still in this
   * one. Waiting until the scroll reached it left a GOP-long stall at every
   * keyframe — the whole seek had to finish before the next frame showed.
   */
  private prefetchBack() {
    if (this.inFlight > 0 || this.flushing || !this.decoder) return;
    // One GOP ahead of the user, never more: measured from the cache
    // instead, each prefetch triggered the next and the whole clip piled up
    // in memory.
    const current = this.keyBefore(this.want);
    const end = current - 1;
    if (end < 0 || end >= this.available || this.cache.has(end)) return;
    const start = this.keyBefore(end);
    // Room for it: keep only the GOP the user is in, plus the new one.
    this.trimCache(start, current + this.gop - 1);
    this.backTarget = end;
    this.feed(start, end);
  }

  private get gop() {
    const keys = this.header?.keys ?? [];
    return keys.length > 1 ? keys[1]! - keys[0]! : 1;
  }

  /**
   * Copy a frame aside and hand the decoder its buffer back at once —
   * hardware decoders stall when the page holds on to their frames.
   */
  private keep(index: number, frame: VideoFrame) {
    const canvas = this.spare.pop() ?? document.createElement("canvas");
    if (canvas.width !== frame.displayWidth) canvas.width = frame.displayWidth;
    if (canvas.height !== frame.displayHeight)
      canvas.height = frame.displayHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    context.drawImage(frame, 0, 0);
    const previous = this.cache.get(index);
    if (previous && previous !== canvas && this.shown?.image !== previous)
      this.spare.push(previous);
    this.cache.set(index, canvas);
  }

  /** Drop cached frames outside [from, to]. */
  private trimCache(from: number, to: number) {
    for (const [index, canvas] of this.cache) {
      if (index >= from && index <= to) continue;
      this.cache.delete(index);
      if (this.shown?.image !== canvas) this.spare.push(canvas);
    }
    // The spare pool only saves reallocations; never let it outgrow a GOP.
    this.spare.length = Math.min(this.spare.length, this.gop);
  }

  private present(
    index: number,
    image: HTMLCanvasElement | VideoFrame,
    frame: VideoFrame | null,
  ) {
    const width = frame
      ? frame.displayWidth
      : (image as HTMLCanvasElement).width;
    const height = frame
      ? frame.displayHeight
      : (image as HTMLCanvasElement).height;
    if (frame && !this.verified) {
      this.verified = true;
      if (!drawsVideoFrames(frame)) {
        frame.close();
        this.fail();
        return;
      }
    }
    this.paint(image, width, height);
    if (this.shownFrame && this.shownFrame !== frame) this.shownFrame.close();
    this.shownFrame = frame;
    this.shown = { image, width, height };
    this.shownIndex = index;
  }

  /** Flush a decoder that sits on frames, so the scrub lands where it stopped. */
  private armStallTimer() {
    window.clearTimeout(this.stallTimer);
    if (this.inFlight === 0) return;
    this.stallTimer = window.setTimeout(() => {
      const decoder = this.decoder;
      if (!decoder || this.inFlight === 0 || decoder.state !== "configured")
        return;
      this.flushing = true;
      decoder
        .flush()
        .then(() => {
          if (this.decoder !== decoder) return;
          // After a flush the decoder insists on a keyframe.
          this.flushing = false;
          this.inFlight = 0;
          this.fed = -1;
          this.backTarget = -1;
          this.pump();
        })
        .catch(() => {});
    }, STALL_MS);
  }

  private fail() {
    if (this.disposed) return;
    this.dispose();
    this.onFail();
  }
}

/**
 * Whether this browser can put a decoded frame on a canvas. Decoding and
 * drawing are separate paths, and a broken draw fails silently — the canvas
 * just stays black, over the poster. The clip opens on bright sky, so a probe
 * with no colour at all means the draw did nothing.
 */
function drawsVideoFrames(frame: VideoFrame) {
  const probe = document.createElement("canvas");
  probe.width = 8;
  probe.height = 8;
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return true;
  try {
    context.drawImage(frame, 0, 0, 8, 8);
    const { data } = context.getImageData(0, 0, 8, 8);
    for (let i = 0; i < data.length; i += 4)
      if (data[i] || data[i + 1] || data[i + 2]) return true;
    return false;
  } catch {
    return false;
  }
}

function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

// ---------------------------------------------------------------------------
// Still sequence (fallback)
// ---------------------------------------------------------------------------

/**
 * Stride of each loading pass. The first gets the scrub working on a tenth of
 * the bytes; each following pass halves the gaps everywhere at once.
 */
const LOAD_PASSES = [8, 4, 2, 1] as const;

/**
 * WebP stills, for browsers without WebCodecs (iOS before 16.4, older
 * Firefox). Heavier and coarser than the video track, but works anywhere
 * canvas does.
 */
export class StillSequenceSource implements FrameSource {
  private readonly frames: (HTMLImageElement | null)[];
  private progress = 0;
  private shown: HTMLImageElement | null = null;
  private disposed = false;

  constructor(
    private readonly count: number,
    private readonly url: (index: number) => string,
    private readonly paint: Painter,
  ) {
    this.frames = Array.from({ length: count }, () => null);
    void this.load();
  }

  show(progress: number) {
    this.progress = progress;
    const image = this.pick(Math.round(progress * (this.count - 1)));
    if (!image || image === this.shown) return;
    this.shown = image;
    this.repaint();
  }

  repaint() {
    if (this.shown)
      this.paint(this.shown, this.shown.naturalWidth, this.shown.naturalHeight);
  }

  dispose() {
    this.disposed = true;
  }

  /** Nearest loaded frame, so gaps in the sequence never blank the canvas. */
  private pick(index: number) {
    const all = this.frames;
    if (all[index]) return all[index];
    for (let step = 1; step < this.count; step++) {
      if (all[index - step]) return all[index - step];
      if (all[index + step]) return all[index + step];
    }
    return null;
  }

  private loadOne(index: number) {
    return new Promise<void>((resolve) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => {
        if (!this.disposed) {
          this.frames[index] = img;
          this.show(this.progress);
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = this.url(index);
    });
  }

  private async load() {
    // Halve the stride each pass instead of filling left-to-right, so the
    // whole strip gets steadily denser rather than the tail staying empty.
    const seen = new Set<number>();
    for (const stride of LOAD_PASSES) {
      const batch: number[] = [];
      for (let i = 0; i < this.count; i += stride) {
        if (!seen.has(i)) {
          seen.add(i);
          batch.push(i);
        }
      }
      for (let i = 0; i < batch.length; i += 6) {
        if (this.disposed) return;
        await Promise.all(batch.slice(i, i + 6).map((n) => this.loadOne(n)));
      }
    }
  }
}
