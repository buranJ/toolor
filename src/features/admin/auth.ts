import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

const COOKIE = "toolor-admin-session";
const MAX_AGE = 8 * 60 * 60;

function password() {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length >= 16 ? value : null;
}

function key(value: string) {
  return scryptSync(value, "toolor-admin-session-v1", 32);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", key(secret)).update(payload).digest("base64url");
}

export function adminConfigured() {
  return Boolean(password());
}

export function passwordMatches(candidate: string) {
  const secret = password();
  if (!secret || candidate.length > 256) return false;
  const actual = key(candidate);
  const expected = key(secret);
  return timingSafeEqual(actual, expected);
}

export function createAdminSession() {
  const secret = password();
  if (!secret) throw new Error("Admin password is not configured");
  const payload = `${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function isAdminSession(value: string | undefined) {
  const secret = password();
  if (!secret || !value) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !/^\d{10}$/.test(payload)) return false;
  const expiry = Number(payload);
  const now = Math.floor(Date.now() / 1000);
  if (expiry < now || expiry > now + MAX_AGE) return false;
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function authenticated(request: NextRequest) {
  return isAdminSession(request.cookies.get(COOKIE)?.value);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin;
}

export const adminCookie = {
  name: COOKIE,
  maxAge: MAX_AGE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: MAX_AGE,
  },
};
