import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import tracks from "@/data/hero-tracks.json";

describe("lossless packaging of the published hero encodes", () => {
  for (const mode of ["mobile", "desktop"] as const) {
    it(`${mode}: every video sample and decoder setting matches the original`, () => {
      const original = readFileSync(`public/media/hero/hero-${mode}.bin`);
      const end = 4 + original.readUInt32LE(0);
      const header: unknown = JSON.parse(original.subarray(4, end).toString());
      const { baseUrl, ...manifest } = tracks[mode];
      expect(manifest).toEqual(header);
      const hash = createHash("sha256")
        .update(original)
        .digest("hex")
        .slice(0, 16);
      expect(baseUrl).toBe(`/media/hero/tracks/${mode}-${hash}`);
      const samples = Buffer.concat(
        manifest.keys.map((_, group) =>
          readFileSync(
            resolve(`public${baseUrl}/g${String(group).padStart(3, "0")}.bin`),
          ),
        ),
      );
      expect(samples.equals(original.subarray(end))).toBe(true);
    });
  }
});
