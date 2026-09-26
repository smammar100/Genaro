/**
 * The summary metrics above the Master sheet: four figures per section tab,
 * computed from the same rows the grid shows (after search and filters).
 *
 * Pure so the page, the tests and any future report agree. An aggregate over
 * nothing (an average of no cars, the top agent when no car has one) is
 * `null`, which the UI shows as "—" rather than a misleading £0.
 */

import { sheetProfit } from "./master-sheet";
import type { Vehicle } from "./types";

export type MetricSection =
  | "all"
  | "buying"
  | "receiving"
  | "value_addition"
  | "sales";

export type MetricFormat = "count" | "money" | "percent" | "text";

export interface SectionMetric {
  label: string;
  value: number | string | null;
  format: MetricFormat;
}

export type MetricVehicle = Pick<
  Vehicle,
  | "saleStatus"
  | "dateSold"
  | "sellingPrice"
  | "totalBuyingPrice"
  | "invoiceDate"
  | "auctionHouse"
  | "receivedDate"
  | "logBook"
  | "numKeys"
  | "serviceHistory"
  | "valueAddition"
  | "sellingAgent"
>;

/** `YYYY-MM` of a date in local time — the "this month" the user means. */
export function monthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** True when an ISO date (`YYYY-MM-DD…`) falls in the month `key`. */
function inMonth(iso: string | null | undefined, key: string): boolean {
  return typeof iso === "string" && iso.slice(0, 7) === key;
}

const num = (x: number | null | undefined): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

/** Sum over a set, or null when the set is empty. */
function sumOf<T>(rows: T[], get: (row: T) => number): number | null {
  if (rows.length === 0) return null;
  return rows.reduce((total, row) => total + get(row), 0);
}

/**
 * The most frequent non-blank text, compared case-insensitively ("BCA
 * AUCTION" and "bca auction" are one house). Ties go to the value seen first;
 * the result is spelled as it was first entered. Null when every value is blank.
 */
export function mostCommon(values: (string | null | undefined)[]): string | null {
  const counts = new Map<string, { label: string; n: number }>();
  let best: { label: string; n: number } | null = null;
  for (const raw of values) {
    const label = raw?.trim();
    if (!label) continue;
    const key = label.toUpperCase();
    const entry = counts.get(key) ?? { label, n: 0 };
    entry.n += 1;
    counts.set(key, entry);
    if (!best || entry.n > best.n) best = entry;
  }
  return best?.label ?? null;
}

const isSold = (v: MetricVehicle) => v.saleStatus === "sold";

/** A log book the sheet records as missing ("NOT AVAILABLE"). */
const logBookMissing = (v: MetricVehicle) =>
  /^NOT AVAILABLE\b/.test((v.logBook ?? "").trim().toUpperCase());

/**
 * The four metrics for a section tab. `rows` are the grid's rows after
 * search and filters; `now` fixes "this month" (injectable for tests).
 */
export function sectionMetrics(
  section: MetricSection,
  rows: MetricVehicle[],
  now: Date = new Date(),
): SectionMetric[] {
  const month = monthKey(now);
  const soldThisMonth = rows.filter((v) => isSold(v) && inMonth(v.dateSold, month));

  switch (section) {
    case "buying": {
      const priced = rows.filter((v) => num(v.totalBuyingPrice) > 0);
      const spend = sumOf(rows, (v) => num(v.totalBuyingPrice));
      return [
        {
          label: "Bought this month",
          value: rows.filter((v) => inMonth(v.invoiceDate, month)).length,
          format: "count",
        },
        { label: "Total spend", value: spend, format: "money" },
        {
          label: "Average buying price",
          value:
            priced.length > 0
              ? priced.reduce((t, v) => t + num(v.totalBuyingPrice), 0) / priced.length
              : null,
          format: "money",
        },
        {
          label: "Most used auction house",
          value: mostCommon(rows.map((v) => v.auctionHouse)),
          format: "text",
        },
      ];
    }
    case "receiving":
      return [
        {
          label: "Received this month",
          value: rows.filter((v) => inMonth(v.receivedDate, month)).length,
          format: "count",
        },
        {
          label: "Log book not available",
          value: rows.filter(logBookMissing).length,
          format: "count",
        },
        {
          label: "Single key",
          value: rows.filter((v) => v.numKeys === 1).length,
          format: "count",
        },
        {
          label: "Full service history",
          value:
            rows.length > 0
              ? rows.filter((v) => v.serviceHistory === "full").length / rows.length
              : null,
          format: "percent",
        },
      ];
    case "value_addition": {
      const worked = rows.filter((v) => num(v.valueAddition) > 0);
      const total = sumOf(rows, (v) => num(v.valueAddition));
      return [
        { label: "Total value addition", value: total, format: "money" },
        {
          label: "Average per car",
          value: total !== null ? total / rows.length : null,
          format: "money",
        },
        { label: "Cars with value addition", value: worked.length, format: "count" },
        {
          label: "Largest value addition",
          value:
            worked.length > 0 ? Math.max(...worked.map((v) => num(v.valueAddition))) : null,
          format: "money",
        },
      ];
    }
    case "sales":
      return [
        { label: "Sold this month", value: soldThisMonth.length, format: "count" },
        {
          label: "Revenue this month",
          value: sumOf(soldThisMonth, (v) => num(v.sellingPrice)),
          format: "money",
        },
        {
          label: "S − P this month",
          value: sumOf(soldThisMonth, sheetProfit),
          format: "money",
        },
        {
          label: "Top lead source",
          value: mostCommon(rows.filter(isSold).map((v) => v.sellingAgent)),
          format: "text",
        },
      ];
    case "all":
    default:
      return [
        { label: "Cars", value: rows.length, format: "count" },
        {
          label: "Available",
          value: rows.filter((v) => v.saleStatus === "available").length,
          format: "count",
        },
        { label: "Sold this month", value: soldThisMonth.length, format: "count" },
        { label: "Total S − P", value: sumOf(rows, sheetProfit), format: "money" },
      ];
  }
}

const COUNT = new Intl.NumberFormat("en-GB");
const POUNDS = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** A metric as the card shows it: "£9,344", "58%", "12", or "—" when unknown. */
export function formatMetric(metric: Pick<SectionMetric, "value" | "format">): string {
  const { value, format } = metric;
  if (value === null || value === "") return "—";
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "—";
  switch (format) {
    case "money":
      return POUNDS.format(Math.round(value));
    case "percent":
      return `${Math.round(value * 100)}%`;
    default:
      return COUNT.format(value);
  }
}

/**
 * Column count per section for the tab badges: every column under "all",
 * and each section's own columns under its id (the pinned identity columns
 * show in every tab but belong to none).
 */
export function columnCountsBySection(
  cols: { section?: string }[],
): Record<string, number> {
  const counts: Record<string, number> = { all: cols.length };
  for (const c of cols) {
    if (!c.section || c.section === "common") continue;
    counts[c.section] = (counts[c.section] ?? 0) + 1;
  }
  return counts;
}
