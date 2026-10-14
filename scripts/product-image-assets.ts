import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const HOSTS = new Set([
  "api.coolgroupteam.com",
  "i.postimg.cc",
  "s3.m-market.kg",
]);
const MAX_BYTES = 32 * 1024 * 1024;
const CONVERSION = "webp-q92-edge2400-v1";

export interface LocalImageAsset {
  path: string;
  bytes: number;
}

function validateUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !HOSTS.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new Error("Image host is not allowed");
  }
  return url;
}

async function download(value: string): Promise<Buffer> {
  let url = validateUrl(value);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Image redirect has no location");
      url = validateUrl(new URL(location, url).href);
      continue;
    }
    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("image/")
    ) {
      await response.body?.cancel();
      throw new Error(`Image response HTTP ${response.status}`);
    }
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error("Image exceeds download size limit");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Image response has no body");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        length += chunk.byteLength;
        if (length > MAX_BYTES)
          throw new Error("Image exceeds download size limit");
        chunks.push(chunk);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Too many image redirects");
}

async function isValidWebp(path: string): Promise<boolean> {
  try {
    const bytes = await readFile(path);
    return (
      bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  } catch {
    return false;
  }
}

/** Signed supplier URLs stay in the private workbook, never the storefront or logs. */
export async function localizeCatalogImages(
  urls: string[],
): Promise<Map<string, LocalImageAsset>> {
  const outDir = resolve(process.cwd(), "public/media/products");
  const temporary = await mkdtemp(resolve(tmpdir(), "toolor-product-images-"));
  const assets = new Map<string, LocalImageAsset>();
  const entries = [...new Set(urls)];
  const failures: string[] = [];
  await mkdir(outDir, { recursive: true });
  let cursor = 0;
  let completed = 0;
  let sourceBytes = 0;
  let reused = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(4, entries.length) }, async () => {
        while (cursor < entries.length) {
          const url = entries[cursor++];
          if (!url) continue;
          const id = createHash("sha256")
            .update(`${CONVERSION}\0${url}`)
            .digest("hex")
            .slice(0, 24);
          const destination = resolve(outDir, `${id}.webp`);
          try {
            validateUrl(url);
            if (!(await isValidWebp(destination))) {
              const original = resolve(temporary, `${id}.original`);
              const png = resolve(temporary, `${id}.png`);
              const converted = resolve(temporary, `${id}.webp`);
              const bytes = await download(url);
              sourceBytes += bytes.length;
              await writeFile(original, bytes);
              // Autorotate, preserve aspect ratio, never upscale. Large masters
              // retain a high-quality 2400px copy; Next serves responsive sizes.
              await run("ffmpeg", [
                "-y",
                "-loglevel",
                "error",
                "-threads",
                "1",
                "-filter_threads",
                "1",
                "-i",
                original,
                "-vf",
                "scale=w='min(iw,2400)':h='min(ih,2400)':force_original_aspect_ratio=decrease:flags=lanczos",
                "-frames:v",
                "1",
                png,
              ]);
              await run("cwebp", [
                "-quiet",
                "-q",
                "92",
                "-m",
                "6",
                png,
                "-o",
                converted,
              ]);
              if (!(await isValidWebp(converted)))
                throw new Error("Invalid converted image");
              await rename(converted, destination);
              await rm(original);
              await rm(png);
            } else {
              reused++;
            }
            assets.set(url, {
              path: `/media/products/${id}.webp`,
              bytes: (await stat(destination)).size,
            });
          } catch {
            // Do not log query strings (supplier signatures) or decoder commands.
            failures.push(id);
          }
          completed++;
          if (completed % 20 === 0 || completed === entries.length)
            console.log(
              `Images: ${completed}/${entries.length}; failed: ${failures.length}`,
            );
        }
      }),
    );
    if (failures.length)
      throw new Error(
        `${failures.length} images could not be localized (${failures.slice(0, 5).join(", ")}); catalog was not replaced.`,
      );
    console.log(
      JSON.stringify({
        images: assets.size,
        sourceBytes,
        optimizedBytes: [...assets.values()].reduce(
          (sum, asset) => sum + asset.bytes,
          0,
        ),
        reused,
      }),
    );
    return assets;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
