import { NextRequest } from "next/server";

import { getImage } from "@/features/admin/catalog-store";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bytes = await getImage(id);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
