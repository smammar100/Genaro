import type { PrepCar } from "@/lib/services/prep-service";

type Counts = Pick<PrepCar, "done" | "inProgress" | "pending" | "cancelled" | "total">;

/**
 * A car's prep roll-up as one segmented bar — done, in progress, pending —
 * so the split is visible at a glance. Cancelled items are left out: they are
 * not work anyone still has to do (GEN-112).
 */
export function PrepProgressBar({ done, inProgress, pending }: Counts) {
  const segment = (n: number, className: string) =>
    n > 0 ? <span className={className} style={{ flexGrow: n }} /> : null;
  const live = done + inProgress + pending;
  return (
    <div
      role="progressbar"
      aria-label="Prep progress"
      aria-valuemin={0}
      aria-valuemax={live}
      aria-valuenow={done}
      className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-(--bg-fill-tertiary)"
    >
      {segment(done, "bg-(--bg-fill-success)")}
      {segment(inProgress, "bg-(--bg-fill-info)")}
      {segment(pending, "bg-(--bg-fill-tertiary)")}
    </div>
  );
}

/** "1 of 2 done · 1 in progress · 1 cancelled", or why there is nothing to count. */
export function prepSummary({ done, inProgress, cancelled, total }: Counts): string {
  const live = total - cancelled;
  if (live === 0) return total === 0 ? "No items raised" : "All items cancelled";
  const parts = [`${done} of ${live} done`];
  if (inProgress) parts.push(`${inProgress} in progress`);
  if (cancelled) parts.push(`${cancelled} cancelled`);
  return parts.join(" · ");
}
