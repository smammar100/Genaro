import { Page } from "@/components/genaro";
import { DaySheet } from "./day-sheet";

/**
 * Daily jobs: the team's day sheet of small jobs (0061). Anyone posts a job for
 * today or a later day; staff pick it up and mark it completed, and it is
 * struck off. Decided from the day-sheet prototype (docs/daily-jobs.md).
 */
export default function DailyJobsPage() {
  return (
    <Page
      title="Daily jobs"
      subtitle="Post the day's jobs for the team. Anyone can add one, pick one up and mark it completed."
      fullWidth
    >
      <DaySheet />
    </Page>
  );
}
