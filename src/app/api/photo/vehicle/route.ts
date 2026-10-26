import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { variantLabel } from "@/lib/vehicle-variant";
import {
  requireUser,
  requireCapability,
  authErrorResponse,
} from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { CAR_ANGLES, carPhotoPrompt, type CarAngle } from "@/lib/services/photo-service";
import {
  readCarImageUrl,
  writeCarImage,
} from "@/lib/services/photo-storage";

export const runtime = "nodejs";

const SAFE_KEY = /^[a-z0-9-_]{1,32}$/i;

function fileBase(angle: CarAngle, backdropKey?: string): string {
  if (angle === "composed" && backdropKey) {
    return `composed-${backdropKey}`;
  }
  return angle;
}

// ---- In-flight dedupe ----------------------------------------------------
const inFlight = new Map<string, Promise<string>>();

/**
 * Set the vehicle's hero image with the service-role client, scoped to the
 * caller's own company. The browser-client service method runs as the anon
 * role here (no cookies server-side) and would silently update zero rows.
 */
async function setHeroImageUrl(
  admin: ReturnType<typeof createAdminClient>,
  vehicleId: string,
  companyId: string,
  url: string,
): Promise<void> {
  const { error } = await admin
    .from("vehicles")
    .update({ hero_image_url: url } as never)
    .eq("id", vehicleId)
    .eq("company_id", companyId);
  if (error) throw error;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      n: 1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data.");
  return b64;
}

async function generateAndPersist(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  vehicleId: string,
  angle: CarAngle,
  prompt: string,
  apiKey: string,
  backdropKey?: string,
): Promise<string> {
  const b64 = await callOpenAI(prompt, apiKey);
  const buf = Buffer.from(b64, "base64");
  const base = fileBase(angle, backdropKey);
  const url = await writeCarImage(companyId, vehicleId, base, buf);
  if (angle === "hero") {
    await setHeroImageUrl(admin, vehicleId, companyId, url);
  }
  logger.info("photo", "generated vehicle image", { companyId, vehicleId, base, url });
  return url;
}

export async function POST(request: Request) {
  // AuthZ: only staff who can process photos may spend the operator's image
  // credits and write into storage. The actor scopes the vehicle read and the
  // storage path — never the request body or an unauthenticated row read.
  let actor;
  try {
    actor = await requireUser();
    requireCapability(actor, "photos:process");
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server auth is misconfigured" },
      { status: 500 },
    );
  }

  // Per-user limit so one account cannot starve everyone's photo generation.
  const limit = rateLimit(`photo-vehicle:${actor.id}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many image generations, try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured on the server." },
      { status: 503 },
    );
  }

  let body: {
    vehicleId?: unknown;
    angle?: unknown;
    backdropKey?: unknown;
    backdropHint?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const vehicleId =
    typeof body.vehicleId === "string" ? body.vehicleId.trim() : "";
  if (!vehicleId) {
    return NextResponse.json(
      { error: "`vehicleId` is required." },
      { status: 400 },
    );
  }
  if (
    vehicleId.includes("/") ||
    vehicleId.includes("\\") ||
    vehicleId.includes("..")
  ) {
    return NextResponse.json(
      { error: "Invalid vehicleId." },
      { status: 400 },
    );
  }
  const angleRaw = typeof body.angle === "string" ? body.angle : "hero";
  if (!CAR_ANGLES.includes(angleRaw as CarAngle)) {
    return NextResponse.json(
      { error: `\`angle\` must be one of ${CAR_ANGLES.join(", ")}.` },
      { status: 400 },
    );
  }
  const angle = angleRaw as CarAngle;

  let backdropKey: string | undefined;
  let backdropHint: string | undefined;
  if (angle === "composed") {
    if (
      typeof body.backdropKey !== "string" ||
      !SAFE_KEY.test(body.backdropKey)
    ) {
      return NextResponse.json(
        { error: "`backdropKey` is required for composed (a-z, 0-9, -, _; max 32)." },
        { status: 400 },
      );
    }
    backdropKey = body.backdropKey;
    backdropHint =
      typeof body.backdropHint === "string"
        ? body.backdropHint.slice(0, 200)
        : undefined;
  }

  // Load the vehicle with the service-role client, scoped to the caller's own
  // company. Reading through the browser-client service would run as the anon
  // role here (no cookies server-side), so tenancy would hinge on the live anon
  // SELECT policy; binding to actor.companyId keeps the write cross-tenant-safe.
  const companyId = actor.companyId;
  const { data: vehicleRow, error: vErr } = await admin
    .from("vehicles")
    .select("year, make, model, colour, derivative, variant_name, variant_code")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (vErr) {
    return NextResponse.json(
      { error: "Could not load the vehicle." },
      { status: 502 },
    );
  }
  if (!vehicleRow) {
    return NextResponse.json(
      { error: `Vehicle ${vehicleId} not found.` },
      { status: 404 },
    );
  }
  const vehicle = vehicleRow as {
    year: number | null;
    make: string | null;
    model: string | null;
    colour: string | null;
    derivative: string | null;
    variant_name: string | null;
    variant_code: string | null;
  };

  const base = fileBase(angle, backdropKey);

  // 1. Already in storage? Return immediately.
  const existingUrl = await readCarImageUrl(companyId, vehicleId, base);
  if (existingUrl) {
    if (angle === "hero") {
      await setHeroImageUrl(admin, vehicleId, companyId, existingUrl);
    }
    return NextResponse.json({ url: existingUrl, cached: true });
  }

  // 2. In-flight dedupe.
  const key = `${vehicleId}:${angle}${backdropKey ? `:${backdropKey}` : ""}`;
  const existing = inFlight.get(key);
  if (existing) {
    try {
      const url = await existing;
      return NextResponse.json({ url, cached: false, deduped: true });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "In-flight generation failed.",
        },
        { status: 502 },
      );
    }
  }

  const prompt = carPhotoPrompt({
    year: vehicle.year ?? 0,
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    colour: vehicle.colour ?? "",
    // GEN-91: feed the readable derivative, never the opaque AutoTrader GUID —
    // a 32-char hex string in an image prompt is noise at best.
    variant:
      variantLabel(
        {
          derivative: vehicle.derivative,
          variantName: vehicle.variant_name,
          variantCode: vehicle.variant_code,
        },
        "",
      ) || null,
    angle,
    backdrop: angle === "composed" ? backdropHint : undefined,
  });

  // 3. Kick off generation, register the in-flight promise.
  const promise = generateAndPersist(
    admin,
    companyId,
    vehicleId,
    angle,
    prompt,
    apiKey,
    backdropKey,
  );
  inFlight.set(key, promise);
  try {
    const url = await promise;
    return NextResponse.json({ url, cached: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed." },
      { status: 502 },
    );
  } finally {
    inFlight.delete(key);
  }
}
