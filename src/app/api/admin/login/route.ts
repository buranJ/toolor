import { NextRequest, NextResponse } from "next/server";

import {
  adminConfigured,
  adminCookie,
  createAdminSession,
  passwordMatches,
  sameOrigin,
} from "@/features/admin/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  if (!adminConfigured())
    return NextResponse.json({ error: "Админка ещё не настроена" }, { status: 503 });
  const body = await request.json().catch(() => null);
  const candidate =
    body && typeof body === "object" && "password" in body
      ? body.password
      : null;
  if (typeof candidate !== "string" || !passwordMatches(candidate))
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, createAdminSession(), adminCookie.options);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
