import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const GENERATED_JSON = resolve(
  process.cwd(),
  "src/data/toolor-products.generated.json",
);
const OUT_DIR = resolve(process.cwd(), "public/media/products");
const PUBLIC_PREFIX = "/media/products";

/**
 * Suppliers whose originals are camera-resolution files. i.postimg.cc already
 * serves 44-109KB images and is left alone; s3.m-market.kg was serving
 * untouched masters up to 20MB each.
 */
const HEAVY_HOSTS = new Set(["s3.m-market.kg"]);

/** Long edge of the stored copy. Above this nothing on the site can show it. */
const MAX_EDGE = 1600;
/**
 * WebP quality. Measured against the resized source across the catalogue at
 * 44-47dB PSNR — visually indistinguishable, at roughly 1/100th the bytes.
 */
const QUALITY = 88;
/** Parallel downloads. Higher just saturates the supplier and times out. */
const CONCURRENCY = 6;

type Generated = {
  products: { images: { url: string }[] }[];
};

const nameFor = (url: string) =>
  `${createHash("sha1").update(url).digest("hex").slice(0, 16)}.webp`;

async function convert(url: string, outPath: string, tmp: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  await writeFile(tmp, Buffer.from(await response.arrayBuffer()));

  const png = `${tmp}.png`;
  // Downscale only — `min(MAX_EDGE, iw)` leaves smaller sources untouched.
  await run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    tmp,
    "-vf",
    `scale='min(${MAX_EDGE},iw)':-2:flags=lanczos`,
    png,
  ]);
  await run("cwebp", [
    "-quiet",
    "-q",
    String(QUALITY),
    "-m",
    "6",
    png,
    "-o",
    outPath,
  ]);
  await rm(tmp, { force: true });
  await rm(png, { force: true });
}

async function main() {
  const raw = await readFile(GENERATED_JSON, "utf8");
  const data = JSON.parse(raw) as Generated;
  await mkdir(OUT_DIR, { recursive: true });

  const targets = new Map<string, string>();
  for (const product of data.products) {
    for (const image of product.images) {
      let host: string;
      try {
        host = new URL(image.url).host;
      } catch {
        continue;
      }
      if (HEAVY_HOSTS.has(host)) targets.set(image.url, nameFor(image.url));
    }
  }

  console.log(`к обработке: ${targets.size} изображений`);
  const entries = [...targets.entries()];
  let done = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(
      entries.slice(i, i + CONCURRENCY).map(async ([url, name]) => {
        const out = resolve(OUT_DIR, name);
        if (existsSync(out)) {
          skipped += 1;
          return;
        }
        try {
          await convert(url, out, resolve(OUT_DIR, `${name}.tmp`));
          done += 1;
        } catch (error) {
          failed.push(`${url}: ${String(error).slice(0, 80)}`);
        }
      }),
    );
    process.stdout.write(`\r  готово ${done + skipped}/${entries.length}`);
  }
  process.stdout.write("\n");

  if (failed.length) {
    console.error(`не удалось: ${failed.length}`);
    for (const f of failed.slice(0, 5)) console.error("  " + f);
    throw new Error("часть изображений не обработана — JSON не переписан");
  }

  let rewritten = raw;
  for (const [url, name] of targets) {
    rewritten = rewritten.split(url).join(`${PUBLIC_PREFIX}/${name}`);
  }
  await writeFile(GENERATED_JSON, rewritten);
  console.log(
    `пережато ${done}, взято из кэша ${skipped}, ссылок переписано ${targets.size}`,
  );
}

main();
