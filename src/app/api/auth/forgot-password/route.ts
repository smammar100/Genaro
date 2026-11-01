/**
 * Forgot password (call 2026-10-31): emails a one-use reset link.
 *
 *   POST { identifier: username or email, org?: dealership slug }
 *
 * A username account's sign-in email is internal and receives nothing
 * (lib/auth/username), so its link goes to the recovery email set on My
 * profile; an email account's goes to its own email. The link is made with
 * the service role and sent through Resend, so both kinds work the same way,
 * and it lands on /reset-password, which verifies it.
 *
 * The reply is the same whether or not an account matched, so the form can't
 * be used to find out who has an account. Rate-limited per address and per
 * account.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/send-invite";
import {
  DEFAULT_ORG_SLUG,
  isSyntheticEmail,
  looksLikeEmail,
  syntheticEmail,
} from "@/lib/auth/username";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const SENT = { ok: true };

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`forgot-password:ip:${ip}`, { max: 10, windowMs: 15 * 60_000 }).ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  let body: { identifier?: string; org?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const identifier = body.identifier?.trim() ?? "";
  if (!identifier) {
    return NextResponse.json({ error: "Enter your username or email" }, { status: 400 });
  }
  const authEmail = looksLikeEmail(identifier)
    ? identifier.toLowerCase()
    : syntheticEmail(body.org?.trim() || DEFAULT_ORG_SLUG, identifier);

  // One request per account per few minutes, whoever sends it.
  if (!rateLimit(`forgot-password:acct:${authEmail}`, { max: 3, windowMs: 15 * 60_000 }).ok) {
    return NextResponse.json(SENT);
  }

  const admin = createAdminClient();
  const { data: user, error } = await admin
    .from("users")
    .select("id, name, email, active, recovery_email")
    .eq("email", authEmail)
    .maybeSingle();
  if (error) {
    logger.error("forgot-password", "user lookup failed", { error });
    return NextResponse.json({ error: "Couldn't send the link. Try again." }, { status: 502 });
  }
  const row = user as {
    id: string;
    name: string;
    email: string;
    active: boolean;
    recovery_email: string | null;
  } | null;
  if (!row || !row.active) return NextResponse.json(SENT);

  const sendTo = isSyntheticEmail(row.email) ? row.recovery_email : row.email;
  if (!sendTo) {
    logger.info("forgot-password", "no email for reset", { userId: row.id });
    return NextResponse.json(SENT);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || new URL(request.url).origin;
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: row.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    logger.error("forgot-password", "link failed", { userId: row.id, error: linkError });
    return NextResponse.json({ error: "Couldn't send the link. Try again." }, { status: 502 });
  }

  try {
    await sendPasswordResetEmail({
      recipientEmail: sendTo,
      recipientName: row.name,
      resetUrl: `${origin}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`,
    });
  } catch (e) {
    logger.error("forgot-password", "email failed", { userId: row.id, error: String(e) });
    return NextResponse.json({ error: "Couldn't send the link. Try again." }, { status: 502 });
  }
  return NextResponse.json(SENT);
}
