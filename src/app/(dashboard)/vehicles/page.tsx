"use client";

import { useState } from "react";
import { Page } from "@/components/polaris";
import { VehicleList } from "@/components/vehicles/vehicle-list";
import { AddVehicleModal } from "@/components/vehicles/add-vehicle-modal";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * All vehicles — a Polaris index page: the one primary action (Add vehicle,
 * which opens the reg + mileage dialog), a secondary link to the full Master
 * sheet, and the wide-row vehicle list.
 */
export default function VehiclesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const { can, isSuperUser } = usePermissions();
  const canSeeMasterSheet = isSuperUser || can("admin:view_master_sheet");

  return (
    <Page
      title="All vehicles"
      subtitle="Every car you have taken in, sold or unsold. Open one to manage it end to end."
      primaryAction={{ content: "Add vehicle", onAction: () => setAddOpen(true) }}
      secondaryActions={
        canSeeMasterSheet
          ? [{ content: "Master sheet", url: "/admin/master-sheet" }]
          : undefined
      }
    >
      <VehicleList onAddVehicle={() => setAddOpen(true)} />
      <AddVehicleModal open={addOpen} onOpenChange={setAddOpen} />
    </Page>
  );
}
