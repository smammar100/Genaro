import type { ConfirmOptions } from "@/components/genaro";

/**
 * The question asked before a deal moves into a stage that completes the
 * sale, wherever the move starts (a drag, the list, the deal page): the car
 * leaves stock as part of it, so it is said out loud (call 2026-10-31).
 */
export function saleConfirmOptions(
  customerName: string,
  registration: string | null,
  stageLabel: string,
): ConfirmOptions {
  const car = registration ?? "the car";
  return {
    title: `Mark ${car} as sold?`,
    description: `${customerName}'s deal moves to ${stageLabel}, and ${car} is marked sold on the master sheet: it leaves stock and its location becomes Sold.`,
    confirmText: "Mark as sold",
  };
}
