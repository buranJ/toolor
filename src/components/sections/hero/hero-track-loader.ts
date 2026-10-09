/** The generated manifest is bundled with the component, with no extra RTT. */
export interface HeroTrack {
  codec: string;
  width: number;
  height: number;
  description: string;
  sizes: readonly number[];
  keys: readonly number[];
  baseUrl: string;
}

/**
 * Compressed frames stay cheap (~5 MB for the whole clip). Only two network
 * requests run at once; the scroll target takes precedence over prefetches.
 * A seek never has to download the unrelated beginning of the video first.
 */
export class HeroTrackLoader {
  private readonly samples = new Map<number, Uint8Array>();
  private readonly loaded = new Set<number>();
  private readonly pending = new Map<number, AbortController>();
  private readonly attempts = new Map<number, number>();
  private target = 0;
  private direction = 1;
  private disposed = false;
  private active = true;
  private lastUrgentAt = -Infinity;
  private rescheduleTimer = 0;

  constructor(
    readonly track: HeroTrack,
    private readonly onReady: () => void,
    private readonly onFail: () => void,
  ) {}

  request(index: number) {
    const target = this.groupAt(index);
    if (target !== this.target)
      this.direction = Math.sign(target - this.target);
    this.target = target;
    this.schedule();
  }

  sample(index: number) {
    return this.samples.get(index);
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.schedule();
    else {
      window.clearTimeout(this.rescheduleTimer);
      this.rescheduleTimer = 0;
      for (const controller of this.pending.values()) controller.abort();
      this.pending.clear();
    }
  }

  /** Nearest complete downloaded group; never feed a delta without its key. */
  nearest(index: number): number {
    if (this.samples.has(index)) return index;
    let nearest = -1;
    let distance = Infinity;
    for (const group of this.loaded) {
      const start = this.track.keys[group]!;
      const end = (this.track.keys[group + 1] ?? this.track.sizes.length) - 1;
      const candidate = Math.min(end, Math.max(start, index));
      if (Math.abs(candidate - index) < distance) {
        nearest = candidate;
        distance = Math.abs(candidate - index);
      }
    }
    return nearest;
  }

  dispose() {
    this.setActive(false);
    this.disposed = true;
    this.samples.clear();
    this.loaded.clear();
  }

  private groupAt(index: number) {
    let group = 0;
    while (
      group + 1 < this.track.keys.length &&
      this.track.keys[group + 1]! <= index
    )
      group++;
    return group;
  }

  private schedule() {
    if (this.disposed || !this.active) return;
    if (!this.loaded.has(this.target)) {
      if (!this.pending.has(this.target)) {
        // A fast wheel/touch gesture can cross a GOP every animation frame.
        // Coalesce those misses so it cannot launch dozens of doomed HTTP
        // requests while the target is still moving.
        const remaining = 100 - (performance.now() - this.lastUrgentAt);
        if (this.pending.size >= 2 && remaining > 0) {
          if (!this.rescheduleTimer)
            this.rescheduleTimer = window.setTimeout(() => {
              this.rescheduleTimer = 0;
              this.schedule();
            }, remaining);
          return;
        }
        // Keep one useful request; replace the furthest speculative download
        // when a cold-cache scroll jumps ahead or changes direction.
        if (this.pending.size >= 2) {
          const furthest = [...this.pending.keys()].sort(
            (a, b) => Math.abs(b - this.target) - Math.abs(a - this.target),
          )[0]!;
          this.pending.get(furthest)!.abort();
          this.pending.delete(furthest);
        }
        this.lastUrgentAt = performance.now();
        this.start(this.target);
      }
      return;
    }

    // A bounded compressed look-ahead, not a full-clip background download.
    // Keep a slot free for an urgent seek. Already visited samples stay cheap
    // and reusable (~5 MB at most), but idle visitors fetch only neighbours.
    if (this.pending.size) return;
    const candidates = [
      this.target + this.direction,
      this.target - this.direction,
      this.target + this.direction * 2,
    ];
    const next = candidates.find(
      (group) =>
        group >= 0 &&
        group < this.track.keys.length &&
        !this.loaded.has(group) &&
        (this.attempts.get(group) ?? 0) < 2,
    );
    if (next !== undefined) this.start(next);
  }

  private start(group: number) {
    const controller = new AbortController();
    this.pending.set(group, controller);
    void this.load(group, controller).finally(() => {
      if (this.pending.get(group) === controller) this.pending.delete(group);
      this.schedule();
    });
  }

  private async load(group: number, controller: AbortController) {
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    try {
      const response = await fetch(
        `${this.track.baseUrl}/g${String(group).padStart(3, "0")}.bin`,
        {
          signal: controller.signal,
          priority: group === this.target ? "high" : "low",
        },
      );
      if (!response.ok) throw new Error("Hero segment unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (this.disposed || controller.signal.aborted) return;
      const start = this.track.keys[group]!;
      const end = this.track.keys[group + 1] ?? this.track.sizes.length;
      const expected = this.track.sizes
        .slice(start, end)
        .reduce((a, b) => a + b, 0);
      if (bytes.length !== expected) throw new Error("Truncated hero segment");
      let offset = 0;
      for (let index = start; index < end; index++) {
        const size = this.track.sizes[index]!;
        this.samples.set(index, bytes.subarray(offset, offset + size));
        offset += size;
      }
      this.loaded.add(group);
      this.onReady();
    } catch {
      if (this.disposed || (controller.signal.aborted && !timedOut)) return;
      const attempts = (this.attempts.get(group) ?? 0) + 1;
      this.attempts.set(group, attempts);
      if (attempts >= 2) {
        // A broken speculative neighbour must not take down a working hero.
        if (group === this.target) {
          this.dispose();
          this.onFail();
        }
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }
}
