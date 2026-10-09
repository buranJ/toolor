export { VideoTrackSource, videoTrackSupported } from "./hero-video-source";

export type Painter = (
  image: CanvasImageSource,
  width: number,
  height: number,
) => void;

export interface FrameSource {
  show(progress: number): void;
  repaint(): void;
  setActive(active: boolean): void;
  dispose(): void;
}

/** Full-resolution still fallback, bounded to the current neighbourhood. */
export class StillSequenceSource implements FrameSource {
  private readonly frames = new Map<number, HTMLImageElement>();
  private readonly pending = new Map<number, AbortController>();
  private readonly failed = new Map<number, number>();
  private progress = 0;
  private direction = 1;
  private shown: HTMLImageElement | null = null;
  private active = true;
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
    if (!this.active || this.disposed) return;
    const nearest = [...this.frames.keys()].sort(
      (a, b) => Math.abs(a - this.target) - Math.abs(b - this.target),
    )[0];
    const image = nearest === undefined ? null : this.frames.get(nearest)!;
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

  setActive(active: boolean) {
    this.active = active;
    if (active) this.show(this.progress);
    else {
      for (const controller of this.pending.values()) controller.abort();
      this.pending.clear();
    }
  }

  dispose() {
    this.disposed = true;
    this.setActive(false);
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

  private schedule() {
    if (this.disposed || !this.active) return;
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
        (this.failed.get(index) ?? 0) >= 2
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
      if (
        !this.frames.has(this.target) &&
        (this.failed.get(this.target) ?? 0) < 2
      )
        break;
    }
  }

  private async loadOne(index: number, controller: AbortController) {
    let objectUrl: string | undefined;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);
    try {
      const response = await fetch(this.url(index), {
        signal: controller.signal,
        priority: index === this.target ? "high" : "low",
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
      if (!this.disposed && (!controller.signal.aborted || timedOut))
        this.failed.set(index, (this.failed.get(index) ?? 0) + 1);
    } finally {
      window.clearTimeout(timeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }
}
