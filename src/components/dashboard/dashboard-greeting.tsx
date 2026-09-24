"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddVehicleButton } from "@/components/vehicles/add-vehicle-button";

/** Shared class for the two header actions (same size, different weight). */
const ACTION_BTN = "gap-1.5 [&_svg]:mx-0";

export function DashboardGreeting() {
  return (
    // Compact actions row. The panel's top bar already names the page and
    // the rail names the company; the KPI strip carries the numbers.
    <div className="flex flex-wrap items-center justify-end gap-4">
      <div className="flex shrink-0 gap-2">
        <Button asChild className={ACTION_BTN} size="sm" variant="outline">
          <Link href="/admin/master-sheet">
            <Download className="size-3.5" />
            Export
          </Link>
        </Button>
        {/* asChild puts this on the same Base UI path the Export link already
            takes. Without it this renders a <nord-button>, whose height and
            radius come from Nord's shadow DOM — which is why the two stood at
            31px/6px beside a 28px/8px link.

            asChild rather than `render`: the render prop drops children (see
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
