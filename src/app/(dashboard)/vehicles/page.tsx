"use client";

import { useState } from "react";
import { Page } from "@/components/polaris";
import { VehicleIndex } from "@/components/vehicles/vehicle-index";
import { AddVehicleModal } from "@/components/vehicles/add-vehicle-modal";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * All vehicles — a Polaris index page: the one primary action (Add vehicle,
 * which opens the reg + mileage dialog), a secondary link to the Master
 * sheet, and the cars still in the business as a table or cards. Sold cars
 * and cars returned to their owner live on the master sheet.
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
          ? "Every car still for sale, including those in inspection or prep. Sold cars and cars returned to their owner are on the master sheet."
          : "Every car still for sale, including those in inspection or prep."
      }
      primaryAction={{ content: "Add vehicle", onAction: () => setAddOpen(true) }}
      secondaryActions={
        canSeeMasterSheet
          ? [{ content: "Master sheet", url: "/admin/master-sheet" }]
          : undefined
      }
    >
      <VehicleIndex onAddVehicle={() => setAddOpen(true)} />
      <AddVehicleModal open={addOpen} onOpenChange={setAddOpen} />
    </Page>
  );
}
