/**
 * Builds the hero's scroll-scrubbed video tracks from the 4K masters.
 *
 *   pnpm tsx scripts/build-hero-video.ts
 *
 * Each track is H.264 re-packed into a tiny container the browser can feed to
 * WebCodecs without an MP4 demuxer:
 *
 *   u32 LE header length | JSON header | samples back to back (AVCC)
 *
 * The header carries the codec string, the avcC record the decoder is
 * configured with, and every sample's size and keyframe flag. B-frames are
 * off, so decode order is display order and a seek is "feed the samples from
 * the previous keyframe up to the target". Keyframes every GOP frames bound
 * that seek to GOP decodes.
 *
 * Needs ffmpeg + ffprobe (with libx264) on PATH.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = process.cwd();

/**
 * Tuned by SSIM against the lanczos-scaled master (0.98 on both) and by
 * weight: the whole mobile clip — all 361 source frames — is ~4.6MB, half
 * of what 96 WebP stills of the same scene cost.
 *
 * Mobile stays at 1080x1920, the largest frame H.264 level 4 allows, because
 * that is what every phone decoder handles in hardware. Desktop decoders all
 * do level 5.1, so desktop gets 1440p for retina laptops. The level is pinned:
 * left alone, veryslow's 16 reference frames push x264 to 5.1 / 6.0, which
 * some Android decoders refuse outright.
 */
const TRACKS = [
  {
    name: "mobile",
    source: "media-src/hero-mobile-master.mp4",
    width: 1080,
    height: 1920,
    crf: 28,
    level: "4.1",
  },
  {
    name: "desktop",
    source: "media-src/hero-desktop-master.mp4",
    width: 2560,
    height: 1440,
    crf: 29,
    level: "5.1",
  },
] as const;

/** Keyframe interval: the most frames a backwards seek has to decode. */
const GOP = 12;

const OUT_DIR = resolve(ROOT, "public/media/hero");

type Packet = { pos: number; size: number; key: boolean };

async function encode(
  track: (typeof TRACKS)[number],
  out: string,
): Promise<void> {
  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    resolve(ROOT, track.source),
    "-an",
    "-vf",
    `scale=${track.width}:${track.height}:flags=lanczos`,
    "-c:v",
    "libx264",
    "-preset",
    "veryslow",
    "-profile:v",
    "high",
    "-level",
    track.level,
    "-crf",
    String(track.crf),
    "-pix_fmt",
    "yuv420p",
    // No B-frames: decode order must equal display order.
    "-bf",
    "0",
    "-g",
    String(GOP),
    "-keyint_min",
    String(GOP),
    "-sc_threshold",
    "0",
    out,
  ]);
}

async function packets(file: string): Promise<Packet[]> {
  const { stdout } = await run(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "packet=pos,size,flags",
      "-of",
      "json",
      file,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as {
    packets: { pos: string; size: string; flags: string }[];
  };
  return parsed.packets.map((p) => ({
    pos: Number(p.pos),
    size: Number(p.size),
    key: p.flags.startsWith("K"),
  }));
}

/** The avcC record — the decoder `description` — straight out of the stsd. */
function avcC(mp4: Buffer): Buffer {
  const at = mp4.indexOf("avcC");
  if (at < 4) throw new Error("no avcC box");
  const size = mp4.readUInt32BE(at - 4);
  return mp4.subarray(at + 4, at - 4 + size);
}

const hex = (n: number) => n.toString(16).padStart(2, "0");

async function build(track: (typeof TRACKS)[number], tmp: string) {
  const mp4Path = join(tmp, `${track.name}.mp4`);
  await encode(track, mp4Path);

  const mp4 = await readFile(mp4Path);
  const list = await packets(mp4Path);
  const description = avcC(mp4);
  // avcC: version, profile, profile compatibility, level.
  const codec = `avc1.${hex(description[1]!)}${hex(description[2]!)}${hex(description[3]!)}`;

  const keys = list.flatMap((p, i) => (p.key ? [i] : []));
  if (keys[0] !== 0) throw new Error("first sample is not a keyframe");

  const header = Buffer.from(
    JSON.stringify({
      codec,
      width: track.width,
      height: track.height,
      description: description.toString("base64"),
      sizes: list.map((p) => p.size),
      keys,
    }),
  );
  const length = Buffer.alloc(4);
  length.writeUInt32LE(header.length);
  const samples = list.map((p) => mp4.subarray(p.pos, p.pos + p.size));

  const out = join(OUT_DIR, `hero-${track.name}.bin`);
  await writeFile(out, Buffer.concat([length, header, ...samples]));
  const { size } = await stat(out);
  console.log(
    `${track.name}: ${list.length} frames, ${codec}, ${(size / 1024 / 1024).toFixed(2)}MB → ${out}`,
  );
}

async function main() {
  const tmp = await mkdtemp(join(tmpdir(), "hero-video-"));
  try {
    for (const track of TRACKS) await build(track, tmp);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

main();
