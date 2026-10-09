import { afterEach, describe, expect, it, vi } from "vitest";

import { VideoTrackSource } from "./hero-video-source";
import type { HeroTrack } from "./hero-track-loader";

const track: HeroTrack = {
  codec: "avc1.640029",
  width: 1080,
  height: 1920,
  description: "",
  sizes: Array.from({ length: 36 }, () => 1),
  keys: [0, 12, 24],
  baseUrl: "/track",
};

function decoderHarness() {
  const submitted: number[] = [];
  const live = new Set<FakeFrame>();
  class FakeFrame {
    readonly displayWidth = 1080;
    readonly displayHeight = 1920;
    constructor(readonly timestamp: number) {
      live.add(this);
    }
    close() {
      live.delete(this);
    }
  }
  class FakeChunk {
    readonly timestamp: number;
    constructor(init: EncodedVideoChunkInit) {
      this.timestamp = init.timestamp;
    }
  }
  class FakeDecoder {
    static isConfigSupported = async (config: VideoDecoderConfig) => ({
      supported: true,
      config,
    });
    state = "unconfigured";
    constructor(private readonly callbacks: VideoDecoderInit) {}
    configure() {
      this.state = "configured";
    }
    decode(chunk: EncodedVideoChunk) {
      submitted.push(chunk.timestamp);
      queueMicrotask(() => {
        if (this.state === "configured") {
          // This intentionally minimal double exercises ownership/scheduling,
          // not pixel conversion (which is compared in the real-browser tests).
          this.callbacks.output(
            new FakeFrame(chunk.timestamp) as unknown as VideoFrame,
          );
        }
      });
    }
    async flush() {}
    close() {
      this.state = "closed";
    }
  }
  vi.stubGlobal("VideoFrame", FakeFrame);
  vi.stubGlobal("EncodedVideoChunk", FakeChunk);
  vi.stubGlobal("VideoDecoder", FakeDecoder);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array(12))),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  return { submitted, live };
}

const drain = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("video frame scheduling", () => {
  it("reuses forward look-ahead frames instead of decoding a GOP at every scroll tick", async () => {
    const { submitted, live } = decoderHarness();
    const paint = vi.fn();
    const source = new VideoTrackSource(track, paint, vi.fn());
    try {
      await vi.waitFor(() => expect(paint).toHaveBeenCalled());
      for (let index = 1; index < track.sizes.length; index++) {
        source.show(index / (track.sizes.length - 1));
        await drain();
      }
      expect(submitted).toHaveLength(track.sizes.length);
      expect(new Set(submitted).size).toBe(submitted.length);
      // Only a tiny native look-ahead and the visible frame may retain scarce
      // decoder surfaces. Large reverse caches use independent pixel copies.
      expect(live.size).toBeLessThanOrEqual(3);
    } finally {
      source.dispose();
    }
    expect(live.size).toBe(0);
  });
});
