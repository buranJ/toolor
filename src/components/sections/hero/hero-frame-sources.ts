import { HeroTrackLoader, type HeroTrack } from "./hero-track-loader";

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
const STALL_MS = 32;

type Shown = { image: CanvasImageSource; width: number; height: number };

/**
 * All the original H.264 frames, downloaded by GOP and decoded on demand.
 *
 * Why not `<video>`: seeking an element is asynchronous, coalesced and paced
 * differently by every browser — the first version of this hero scrubbed
 * `currentTime` and was smooth on some devices and a slideshow on others.
 * Why not stills: each still carries the whole picture, so 96 stills of this
 * scene weighed twice what the full clip does as video, and the
 * gaps between them still showed as steps.
 *
 * Scrolling forward is plain playback — one small delta decode per frame.
 * Scrolling back starts from the keyframe at or before the target (at most
 * GOP frames away); the frames passed on the way are copied aside, so the
 * following steps back are ready without decoding again.
 */
export class VideoTrackSource implements FrameSource {
  private count = 0;
  private header: HeroTrack | null = null;
  private keySet = new Set<number>();
  private readonly loader: HeroTrackLoader;

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
  private disposed = false;

  constructor(
    track: HeroTrack,
    private readonly paint: Painter,
    private readonly onFail: () => void,
  ) {
    this.loader = new HeroTrackLoader(
      track,
      () => this.pump(),
      () => this.fail(),
    );
    void this.configure(track)
      .then(() => {
        if (this.disposed) return;
        this.loader.request(this.requested);
      })
      .catch(() => this.fail());
  }

  show(progress: number) {
    this.progress = progress;
    if (this.config) this.loader.request(this.requested);
    this.pump();
  }

  repaint() {
    if (this.shown)
      this.paint(this.shown.image, this.shown.width, this.shown.height);
  }

  private get requested() {
    return Math.min(
      this.count - 1,
      Math.max(0, Math.round(this.progress * (this.count - 1))),
    );
  }

  /** Closest complete group while the requested one is in flight. */
  private get want() {
    return this.loader.nearest(this.requested);
  }

  dispose() {
    this.disposed = true;
    this.loader.dispose();
    window.clearTimeout(this.stallTimer);
    this.shownFrame?.close();
    this.shownFrame = null;
    this.shown = null;
    for (const canvas of [...this.cache.values(), ...this.spare])
      canvas.width = canvas.height = 0;
    this.cache.clear();
    this.spare = [];
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    this.decoder = null;
  }

  // ---- decoder ----

