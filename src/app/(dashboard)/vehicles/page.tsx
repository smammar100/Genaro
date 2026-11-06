"use client";

import { useState } from "react";
import { Button, Page } from "@/components/genaro";
import { VehicleIndex } from "@/components/vehicles/vehicle-index";
import { AddVehicleModal } from "@/components/vehicles/add-vehicle-modal";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * All vehicles — a Genaro index page: a link to the Master sheet and the cars still in the
 * business as one dense table (docs/vehicles.md). Sold cars and cars returned to their owner live
 * on the master sheet. On a computer the sidebar's Add vehicle is the page's one primary action;
 * below lg the sidebar is a drawer, so the header brings Add vehicle back.
 */
export default function VehiclesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const { can, isSuperUser } = usePermissions();
  const canSeeMasterSheet = isSuperUser || can("admin:view_master_sheet");

  return (
    <Page
      fullWidth
      title="All vehicles"
      subtitle={
        canSeeMasterSheet
          ? "Every car still in the business, prep included. Sold and returned cars are on the master sheet."
          : "Every car still in the business, prep included."
      }
      secondaryActions={
        canSeeMasterSheet
          ? [{ content: "Master sheet", url: "/admin/master-sheet" }]
          : undefined
      }
      controls={
        <span className="lg:hidden">
          <Button variant="primary" icon="PlusMinor" onClick={() => setAddOpen(true)}>
            Add vehicle
          </Button>
        </span>
      }
    >
      <VehicleIndex onAddVehicle={() => setAddOpen(true)} />
      <AddVehicleModal open={addOpen} onOpenChange={setAddOpen} />
    </Page>
  );
}
