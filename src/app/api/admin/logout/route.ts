import { NextRequest, NextResponse } from "next/server";

import { adminCookie, sameOrigin } from "@/features/admin/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, "", {
    ...adminCookie.options,
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
