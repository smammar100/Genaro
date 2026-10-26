import { NextResponse } from "next/server";
import {
  requireUser,
  requireAnyCapability,
  authErrorResponse,
} from "@/lib/auth/require-user";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/listing/generate-description
 *
 * Generates a retail-ready vehicle advert description from the structured
 * vehicle data + selected features. Credentials stay server-side
 * (OPENAI_API_KEY). When no key is configured the route still returns a
 * sensible templated description so the Advert tool works end-to-end in
 * local/dev without an LLM.
 */

export const runtime = "nodejs";

interface GenerateBody {
  make?: string;
  model?: string;
  derivative?: string | null;
  year?: number;
  mileage?: number;
  colour?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  doors?: number;
  price?: number;
  features?: string[];
  tone?: "professional" | "friendly" | "premium";
}

function fmtMiles(n?: number): string {
  return typeof n === "number" ? `${n.toLocaleString("en-GB")} miles` : "";
}

function fmtPrice(n?: number): string {
  return typeof n === "number" && n > 0
    ? `£${n.toLocaleString("en-GB")}`
    : "";
}

/** Deterministic, dealer-grade fallback when no LLM key is available. */
function templateDescription(b: GenerateBody): string {
  const name = [b.year, b.make, b.model, b.derivative]
    .filter(Boolean)
    .join(" ");
  const specBits = [
    b.colour && `finished in ${b.colour.toLowerCase()}`,
    b.transmission && `${b.transmission.toLowerCase()} transmission`,
    b.fuelType && `${b.fuelType.toLowerCase()} engine`,
    fmtMiles(b.mileage) && `just ${fmtMiles(b.mileage)}`,
  ].filter(Boolean);

  const feats = (b.features ?? []).slice(0, 8);
  const featSentence = feats.length
    ? `Specification highlights include ${feats
        .slice(0, -1)
        .join(", ")}${feats.length > 1 ? " and " : ""}${
        feats[feats.length - 1]
      }.`
    : "";

  return [
    `Presenting this superb ${name}${
      specBits.length ? `, ${specBits.join(", ")}.` : "."
    }`,
    featSentence,
    `Supplied with a comprehensive history and prepared to the highest standard, this vehicle has been fully inspected by our workshop ahead of sale.`,
    `Part-exchange welcome and competitive finance packages available. Please contact our friendly sales team today to arrange a viewing or test drive.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  // AuthZ: only advert-capable staff may spend the operator's LLM credits.
  // Previously this route accepted any signed-in user with no rate limit, so a
  // low-privilege account could drive unbounded operator-paid generation.
  let actor;
  try {
    actor = await requireUser();
    requireAnyCapability(actor, ["advert:create", "advert:edit"]);
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const limit = rateLimit(`listing-desc:${actor.id}`, {
    max: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many description requests, try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // OpenAI-compatible config. Supports a custom gateway via LLM_BASE_URL /
  // LLM_MODEL and falls back to the standard OpenAI endpoint. The key is read
  // from the environment ONLY — never hardcoded here nor returned to the client.
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  // No key → deterministic template so the feature still works.
  if (!apiKey) {
    return NextResponse.json({
      description: templateDescription(body),
      source: "template",
    });
  }

  // Cap every caller-supplied string before it enters the prompt so one
  // request cannot send an oversized, token-costly body.
  const cap = (v: unknown, n: number): string =>
    typeof v === "string" ? v.slice(0, n) : "";
  const name = [
    body.year,
    cap(body.make, 40),
    cap(body.model, 40),
    cap(body.derivative, 60),
  ]
    .filter(Boolean)
    .join(" ");
  const facts = [
    fmtMiles(body.mileage),
    cap(body.colour, 40),
    cap(body.fuelType, 40),
    cap(body.transmission, 40),
    cap(body.bodyType, 40),
    body.doors ? `${body.doors} doors` : "",
    fmtPrice(body.price),
  ]
    .filter(Boolean)
    .join(", ");
  const features = (Array.isArray(body.features) ? body.features : [])
    .filter((f): f is string => typeof f === "string")
    .slice(0, 40)
    .map((f) => f.slice(0, 80))
    .join(", ");
  const tone =
    body.tone === "friendly" || body.tone === "premium"
      ? body.tone
      : "professional";

  const prompt = [
    `Write a compelling UK used-car advert description for a ${name}.`,
    facts && `Key facts: ${facts}.`,
    features && `Equipment & features: ${features}.`,
    `Tone: ${tone}, trustworthy, dealer-grade. British English.`,
    `Rules: 120-220 words, 2-4 short paragraphs, no markdown, no headings, no emojis, no fabricated facts (only use the data provided), no price unless given. End with a soft call to action (viewing/test drive, part-exchange, finance).`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You are an expert UK motor-trade copywriter who writes accurate, persuasive used-car advert descriptions. Never invent specification the dealer didn't provide.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      // Log the upstream body server-side; never echo it to the browser (a
      // custom LLM_BASE_URL gateway may include sensitive detail in errors).
      const detail = await res.text().catch(() => "");
      logger.error("listing-desc", "LLM request failed", {
        status: res.status,
        detail: detail.slice(0, 500),
      });
      // Graceful degradation — still hand back a usable description.
      return NextResponse.json({
        description: templateDescription(body),
        source: "template",
        warning: `LLM request failed (${res.status})`,
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      description: text && text.length > 0 ? text : templateDescription(body),
      source: text ? "openai" : "template",
    });
  } catch (err) {
    logger.error("listing-desc", "LLM request error", {
      error: err instanceof Error ? err : String(err),
    });
    return NextResponse.json({
      description: templateDescription(body),
      source: "template",
      warning: "LLM request error",
    });
  }
}
