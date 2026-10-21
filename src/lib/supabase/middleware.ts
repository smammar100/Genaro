import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/join",
  // The design prototype page, auth-free by design (.claude/skills/prototype).
  "/prototype",
];

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether the request carries a Supabase session cookie at all: whole
 * (`sb-<ref>-auth-token`) or split into chunks (`sb-<ref>-auth-token.0`, `.1`…),
 * which @supabase/ssr does once the session outgrows one cookie.
 *
 * SECURITY: presence is not proof of anything, so a positive result must
 * NEVER be trusted to grant access; it only decides whether the Supabase
 * check below is worth running. It used to also require an unexpired access
 * token, which sent every session idle past the ~1h token lifetime to /login
 * (where the page signs it out) instead of letting the refresh token renew it.
 * An expired token now falls through to `getClaims()`, which refreshes it.
 */
export function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && c.value.length > 0);
}

/**
 * To /login, carrying the page asked for (query included) in `next` so
 * signing in lands back on it. The page's own query string stays in `next`
 * rather than riding along on the login URL.
 */
function redirectToLogin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = new URL("/login", request.url);
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // /warranties redirect runs regardless of auth state.
  if (pathname === "/warranties") {
    const url = request.nextUrl.clone();
    url.pathname = "/warranties/in-house";
    return NextResponse.redirect(url);
  }

  // Fail-closed fast path: protected page with NO session cookie → there is
  // no session, so redirect to /login without the Supabase round-trip. A
  // cookie never grants access by itself; it always falls through to the
  // verified getClaims() check below.
  if (!isPublic && pathname !== "/" && !hasSessionCookie(request)) {
    return redirectToLogin(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() refreshes an expired access token (writing the new cookies
  // through setAll above), then verifies its signature against the project's
  // published signing keys, falling back to the Auth server for symmetric
  // keys. Verified locally, it adds no Supabase round-trip to every request
  // the way getUser() did. A forged or unsigned token yields no claims.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  if (!user && !isPublic && pathname !== "/") {
    return redirectToLogin(request);
  }

  // Authenticated user hitting the root → send to the dashboard. We deliberately
  // do NOT redirect /login→/dashboard here: /login is owned by the client, which
  // force-signs-out any pre-existing session so account-switchers land on a
  // usable form. A middleware redirect would race that sign-out and bounce the
  // user back in as the old account.
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
