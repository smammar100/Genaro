"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { AddVehicleButton } from "@/components/vehicles/add-vehicle-button";

/** Shared class for the two header actions (same size, different weight). */
const ACTION_BTN = "gap-1.5 [&_svg]:mx-0";

function salutation(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting() {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";
  // The hour is the viewer's local one, so it is read after mount: rendering
  // it on the server would greet in the server's timezone and mismatch.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(new Date().getHours());
  }, []);

  return (
    // Greeting left, actions right. The panel's top bar already names the
    // page; the KPI strip carries the numbers.
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="min-h-7 text-xl font-semibold leading-7 text-foreground">
        {hour !== null &&
          `${salutation(hour)}${firstName ? `, ${firstName}` : ""}`}
      </h2>
      <div className="flex shrink-0 gap-2">
        <Button asChild className={ACTION_BTN} size="sm" variant="outline">
          <Link href="/admin/master-sheet">
            <Download className="size-3.5" />
            Export
          </Link>
        </Button>
        {/* asChild rather than `render`: the render prop drops children (see
            resolveRender), so the label has to live inside the element. */}
        <AddVehicleButton asChild className={ACTION_BTN} size="sm">
          <button id="tour-add-vehicle" type="button">
            <Plus className="size-3.5" />
            Add Vehicle
          </button>
        </AddVehicleButton>
      </div>
    </div>
  );
}
