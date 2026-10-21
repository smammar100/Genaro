/**
 * Pins the proxy's security invariant: the cookie check is ROUTING-ONLY. A
 * forged cookie (valid shape, future exp, no real session) may skip the login
 * fast-redirect, but updateSession must still redirect to /login because the
 * verified supabase.auth.getClaims() returns no claims. If a refactor ever
 * makes the fast path grant access, these tests fail.
 */
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The verified check — force "no session" regardless of cookies.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: null, error: null }),
    },
  }),
}));

import { hasSessionCookie, updateSession } from "./middleware";

function forgedAuthCookieValue(expOffsetSeconds: number): string {
  // Unsigned JWT with an arbitrary exp — trivially forgeable by an attacker.
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }),
  ).toString("base64");
  const accessToken = `header.${payload}.signature`;
  return JSON.stringify([accessToken, "refresh-token"]);
}

function requestWithCookie(
  path: string,
  cookieValue?: string,
  name = "sb-test-auth-token",
): NextRequest {
  const req = new NextRequest(`http://localhost${path}`);
  if (cookieValue !== undefined) {
    req.cookies.set(name, cookieValue);
  }
  return req;
}

describe("hasSessionCookie", () => {
  it("false with no cookie", () => {
    expect(hasSessionCookie(requestWithCookie("/dashboard"))).toBe(false);
  });

  it("false with an empty cookie", () => {
    expect(hasSessionCookie(requestWithCookie("/dashboard", ""))).toBe(false);
  });

  it("false for a cookie that isn't Supabase's session", () => {
    expect(
      hasSessionCookie(requestWithCookie("/dashboard", "x", "sidebar_state")),
    ).toBe(false);
  });

  it("true with an expired token, so the refresh token gets its chance", () => {
    expect(
      hasSessionCookie(
        requestWithCookie("/dashboard", forgedAuthCookieValue(-3600)),
      ),
    ).toBe(true);
  });

  it("true with a session split into chunks", () => {
    expect(
      hasSessionCookie(
        requestWithCookie("/dashboard", "base64-abc", "sb-test-auth-token.0"),
      ),
    ).toBe(true);
  });

  it("true with a fresh-looking token — which must NOT mean authenticated", () => {
    expect(
      hasSessionCookie(
        requestWithCookie("/dashboard", forgedAuthCookieValue(3600)),
      ),
    ).toBe(true);
  });
});

describe("updateSession — forged cookies never grant access", () => {
  it("no cookie → fast-redirects to /login", async () => {
    const res = await updateSession(requestWithCookie("/dashboard"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("FORGED fresh cookie → still redirected to /login by the authoritative check", async () => {
    const res = await updateSession(
      requestWithCookie("/dashboard", forgedAuthCookieValue(3600)),
    );
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("FORGED expired cookie → redirected to /login once the refresh fails", async () => {
    const res = await updateSession(
      requestWithCookie("/dashboard", forgedAuthCookieValue(-3600)),
    );
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("public paths pass through without a session", async () => {
    for (const path of ["/login", "/forgot-password", "/reset-password", "/join/abc", "/prototype"]) {
      const res = await updateSession(requestWithCookie(path));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("keeps the requested page for after sign-in", async () => {
    const res = await updateSession(requestWithCookie("/sales/pipeline"));
    expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe("/sales/pipeline");
  });

  it("keeps the page's query in next, not on the login URL", async () => {
    const res = await updateSession(requestWithCookie("/vehicles?tab=stock"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/vehicles?tab=stock");
    expect(location.searchParams.get("tab")).toBeNull();
  });
});
