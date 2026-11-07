/**
 * Your own profile picture (Settings → My profile).
 *
 * POST takes the picture (multipart field "file", already shrunk to a small
 * JPEG in the browser), stores it at `<company id>/<user id>/avatar.jpg` in the
 * public "avatars" bucket and saves its address in users.avatar_url. DELETE
 * removes it, back to initials.
 *
 * This runs on the server with the service-role client so it works whether or
 * not database update 0068 (the bucket and its storage policies) has been
 * applied: the bucket is created here when it is missing. Who you are comes
 * from the session, never the request, so you can only change your own.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, authErrorResponse, type AuthedActor } from "@/lib/auth/require-user";

export const runtime = "nodejs";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

async function actorOrResponse(): Promise<AuthedActor | NextResponse> {
  try {
    return await requireUser();
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }
}

function adminOrResponse() {
  try {
    return createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The server can't store pictures right now." },
      { status: 500 },
    );
  }
}

/** Makes the public bucket if 0068 hasn't. */
async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: TYPES,
  });
  // Another upload may have made it a moment ago.
  if (error && !/already exists/i.test(error.message)) throw error;
}

export async function POST(request: Request) {
  const actor = await actorOrResponse();
  if (actor instanceof NextResponse) return actor;

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    // Not multipart: falls through to the message below.
  }
  if (!file) return NextResponse.json({ error: "Choose a picture to upload." }, { status: 400 });
  if (!TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPG or WebP picture." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That picture is too large." }, { status: 400 });
  }

  const admin = adminOrResponse();
  if (admin instanceof NextResponse) return admin;

  try {
    await ensureBucket(admin);
    const path = `${actor.companyId}/${actor.id}/avatar.jpg`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) throw upErr;

    // Cache-bust, so the new picture shows at once where the old one was.
    const url = `${admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const { error } = await admin.from("users").update({ avatar_url: url }).eq("id", actor.id);
    if (error) throw error;
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't save the picture." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const actor = await actorOrResponse();
  if (actor instanceof NextResponse) return actor;

  const admin = adminOrResponse();
  if (admin instanceof NextResponse) return admin;

  // The file going is a nicety; the address going is what brings initials back.
  await admin.storage.from(BUCKET).remove([`${actor.companyId}/${actor.id}/avatar.jpg`]);
  const { error } = await admin.from("users").update({ avatar_url: null }).eq("id", actor.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
