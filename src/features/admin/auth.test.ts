// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import {
  adminConfigured,
  createAdminSession,
  isAdminSession,
  passwordMatches,
} from "./auth";

const previous = process.env.ADMIN_PASSWORD;
afterEach(() => {
  if (previous === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = previous;
});

describe("admin authentication", () => {
  it("fails closed without a sufficiently long server-side secret", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(adminConfigured()).toBe(false);
    expect(passwordMatches("anything")).toBe(false);
    process.env.ADMIN_PASSWORD = "short";
    expect(adminConfigured()).toBe(false);
  });

  it("accepts the password and rejects a forged or changed session", () => {
    process.env.ADMIN_PASSWORD = "correct-horse-battery-staple-2026";
    expect(passwordMatches("correct-horse-battery-staple-2026")).toBe(true);
    expect(passwordMatches("not-the-password")).toBe(false);
    const session = createAdminSession();
    expect(isAdminSession(session)).toBe(true);
    expect(isAdminSession(`${session}x`)).toBe(false);
    process.env.ADMIN_PASSWORD = "new-correct-horse-battery-staple-2026";
    expect(isAdminSession(session)).toBe(false);
  });
});
