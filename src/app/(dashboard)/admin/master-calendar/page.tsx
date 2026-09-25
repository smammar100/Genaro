"use client";

import { Page } from "@/components/polaris";
import { SharedCalendar } from "@/components/calendar/shared-calendar";

/**
 * Master Calendar — overlay of appointments (sky), workshop walk-ins (amber)
 * and maintenance dues (violet) in one shared view. Built on the reusable
 * <SharedCalendar/> surface (also powers the Maintenance Calendar).
 */
export default function MasterCalendarPage() {
  return (
    <Page
      title="Master calendar"
      subtitle="Every customer appointment, workshop walk-in and maintenance due in one shared view. Click a slot to book or an event to open it."
      fullWidth
    >
      <SharedCalendar />
    </Page>
  );
}
