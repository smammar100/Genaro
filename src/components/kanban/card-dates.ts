/**
 * Date words for Kanban cards. Stored dates are YYYY-MM-DD, or ISO date-times
 * whose date part is used; "today" is the viewer's local day.
 */

/** Today as YYYY-MM-DD, local time. */
export const todayKey = (): string => new Date().toLocaleDateString("en-CA");

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const utcDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
const withYear = (iso: string, text: string) =>
  iso.slice(0, 4) === todayKey().slice(0, 4) ? text : `${text} ${iso.slice(0, 4)}`;

/** "27 Sept", with the year when it isn't this one's. */
export const shortDate = (iso: string): string => withYear(iso, DAY_MONTH.format(utcDay(iso)));

/** "Sun 27 Sept", with the year when it isn't this one's. */
export const dayDate = (iso: string): string =>
  withYear(iso, WEEKDAY_DAY_MONTH.format(utcDay(iso)));

/** Whole days from today to the date; negative once it has passed. */
export function daysUntil(iso: string): number {
  const [y, m, d] = todayKey().split("-").map(Number);
  return Math.round((utcDay(iso).getTime() - Date.UTC(y, m - 1, d)) / 86_400_000);
}

/** "1 day overdue", "4 days overdue". */
export const overdueText = (days: number): string =>
  days === -1 ? "1 day overdue" : `${-days} days overdue`;
