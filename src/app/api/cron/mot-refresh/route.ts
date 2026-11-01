/**
 * Weekly MOT refresh: re-reads every in-stock car's MOT expiry and status
 * from the DVSA MOT History API, so the inventory's MOT column and the
 * dashboard's "MOTs expiring soon" stay current after a test or a lapse
 * (call 2026-10-31). The lookup at arrival only fills them once.
 *
 * Runs weekly via Vercel Cron (vercel.json). One car at a time, well inside
 * DVSA's rate limit; a car that fails to look up keeps what it had and is
 * counted, never stops the run.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`, as the expiry scan.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DvsaError, lookupMotHistory } from "@/lib/services/dvsa-service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** A plate DVSA can look up: letters and digits, after spaces are dropped. */
const LOOKUPABLE = /^[A-Z0-9]{2,8}$/;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error("mot-refresh", "CRON_SECRET not set");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: vehicles, error } = await admin
    .from("vehicles")
    .select("id, registration, mot_expiry, mot_status")
    .eq("sale_status", "available");
  if (error) {
    logger.error("mot-refresh", "vehicle fetch failed", { error });
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  let checked = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const v of vehicles ?? []) {
    const reg = (v.registration ?? "").replace(/\s+/g, "").toUpperCase();
    if (!LOOKUPABLE.test(reg) || reg === "UNREGISTERED") {
      skipped++;
      continue;
    }
    checked++;
    try {
      const mot = await lookupMotHistory(reg);
      if (!mot) continue;
      if (mot.motExpiryDate === v.mot_expiry && mot.motStatus === v.mot_status) continue;
      const { error: updateError } = await admin
        .from("vehicles")
        .update({ mot_expiry: mot.motExpiryDate, mot_status: mot.motStatus })
        .eq("id", v.id);
      if (updateError) throw updateError;
      updated++;
    } catch (e) {
      // Without credentials no car can be looked up: say so once and stop.
      if (e instanceof DvsaError && e.code === "missing_credentials") {
        logger.error("mot-refresh", "DVSA credentials not set");
        return NextResponse.json({ error: "dvsa_not_configured" }, { status: 500 });
      }
      failed++;
      logger.warn("mot-refresh", "lookup failed", { registration: reg, error: String(e) });
    }
  }

  logger.info("mot-refresh", "done", { checked, updated, skipped, failed });
  return NextResponse.json({ checked, updated, skipped, failed });
}