  private async configure(header: HeroTrack) {
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
      output: (frame) => {
        if (this.decoder === decoder) this.onOutput(frame);
        else frame.close();
      },
      error: () => {
        // Hardware decoders can be reclaimed (a backgrounded tab, a GPU
        // reset). Rebuild on the next request; only repeated failures mean
        // this device cannot play the track at all.
        if (this.disposed || this.decoder !== decoder) return;
        this.decoder = null;
        if (++this.failures > MAX_DECODER_FAILURES) this.fail();
        else queueMicrotask(() => this.pump());
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
      const data = this.loader.sample(i);
      if (!data) return;
      decoder.decode(
        new EncodedVideoChunk({
          type: this.keySet.has(i) ? "key" : "delta",
          timestamp: i,
          data,
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
    const target = this.want;
    if (target < 0) return;
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
      if (this.inFlight > 0) return;
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
    if (end < 0 || !this.loader.sample(end) || this.cache.has(end)) return;
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
    if (this.cache.has(index)) return;
    // Retain at least one complete GOP: smaller caches repeatedly decode the
    // same group in Safari on reverse scroll. Bound the rest by pixels, and
    // reuse canvases instead of allocating them on each decoder callback.
    const limit = Math.min(
      this.gop * 2,
      Math.max(
        this.gop,
        Math.floor(
          (128 * 1024 * 1024) / (frame.displayWidth * frame.displayHeight * 4),
        ),
      ),
    );
    let canvas = this.spare.pop();
    if (this.cache.size >= limit) {
      const oldest = [...this.cache.keys()].find(
        (key) => this.cache.get(key) !== this.shown?.image,
      );
      if (oldest === undefined) return;
      const discarded = this.cache.get(oldest)!;
      this.cache.delete(oldest);
      if (canvas) discarded.width = discarded.height = 0;
      else canvas = discarded;
    }
    canvas ??= document.createElement("canvas");
    if (canvas.width !== frame.displayWidth) canvas.width = frame.displayWidth;
    if (canvas.height !== frame.displayHeight)
      canvas.height = frame.displayHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    context.drawImage(frame, 0, 0);
    this.cache.set(index, canvas);
  }

  /** Drop cached frames outside [from, to]. */
  private trimCache(from: number, to: number) {
    for (const [index, canvas] of this.cache) {
      if (index >= from && index <= to) continue;
      this.cache.delete(index);
      if (this.shown?.image !== canvas) this.spare.push(canvas);
    }
    // One spare is enough; explicitly release the other pixel buffers.
    for (const canvas of this.spare.splice(1)) canvas.width = canvas.height = 0;
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

// ---------------------------------------------------------------------------
// Still sequence (fallback)
// ---------------------------------------------------------------------------

/**
 * WebP stills when video decoding is unavailable. Keep only the current
 * neighbourhood decoded; retaining all 96 full-size images costs >1 GB.
 * Requests follow the scroll, including on the first uncached visit.
 */
export class StillSequenceSource implements FrameSource {
  private readonly frames = new Map<number, HTMLImageElement>();
  private readonly pending = new Map<number, AbortController>();
  private readonly failed = new Set<number>();
  private progress = 0;
  private direction = 1;
  private shown: HTMLImageElement | null = null;
  private disposed = false;

  constructor(
    private readonly count: number,
    private readonly url: (index: number) => string,
    private readonly paint: Painter,
  ) {
    this.schedule();
  }

  show(progress: number) {
    if (progress !== this.progress)
      this.direction = Math.sign(progress - this.progress);
    this.progress = progress;
    const image = this.pick(this.target);
    if (image && image !== this.shown) {
      this.shown = image;
      this.repaint();
    }
    this.schedule();
  }

  repaint() {
    if (this.shown)
      this.paint(this.shown, this.shown.naturalWidth, this.shown.naturalHeight);
  }

  dispose() {
    this.disposed = true;
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear();
    for (const image of this.frames.values()) image.removeAttribute("src");
    this.frames.clear();
    this.shown = null;
  }

  private get target() {
    return Math.min(
      this.count - 1,
      Math.max(0, Math.round(this.progress * (this.count - 1))),
    );
  }

  private pick(index: number) {
    const nearest = [...this.frames.keys()].sort(
      (a, b) => Math.abs(a - index) - Math.abs(b - index),
    )[0];
    return nearest === undefined ? null : this.frames.get(nearest)!;
  }

  private schedule() {
    if (this.disposed) return;
    const candidates = [
      this.target,
      this.target + this.direction,
      this.target - this.direction,
    ];
    for (const index of candidates) {
      if (
        index < 0 ||
        index >= this.count ||
        this.frames.has(index) ||
        this.pending.has(index) ||
        this.failed.has(index)
      )
        continue;
      if (this.pending.size >= 2) {
        if (index !== this.target) break;
        const furthest = [...this.pending.keys()].sort(
          (a, b) => Math.abs(b - index) - Math.abs(a - index),
        )[0]!;
        this.pending.get(furthest)!.abort();
        this.pending.delete(furthest);
      }
      const controller = new AbortController();
      this.pending.set(index, controller);
      void this.loadOne(index, controller).finally(() => {
        if (this.pending.get(index) === controller) this.pending.delete(index);
        this.schedule();
      });
      if (!this.frames.has(this.target) && !this.failed.has(this.target)) break;
    }
  }

  private async loadOne(index: number, controller: AbortController) {
    let objectUrl: string | undefined;
    try {
      const response = await fetch(this.url(index), {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Hero still unavailable");
      const blob = await response.blob();
      if (this.disposed || controller.signal.aborted) return;
      const image = new window.Image();
      image.decoding = "async";
      objectUrl = URL.createObjectURL(blob);
      image.src = objectUrl;
      await image.decode();
      if (this.disposed || controller.signal.aborted) return;
      this.frames.set(index, image);
      this.show(this.progress);
      // Three frames at native quality, plus at most two in-flight requests.
      const ordered = [...this.frames.keys()].sort(
        (a, b) => Math.abs(a - this.target) - Math.abs(b - this.target),
      );
      for (const old of ordered.slice(3)) {
        const discarded = this.frames.get(old)!;
        if (discarded === this.shown) continue;
        discarded.removeAttribute("src");
        this.frames.delete(old);
      }
    } catch {
      if (!this.disposed && !controller.signal.aborted) this.failed.add(index);
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }
}
