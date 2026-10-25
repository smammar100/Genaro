"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { PrepCar } from "@/lib/services/prep-service";
import { Sheet } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { TodoTab } from "@/components/vehicle-detail/todo-tab";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { titleCase } from "@/lib/utils";

/**
 * One car's Things to do, in a side sheet — the same tab the vehicle page
 * shows, so there is exactly one implementation of the list (GEN-64).
 */
export function PrepTodoSheet({
  car,
  exporting,
  onClose,
  onExport,
  onChanged,
}: {
  car: PrepCar | null;
  exporting: boolean;
  onClose: () => void;
  onExport: (car: PrepCar) => void;
  onChanged: () => void;
}) {
  const pathname = usePathname();
  // Keep the last car on screen while the sheet slides out.
  const [shown, setShown] = useState(car);
  if (car && car !== shown) setShown(car);

  return (
    <Sheet
      open={car !== null}
      onClose={onClose}
      size="large"
      title={
        shown ? (
          <span className="flex flex-wrap items-center gap-2">
            <RegPlate registration={shown.vehicle.registration} size="sm" />
            <span>{titleCase(`${shown.vehicle.make} ${shown.vehicle.model}`)}</span>
          </span>
        ) : (
          "Things to do"
        )
      }
      headerActions={
        shown
          ? [
              {
                content: "Open vehicle",
                url: vehicleDetailHref(shown.vehicle.id, pathname),
              },
            ]
          : undefined
      }
    >
      {shown ? (
        <TodoTab
          key={shown.vehicle.id}
          vehicleId={shown.vehicle.id}
          onExportPdf={() => onExport(shown)}
          exporting={exporting}
          onChanged={onChanged}
        />
      ) : null}
    </Sheet>
  );
}
