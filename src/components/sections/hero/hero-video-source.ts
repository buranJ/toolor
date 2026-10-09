import type { FrameSource, Painter } from "./hero-frame-sources";
import { HeroTrackLoader, type HeroTrack } from "./hero-track-loader";

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
const FORWARD_LOOK_AHEAD = 2;

type Shown = { image: CanvasImageSource; width: number; height: number };
type CachedImage = HTMLCanvasElement | VideoFrame;
const releaseCached = (image: CachedImage) => {
  if (image instanceof VideoFrame) image.close();
  else image.width = image.height = 0;
};

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
  private flushTimer = 0;

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
  /** At most two decoder frames waiting for the next forward animation ticks. */
  private readonly forwardFrames = new Map<number, VideoFrame>();
  /** Copies of the frames passed on the way to a backward target. */
  private cache = new Map<number, CachedImage>();
  private spare: HTMLCanvasElement[] = [];
  private readonly copying = new Map<number, Promise<void>>();
  private copyGeneration = 0;
  private rawCopySupported = true;

  /** Whether the first frame has been checked to actually draw. */
  private verified = false;
  private disposed = false;
  private active = true;
  private idleTimer = 0;
  private backwards = false;

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
    if (progress !== this.progress) this.backwards = progress < this.progress;
    this.progress = progress;
    for (const [index, frame] of this.forwardFrames) {
      if (
        !this.backwards &&
        index >= this.requested &&
        index <= this.requested + FORWARD_LOOK_AHEAD
      )
        continue;
      frame.close();
      this.forwardFrames.delete(index);
    }
    if (!this.active || this.disposed) return;
    if (this.config) this.loader.request(this.requested);
    this.pump();
  }

  repaint() {
    if (this.shown)
      this.paint(this.shown.image, this.shown.width, this.shown.height);
  }

  setActive(active: boolean) {
    if (this.disposed || this.active === active) return;
    this.active = active;
    window.clearTimeout(this.idleTimer);
    this.loader.setActive(active);
    if (active) {
      if (this.config) this.loader.request(this.requested);
      this.pump();
    } else {
      this.idleTimer = window.setTimeout(() => this.clearDecoded(), 1500);
    }
  }

  private clearDecoded() {
    this.copyGeneration++;
    this.copying.clear();
    window.clearTimeout(this.stallTimer);
    window.clearTimeout(this.flushTimer);
    this.shownFrame?.close();
    this.shownFrame = null;
    for (const frame of this.forwardFrames.values()) frame.close();
    this.forwardFrames.clear();
    this.shown = null;
    this.shownIndex = -1;
    for (const image of [...this.cache.values(), ...this.spare])
      releaseCached(image);
    this.cache.clear();
    this.spare = [];
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    this.decoder = null;
    this.flushing = false;
    this.inFlight = 0;
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
    window.clearTimeout(this.idleTimer);
    this.disposed = true;
    this.loader.dispose();
    this.clearDecoded();
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
        this.recoverDecoder(decoder);
      },
    });
    this.decoder = decoder;
    this.flushing = false;
    this.fed = -1;
    this.lastOut = -1;
    this.inFlight = 0;
    this.backTarget = -1;
    try {
      decoder.configure(this.config);
    } catch {
      this.recoverDecoder(decoder);
    }
  }

  private recoverDecoder(decoder: VideoDecoder) {
    if (this.disposed || this.decoder !== decoder) return;
    window.clearTimeout(this.stallTimer);
    window.clearTimeout(this.flushTimer);
    this.decoder = null;
    if (decoder.state !== "closed") decoder.close();
    this.flushing = false;
    this.inFlight = 0;
    this.backTarget = -1;
    if (++this.failures > MAX_DECODER_FAILURES) this.fail();
    else queueMicrotask(() => this.pump());
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
      try {
        decoder.decode(
          new EncodedVideoChunk({
            type: this.keySet.has(i) ? "key" : "delta",
            timestamp: i,
            data,
          }),
        );
      } catch {
        this.recoverDecoder(decoder);
        return;
      }
      this.inFlight++;
    }
    this.fed = to;
    if (this.backTarget >= 0) this.flushDecoder();
    else this.armStallTimer();
  }

  /** Small forward look-ahead keeps hardware pipelines running without a flush
   * at each scroll tick. It changes neither frame resolution nor compression. */
  private ahead(target: number) {
    let end = target;
    while (end < target + FORWARD_LOOK_AHEAD && this.loader.sample(end + 1))
      end++;
    return end;
  }

  private prefetchForward() {
    if (
      this.backwards ||
      this.flushing ||
      !this.decoder ||
      this.fed < 0 ||
      this.inFlight > 3
    )
      return;
    const end = this.ahead(this.want);
    if (end > this.fed) this.feed(this.fed + 1, end);
  }

  /** Decide what, if anything, the decoder should do to reach `want`. */
  private pump() {
    if (this.disposed || !this.active || !this.header) return;
    if (!this.decoder) {
      if (this.failures > MAX_DECODER_FAILURES) return;
      this.createDecoder();
    }
    if (!this.decoder) return;
    const target = this.want;
    if (target < 0) return;
    if (this.backwards) this.presentCached();
    if (target === this.shownIndex) {
      if (this.backwards) this.prefetchBack();
      else this.prefetchForward();
      return;
    }

    const forward = this.forwardFrames.get(target);
    if (forward) {
      this.forwardFrames.delete(target);
      this.present(target, forward, forward);
      if (this.shownFrame !== forward) forward.close();
      this.prefetchForward();
      return;
    }

    const cached = this.cache.get(target);
    if (cached) {
      const backwards = target < this.shownIndex;
      this.present(target, cached, null);
      if (backwards) this.prefetchBack();
      return;
    }
    if (this.copying.has(target)) return;
    // Cached presentation must not wait for a speculative GOP's flush.
    // Blocking here was turning an otherwise warm reverse scrub into bursts.
    if (this.flushing) return;

    // Already on its way.
    if (target > this.lastOut && target <= this.fed) return;

    if (target > this.fed && this.fed >= 0) {
      if (this.inFlight > 3) return;
      // Ahead of the stream: keep playing forward, unless a keyframe closer
      // to the target makes the frames in between pointless.
      const key = this.keyBefore(target);
      this.feed(key > this.fed + 1 ? key : this.fed + 1, this.ahead(target));
      return;
    }

    // Behind what was decoded (scrolling back), or nothing decoded yet.
    // Seek from the keyframe — one seek in flight at a time, or quick
    // scrolling would queue up decodes the screen no longer wants.
    if (this.inFlight > 0) return;
    if (this.backwards) {
      const start = this.keyBefore(target);
      const end = Math.min(this.count - 1, start + this.gop - 1);
      this.backTarget = end;
      this.trimCache(start, end);
      this.feed(start, end);
    } else {
      this.feed(this.keyBefore(target), this.ahead(target));
    }
  }

  private onOutput(frame: VideoFrame) {
    const index = frame.timestamp;
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.lastOut = index;
    if (this.disposed || !this.active) {
      frame.close();
      return;
    }
    this.armStallTimer();

    const want = this.want;
    if (this.backTarget >= 0) {
      this.keep(index, frame);
      this.presentCached();
    } else if (index === want) {
      this.present(index, frame, frame);
    } else if (this.shownIndex < index && index < want)
      // Catching up forward: show progress rather than wait for the exact frame.
      this.present(index, frame, frame);
    else if (
      !this.backwards &&
      index > this.requested &&
      index <= this.requested + FORWARD_LOOK_AHEAD
    ) {
      // These have already been decoded. Dropping them forced a keyframe
      // restart when a slow scroll asked for the very next frame.
      this.forwardFrames.get(index)?.close();
      this.forwardFrames.set(index, frame);
    }
    if (this.shownFrame !== frame && this.forwardFrames.get(index) !== frame)
      frame.close();

    const seekDone = index === this.backTarget;
    if (seekDone) this.backTarget = -1;
    this.pump();
    if (seekDone && this.backwards) this.prefetchBack();
  }

  private presentCached() {
    const index = [...this.cache.keys()]
      .filter(
        (key) =>
          key >= this.requested &&
          (this.shownIndex < 0 || key <= this.shownIndex),
      )
      .sort((a, b) => a - b)[0];
    if (index === undefined || index === this.shownIndex) return;
    this.present(index, this.cache.get(index)!, null);
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
    if (this.cache.has(index) || this.copying.has(index)) return;
    if (
      this.rawCopySupported &&
      frame.format &&
      frame.visibleRect &&
      typeof frame.copyTo === "function"
    ) {
      // Copy the original pixel planes, not RGBA canvases. I420/NV12 take
      // 1.5 bytes/pixel instead of 4; two complete GOPs fit without retaining
      // scarce decoder-owned surfaces. No resize, RGB round-trip or compression.
      try {
        const bytes = new Uint8Array(frame.allocationSize());
        const init: VideoFrameBufferInit = {
          format: frame.format,
          codedWidth: frame.visibleRect.width,
          codedHeight: frame.visibleRect.height,
          displayWidth: frame.displayWidth,
          displayHeight: frame.displayHeight,
          timestamp: frame.timestamp,
          colorSpace: frame.colorSpace,
        };
        const generation = this.copyGeneration;
        const copying = frame
          .copyTo(bytes)
          .then((layout) => {
            if (this.disposed || generation !== this.copyGeneration) return;
            const copy = new VideoFrame(bytes, { ...init, layout });
            const limit = Math.min(
              this.gop * 2,
              Math.max(
                this.gop,
                Math.floor((128 * 1024 * 1024) / bytes.byteLength),
              ),
            );
            if (this.makeRoom(index, limit)) this.cache.set(index, copy);
            else copy.close();
            if (this.backwards && this.active) this.presentCached();
          })
          .catch(() => {
            this.rawCopySupported = false;
          })
          .finally(() => {
            if (this.copying.get(index) === copying) this.copying.delete(index);
          });
        this.copying.set(index, copying);
        return;
      } catch {
        this.rawCopySupported = false;
      }
    }
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
    if (!this.makeRoom(index, limit)) {
      if (canvas) this.spare.push(canvas);
      return;
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

  private makeRoom(index: number, limit: number) {
    if (this.cache.size < limit) return true;
    const rank = (key: number) => {
      const delta = (key - this.requested) * (this.backwards ? -1 : 1);
      return Math.abs(delta) + (delta < 0 ? this.gop : 0);
    };
    const oldest = [...this.cache.keys()]
      .filter((key) => this.cache.get(key) !== this.shown?.image)
      .sort((a, b) => rank(b) - rank(a))[0];
    if (oldest === undefined || rank(index) >= rank(oldest)) return false;
    const discarded = this.cache.get(oldest)!;
    this.cache.delete(oldest);
    if (discarded instanceof VideoFrame) discarded.close();
    else this.spare.push(discarded);
    for (const spare of this.spare.splice(1)) spare.width = spare.height = 0;
    return true;
  }

  /** Drop cached frames outside [from, to]. */
  private trimCache(from: number, to: number) {
    for (const [index, canvas] of this.cache) {
      if (index >= from && index <= to) continue;
      if (this.shown?.image === canvas) continue;
      this.cache.delete(index);
      if (canvas instanceof VideoFrame) canvas.close();
      else this.spare.push(canvas);
    }
    // One spare is enough; explicitly release the other pixel buffers.
    for (const canvas of this.spare.splice(1)) canvas.width = canvas.height = 0;
  }

  private present(
    index: number,
    image: HTMLCanvasElement | VideoFrame,
    frame: VideoFrame | null,
  ) {
    // Decoder output from an obsolete seek must never reverse the visual
    // direction or overshoot the current playhead during a quick gesture.
    if (
      this.shownIndex >= 0 &&
      (this.backwards
        ? index > this.shownIndex || index < this.requested
        : index < this.shownIndex || index > this.requested)
    )
      return;
    const video = image instanceof VideoFrame ? image : null;
    const width = video
      ? video.displayWidth
      : (image as HTMLCanvasElement).width;
    const height = video
      ? video.displayHeight
      : (image as HTMLCanvasElement).height;
    if (frame && !this.verified) {
      this.verified = true;
      if (!drawsVideoFrames(frame)) {
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
      this.flushDecoder();
    }, STALL_MS);
  }

  private flushDecoder() {
    const decoder = this.decoder;
    if (!decoder || this.flushing || decoder.state !== "configured") return;
    window.clearTimeout(this.stallTimer);
    this.flushing = true;
    // A decoder promise can remain pending after a GPU reset. Keep the poster
    // or last good frame visible, and eventually recover instead of freezing.
    this.flushTimer = window.setTimeout(
      () => this.recoverDecoder(decoder),
      3000,
    );
    void decoder
      .flush()
      .then(() => Promise.all([...this.copying.values()]))
      .then(() => {
        if (this.decoder !== decoder) return;
        window.clearTimeout(this.flushTimer);
        // After a flush the decoder insists on a keyframe.
        this.flushing = false;
        this.inFlight = 0;
        this.fed = -1;
        this.backTarget = -1;
        this.pump();
      })
      .catch(() => this.recoverDecoder(decoder));
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
  } finally {
    probe.width = probe.height = 0;
  }
}
