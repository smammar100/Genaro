import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capabilitiesForRoles, type RoleValue } from "@/lib/roles";
import type { Capability } from "@/lib/capabilities";

/**
 * Server-side authorization for API route handlers.
 *
 * Before this existed, routes trusted `companyId`/`actorId` from the request
 * body and used the service-role key with no caller check — any logged-in (or
 * even logged-out) client could act as anyone. `requireUser()` authenticates
 * the caller from their session cookie, loads their profile, blocks
 * deactivated accounts, and resolves their effective capabilities. Routes then
 * derive company/actor from the returned actor — never from the body.
 */

export interface AuthedActor {
  id: string;
  companyId: string;
  roles: RoleValue[];
  isSuperUser: boolean;
  capabilities: Set<Capability>;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

/** Reject a promise if it doesn't settle within `ms`. Prevents a slow
 *  Supabase round-trip from hanging the whole serverless function (which,
 *  on the vehicle-lookup route, manifested as a spinner that never resolved). */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new AuthError(
              401,
              `Couldn't verify your session (${label} timed out). Check your connection and try again.`,
            ),
          ),
        ms,
      ),
    ),
  ]);
}

/** Authenticate + load the active caller. Throws AuthError(401/403) otherwise. */
export async function requireUser(): Promise<AuthedActor> {
  const supabase = await createClient();

  // Authenticate the caller with getUser(), whose result is the ONLY source of
  // identity here. getUser() validates the access token against the Auth server
  // and, when it has expired, first refreshes it from the refresh-token cookie
  // (writing the rotated cookies back through this route handler's cookie store)
  // and then validates — so a still-valid session is not rejected merely because
  // its access token aged out.
  //
  // We deliberately do NOT fall back to getSession(): on the server its session
  // is read straight from the request cookie and is not signature-verified, so
  // trusting session.user would let a forged cookie be accepted as any user id.
  // getUser() already covers the expired-access-token case the old fallback was
  // added for.
  const { data: getUserData, error: authError } = await withTimeout(
    supabase.auth.getUser(),
    8_000,
    "auth check",
  );
  const user = getUserData.user;

  if (!user) {
    const msg = authError instanceof Error ? authError.message : "no user";
    console.warn(`[require-user] 401 — no valid session: ${msg}`);
    throw new AuthError(401, "Authentication required");
  }

  // Load the profile with the service-role client so this works regardless of
  // RLS, but keyed strictly to the authenticated user's own id.
  // A misconfigured server (no SUPABASE_SERVICE_ROLE_KEY) threw a bare Error
  // from here. `authErrorResponse` only maps AuthError, so routes rethrew it and
  // Next answered with an empty-bodied 500 — the caller saw a failure with no
  // reason attached. Type it so it comes back as a readable message.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    throw new AuthError(
      500,
      e instanceof Error ? e.message : "Server auth is misconfigured",
    );
  }
  const { data: profile, error: pErr } = await admin
    .from("users")
    .select("id, company_id, roles, is_super_user, active")
    .eq("id", user.id)
    .maybeSingle();
  if (pErr || !profile) throw new AuthError(403, "No profile for this account");
  if ((profile as { active: boolean }).active === false) {
    throw new AuthError(403, "Account is deactivated");
  }

  const roles = ((profile as { roles: RoleValue[] }).roles ?? []) as RoleValue[];
  const isSuperUser = (profile as { is_super_user: boolean }).is_super_user === true;

  const capabilities = capabilitiesForRoles(roles);
  const { data: grants } = await admin
    .from("user_permissions")
    .select("capability")
    .eq("user_id", user.id);
  for (const g of grants ?? []) {
    capabilities.add((g as { capability: Capability }).capability);
  }

  return {
    id: (profile as { id: string }).id,
    companyId: (profile as { company_id: string }).company_id,
    roles,
    isSuperUser,
    capabilities,
  };
}

/** Throw AuthError(403) unless the actor holds `cap` (super-users bypass). */
export function requireCapability(actor: AuthedActor, cap: Capability): void {
  if (actor.isSuperUser) return;
  if (!actor.capabilities.has(cap)) {
    throw new AuthError(403, `Missing required permission: ${cap}`);
  }
}

/** Throw AuthError(403) unless the actor holds ANY of `caps` (super-users bypass). */
export function requireAnyCapability(actor: AuthedActor, caps: Capability[]): void {
  if (actor.isSuperUser) return;
  if (!caps.some((c) => actor.capabilities.has(c))) {
    throw new AuthError(403, `Missing required permission: one of ${caps.join(", ")}`);
  }
}

/**
 * Convert an AuthError into a NextResponse for a route catch block. Returns
 * null for non-auth errors so the caller can rethrow/handle them.
 */
export function authErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return null;
}
