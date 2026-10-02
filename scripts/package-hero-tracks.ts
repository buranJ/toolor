/**
 * Split the existing encodes at keyframes, without re-encoding a single byte.
 * Each immutable file can be fetched independently when the scroll needs it.
 * Run after hero:build, or on its own with `pnpm hero:package`.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Header = {
  codec: string;
  width: number;
  height: number;
  description: string;
  sizes: number[];
  keys: number[];
};

async function packageTrack(mode: "mobile" | "desktop") {
  const original = await readFile(`public/media/hero/hero-${mode}.bin`);
  const headerEnd = 4 + original.readUInt32LE(0);
  const header = JSON.parse(
    original.subarray(4, headerEnd).toString(),
  ) as Header;
  if (header.keys[0] !== 0 || header.sizes.some((size) => size <= 0))
    throw new Error(`Invalid ${mode} track`);
  const offsets = [headerEnd];
  for (const size of header.sizes) offsets.push(offsets.at(-1)! + size);
  if (offsets.at(-1) !== original.length)
    throw new Error(`Truncated ${mode} track`);

  const hash = createHash("sha256").update(original).digest("hex").slice(0, 16);
  const baseUrl = `/media/hero/tracks/${mode}-${hash}`;
  const directory = resolve(`public${baseUrl}`);
  await mkdir(directory, { recursive: true });
  const pieces: Buffer[] = [];
  for (const [group, start] of header.keys.entries()) {
    const end = header.keys[group + 1] ?? header.sizes.length;
    const bytes = original.subarray(offsets[start], offsets[end]);
    pieces.push(bytes);
    await writeFile(
      `${directory}/g${String(group).padStart(3, "0")}.bin`,
      bytes,
    );
  }
  if (!Buffer.concat(pieces).equals(original.subarray(headerEnd)))
    throw new Error(`Packaging changed ${mode} video bytes`);
  console.log(`${mode}: ${pieces.length} segments, byte-for-byte identical`);
  return { ...header, baseUrl };
}

async function main() {
  const mobile = await packageTrack("mobile");
  const desktop = await packageTrack("desktop");
  await writeFile(
    "src/data/hero-tracks.json",
    `${JSON.stringify({ mobile, desktop }, null, 2)}\n`,
  );
}

void main();
