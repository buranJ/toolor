import sharp from "sharp";

const HOSTS = new Set([
  "api.coolgroupteam.com",
  "i.postimg.cc",
  "s3.m-market.kg",
]);
const MAX_BYTES = 32 * 1024 * 1024;

export function validateImageUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !HOSTS.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new Error("В таблице есть ссылка на фото с неподдерживаемого сайта.");
  }
  return url;
}

export async function prepareCatalogImage(value: string) {
  let url = validateImageUrl(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Ссылка на фото перенаправляет без адреса.");
      url = validateImageUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      await response.body?.cancel();
      throw new Error(`Фото недоступно: HTTP ${response.status}.`);
    }
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error("Фото слишком большое.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Фото не удалось прочитать.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      total += chunk.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Фото слишком большое.");
      }
      chunks.push(chunk);
    }
    const original = Buffer.concat(chunks);
    return new Uint8Array(
      await sharp(original)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 92, effort: 4 })
        .toBuffer(),
    );
  }
  throw new Error("Слишком много перенаправлений фото.");
}
