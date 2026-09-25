"use client";

import { useEffect, useState } from "react";
import { Button, ButtonGroup } from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { AddVehicleModal } from "@/components/vehicles/add-vehicle-modal";

function salutation(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The dashboard's page header, in the Polaris Page-header anatomy: the
 * greeting as the title (heading-lg), Export as the secondary action and Add
 * vehicle as the page's one primary action.
 *
 * It is drawn here rather than through `Page title/primaryAction` because the
 * onboarding tour anchors on `#tour-add-vehicle`, and Page's actions take no
 * id — the span below carries it around the Polaris Button instead.
 */
export function DashboardGreeting() {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";
  const [addOpen, setAddOpen] = useState(false);
  // The hour is the viewer's local one, so it is read after mount: rendering
  // it on the server would greet in the server's timezone and mismatch.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(new Date().getHours());
  }, []);

  return (
    // Greeting left, actions right. The panel's top bar already names the
    // page (its <h1>); the KPI card carries the numbers.
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="heading-lg min-h-7 text-(--text)">
        {hour !== null &&
          `${salutation(hour)}${firstName ? `, ${firstName}` : ""}`}
      </h2>
      <ButtonGroup>
        <Button url="/admin/master-sheet">Export</Button>
        <span id="tour-add-vehicle" className="inline-flex">
          <Button
            variant="primary"
            icon="PlusMinor"
            onClick={() => setAddOpen(true)}
          >
            Add vehicle
          </Button>
        </span>
      </ButtonGroup>
      <AddVehicleModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
