// @vitest-environment node
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const storage = vi.hoisted(() => ({
  saveImage: vi.fn<(bytes: Uint8Array) => Promise<string>>(
    async () => "a".repeat(64),
  ),
  updateCategoryMosaicImage: vi.fn<
    (key: string, id: string | null) => Promise<boolean>
  >(async () => true),
}));
const gate = vi.hoisted(() => vi.fn<() => Response | null>(() => null));

vi.mock("@/features/admin/catalog-store", async () => {
  const { z } = await import("zod");
  return {
    categoryMosaicImagesSchema: z.object({
      hats: z.string().optional(),
      sets: z.string().optional(),
      jackets: z.string().optional(),
      shirts: z.string().optional(),
      tshirts: z.string().optional(),
      trousers: z.string().optional(),
    }),
    ...storage,
  };
});
vi.mock("@/features/admin/http", () => ({
  adminGate: gate,
  privateJson: (value: unknown, status = 200) =>
    Response.json(value, { status }),
}));

import { DELETE, POST } from "./route";

function imageRequest(file: File, key = "hats") {
  const form = new FormData();
  form.set("key", key);
  form.set("file", file);
  return new NextRequest("https://toolor.store/api/admin/category-images", {
    method: "POST",
    body: form,
    headers: { origin: "https://toolor.store" },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  gate.mockReturnValue(null);
});

describe("admin category photos", () => {
  it("rejects unauthenticated and unsupported uploads before storage", async () => {
    gate.mockReturnValueOnce(
      Response.json({ error: "Требуется вход" }, { status: 401 }),
    );
    const blocked = await POST(imageRequest(new File(["x"], "photo.jpg")));
    expect(blocked.status).toBe(401);
    expect(storage.saveImage).not.toHaveBeenCalled();

    const unsupported = await POST(
      imageRequest(
        new File(["<svg/>"], "photo.svg", { type: "image/svg+xml" }),
      ),
    );
    expect(unsupported.status).toBe(400);
    expect(storage.saveImage).not.toHaveBeenCalled();
  });

  it("stores an optimized WebP and changes only the chosen tile", async () => {
    const png = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#aabbcc" },
    })
      .png()
      .toBuffer();
    const pngBytes = new Uint8Array(png.byteLength);
    pngBytes.set(png);
    const response = await POST(
      imageRequest(
        new File([pngBytes], "photo.png", { type: "image/png" }),
        "jackets",
      ),
    );
    expect(response.status).toBe(200);
    expect(storage.saveImage).toHaveBeenCalledOnce();
    const saved = storage.saveImage.mock.calls[0][0];
    expect((await sharp(saved).metadata()).format).toBe("webp");
    expect(storage.updateCategoryMosaicImage).toHaveBeenCalledWith(
      "jackets",
      "a".repeat(64),
    );
  });

  it("restores the catalog photo for one tile", async () => {
    const response = await DELETE(
      new NextRequest("https://toolor.store/api/admin/category-images", {
        method: "DELETE",
        headers: {
          origin: "https://toolor.store",
          "content-type": "application/json",
        },
        body: JSON.stringify({ key: "shirts" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(storage.updateCategoryMosaicImage).toHaveBeenCalledWith(
      "shirts",
      null,
    );
  });
});
