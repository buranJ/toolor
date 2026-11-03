import { NextRequest, NextResponse } from "next/server";

import { authenticated, sameOrigin } from "./auth";

export function adminGate(request: NextRequest, write = false) {
  if (!authenticated(request))
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  if (write && !sameOrigin(request))
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  return null;
}

export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
