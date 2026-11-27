// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const storage = vi.hoisted(() => ({
  getDraft: vi.fn<() => Promise<unknown>>(),
  replaceDraft: vi.fn<(value: unknown, etag: string) => Promise<boolean>>(
    async () => true,
  ),
  saveImage: vi.fn(async () => "a".repeat(64)),
  publishDraft: vi.fn<(value: unknown, etag: string) => Promise<void>>(
    async () => undefined,
  ),
}));
const image = vi.hoisted(() => ({
  prepareCatalogImage: vi.fn<(url: string) => Promise<Uint8Array>>(),
}));

vi.mock("@/features/admin/catalog-store", () => ({
  ...storage,
  imageUrlKey: (url: string) => url,
  missingCatalogImage: "missing",
}));
vi.mock("@/features/admin/image-import", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/admin/image-import")>()),
  ...image,
}));
vi.mock("@/features/admin/http", () => ({
  adminGate: () => null,
  privateJson: (value: unknown, status = 200) =>
    Response.json(value, { status }),
}));

import { MissingCatalogImageError } from "@/features/admin/image-import";
import { POST as prepare } from "./prepare/route";
import { POST as publish } from "./publish/route";

function request(path: string) {
  return new NextRequest(`https://toolor.store/api/admin/catalog/${path}`, {
    method: "POST",
    headers: { origin: "https://toolor.store" },
  });
}

afterEach(() => vi.clearAllMocks());

describe("catalog photo preparation", () => {
  it("counts a missing photo and publishes the other photos", async () => {
    const missingUrl = "https://i.postimg.cc/missing.jpg";
    const goodUrl = "https://i.postimg.cc/good.jpg";
    storage.getDraft.mockResolvedValueOnce({
      etag: "v1",
      draft: { imageUrls: [missingUrl, goodUrl], prepared: {} },
    });
    image.prepareCatalogImage.mockImplementation(async (url) => {
      if (url === missingUrl) throw new MissingCatalogImageError();
      return new Uint8Array([1, 2, 3]);
    });

    const preparation = await prepare(request("prepare"));
    expect(preparation.status).toBe(200);
    expect(await preparation.json()).toMatchObject({
      done: true,
      prepared: 2,
      skipped: 1,
    });
    const prepared = storage.replaceDraft.mock.calls[0]?.[0];
    expect(prepared).toMatchObject({
      prepared: { [missingUrl]: "missing", [goodUrl]: "a".repeat(64) },
    });

    storage.getDraft.mockResolvedValueOnce({
      etag: "v2",
      draft: {
        id: "draft",
        imageUrls: [missingUrl, goodUrl],
        prepared: { [missingUrl]: "missing", [goodUrl]: "a".repeat(64) },
        catalog: {
          products: [{ images: [{ url: missingUrl }, { url: goodUrl }] }],
        },
      },
    });
    const publication = await publish(request("publish"));
    expect(publication.status).toBe(200);
    const published = storage.publishDraft.mock.calls[0]?.[0];
    expect(published).toMatchObject({
      catalog: {
        products: [
          { images: [{ url: `/api/catalog-image/${"a".repeat(64)}` }] },
        ],
      },
    });
  });
});
