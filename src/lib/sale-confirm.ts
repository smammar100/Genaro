import type { ConfirmOptions } from "@/components/genaro";
import { SELLING_AGENT_SUGGESTIONS } from "@/lib/master-sheet";
import type { LeadChannel } from "@/lib/types";

/**
 * Asked before a completed sale moves back to another stage: the car goes
 * back on sale and the sale's figures are wiped from the master sheet
 * (bug list 2026-11-02, item 2).
 */
export function unsaleConfirmOptions(
  customerName: string,
  registration: string | null,
  stageLabel: string,
): ConfirmOptions {
  const car = registration ?? "the car";
  return {
    title: `Undo the sale of ${car}?`,
    description: `${customerName}'s deal moves back to ${stageLabel}. ${car} is marked available again, and its date sold, selling price and enquiry source are cleared from the master sheet.`,
    confirmText: "Undo sale",
    destructive: true,
  };
}

/** Lead channels whose master sheet wording isn't just their label in capitals. */
const SHEET_SOURCE: Record<string, string> = {
  autotrader: "AUTO TRADER",
  cargurus: "CAR GURUS",
  walk_in: "WALK IN",
  cf247: "CAR FINANCE 247",
  website: "CAR CAPITAL",
  repeat_customer: "CAR CAPITAL - RETURNING CUSTOMER",
};

/**
 * The master sheet's "Selling agent / lead from" wording for a lead channel,
 * to start the sale dialog's enquiry source; null for Other, which is asked.
 */
export function enquirySourceForChannel(channel: Pick<LeadChannel, "slug" | "label"> | null | undefined): string | null {
  if (!channel || channel.slug === "other") return null;
  return SHEET_SOURCE[channel.slug] ?? channel.label.toUpperCase();
}

/**
 * The enquiry sources to offer: the sheet's usual ones, then any other
 * wording already on a car, then the one this sale starts with.
 */
export function enquirySourceOptions(used: (string | null | undefined)[], current?: string | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...SELLING_AGENT_SUGGESTIONS, ...used, current]) {
    const v = s?.trim();
    if (!v || seen.has(v.toUpperCase())) continue;
    seen.add(v.toUpperCase());
    out.push(v);
  }
  return out;
}
