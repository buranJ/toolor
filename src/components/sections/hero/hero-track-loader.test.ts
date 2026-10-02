import { afterEach, describe, expect, it, vi } from "vitest";

import { HeroTrackLoader, type HeroTrack } from "./hero-track-loader";

const track: HeroTrack = {
  codec: "avc1.640029",
  width: 1080,
  height: 1920,
  description: "",
  sizes: [2, 1, 2, 1, 2, 1, 2, 1],
  keys: [0, 2, 4, 6],
  baseUrl: "/media/hero/tracks/test-hash",
};

function network() {
  const requests: {
    url: string;
    signal: AbortSignal;
    resolve: (response: Response) => void;
  }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, options: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const signal = options.signal!;
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
          requests.push({ url, signal, resolve });
        }),
    ),
  );
  return requests;
}

async function complete(
  request: ReturnType<typeof network>[number],
  bytes = [1, 2, 3],
) {
  request.resolve(new Response(Uint8Array.from(bytes)));
  // Drain arrayBuffer(), the ready callback, and the scheduler's finally.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("hero loading over a cold network", () => {
  it("requests the end directly without downloading the beginning", async () => {
    const requests = network();
    const ready = vi.fn();
    const loader = new HeroTrackLoader(track, ready, vi.fn());
    loader.request(7);
    expect(requests[0]!.url).toMatch(/g003\.bin$/);
    expect(requests).toHaveLength(1);
    await complete(requests[0]!);
    expect(loader.sample(6)).toEqual(Uint8Array.from([1, 2]));
    expect(loader.sample(7)).toEqual(Uint8Array.from([3]));
    expect(loader.nearest(7)).toBe(7);
    expect(loader.sample(0)).toBeUndefined();
    expect(ready).toHaveBeenCalledOnce();
    loader.dispose();
  });

  it("gives a cold seek a slot and aborts obsolete requests", async () => {
    const requests = network();
    const loader = new HeroTrackLoader(track, vi.fn(), vi.fn());
    loader.request(0);
    loader.request(2);
    loader.request(7);
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(requests[2]!.url).toMatch(/g003\.bin$/);
    expect(requests.filter((r) => !r.signal.aborted)).toHaveLength(2);
    await complete(requests[2]!);
    expect(loader.nearest(7)).toBe(7);
    loader.dispose();
    expect(requests.every((r) => r.signal.aborted || r === requests[2])).toBe(
      true,
    );
  });

  it("retries a truncated segment then falls back, instead of hanging", async () => {
    const requests = network();
    const fail = vi.fn();
    const loader = new HeroTrackLoader(track, vi.fn(), fail);
    loader.request(0);
    await complete(requests[0]!, [1]);
    expect(requests).toHaveLength(2);
    await complete(requests[1]!, [1]);
    expect(fail).toHaveBeenCalledOnce();
    expect(loader.sample(0)).toBeUndefined();
    expect(requests).toHaveLength(2);
  });

  it("ignores late responses after navigation or a breakpoint change", async () => {
    const requests = network();
    const ready = vi.fn();
    const fail = vi.fn();
    const loader = new HeroTrackLoader(track, ready, fail);
    loader.request(0);
    loader.dispose();
    await complete(requests[0]!);
    expect(ready).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
    expect(requests).toHaveLength(1);
  });

  it("times out a stalled connection and reaches fallback after one retry", async () => {
    vi.useFakeTimers();
    const requests = network();
    const fail = vi.fn();
    const loader = new HeroTrackLoader(track, vi.fn(), fail);
    loader.request(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.signal.aborted)).toBe(true);
    expect(fail).toHaveBeenCalledOnce();
    loader.dispose();
  });
});
