import { DaySheet } from "./day-sheet";

/**
 * Daily jobs: the team's day sheet of small jobs (0061). Anyone posts a job for
 * today or a later day; staff pick it up and mark it completed, and it is
 * struck off. Decided from the day-sheet prototype (docs/daily-jobs.md). The
 * sheet renders the whole Page: its header carries the date switcher and Add job.
 */
export default function DailyJobsPage() {
  return <DaySheet />;
}
