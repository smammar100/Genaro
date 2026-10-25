import type { Vehicle } from "./types";

/**
 * A car still for sale: not sold, not returned to its owner, and not a
 * duplicate entry on the master sheet. Cars still in inspection or prep count,
 * since a customer can ask about them (call 2026-10-24).
 */
export function isInStock(
  v: Pick<Vehicle, "saleStatus" | "status">,
): boolean {
  return v.saleStatus === "available" && v.status !== "sold" && v.status !== "returned";
}

/** Case-insensitive, numeric-aware text order ("Mk2" before "Mk10"). */
export function byText(a: string, b: string): number {
  return a.localeCompare(b, "en-GB", { numeric: true, sensitivity: "base" });
}

/**
 * Latest arrival first. Days in stock stops counting once a car sells, so it
 * can't order arrivals; the received date can, with creation time breaking a
 * same-day tie.
 */
export function byNewest(
  a: Pick<Vehicle, "receivedDate" | "createdAt">,
  b: Pick<Vehicle, "receivedDate" | "createdAt">,
): number {
  return byText(b.receivedDate, a.receivedDate) || byText(b.createdAt, a.createdAt);
}
