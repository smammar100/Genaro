"use client";

import { useState } from "react";
import { Button, Page } from "@/components/genaro";
import { VehicleIndex, VehicleSearch } from "@/components/vehicles/vehicle-index";
import { AddVehicleModal } from "@/components/vehicles/add-vehicle-modal";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * All vehicles — a Genaro index page: the cars still in the business as one
 * dense table (docs/vehicles.md). Sold cars and cars returned to their owner
 * live on the master sheet (Administrative in the sidebar). The search is the
 * header's main control (call 2026-11-07). On a computer the sidebar's Add
 * vehicle is the page's one primary action; below lg the sidebar is a drawer,
 * so the header brings Add vehicle back.
 */
export default function VehiclesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
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
      controls={
        <>
          <div className="w-full sm:w-80">
            <VehicleSearch value={query} onChange={setQuery} />
          </div>
          <span className="lg:hidden">
            <Button variant="primary" icon="PlusMinor" onClick={() => setAddOpen(true)}>
              Add vehicle
            </Button>
          </span>
        </>
      }
    >
      <VehicleIndex onAddVehicle={() => setAddOpen(true)} query={query} onQueryChange={setQuery} />
      <AddVehicleModal open={addOpen} onOpenChange={setAddOpen} />
    </Page>
  );
}
