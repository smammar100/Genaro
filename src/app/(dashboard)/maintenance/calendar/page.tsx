import { SharedCalendar } from "@/components/calendar/shared-calendar";

/**
 * Maintenance Calendar — the same calendar surface as the Master Calendar,
 * scoped to maintenance dues only, with an "Add job" create action.
 */
export default function MaintenanceCalendarPage() {
  return (
    <SharedCalendar
      title="Maintenance calendar"
      subtitle="All maintenance and inspection jobs on one calendar, each marked with its status. Click a slot to add or an event to open it."
      kinds={["maint"]}
      ctaLabel="Add job"
      lockCreateKind
    />
  );
}
