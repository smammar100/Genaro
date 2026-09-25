"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PrepCar } from "@/lib/services/prep-service";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  return (
    <Sheet open={car !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {car ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                <RegPlate registration={car.vehicle.registration} size="sm" />
                <span>{titleCase(`${car.vehicle.make} ${car.vehicle.model}`)}</span>
              </SheetTitle>
              <SheetDescription>
                <Link
                  href={vehicleDetailHref(car.vehicle.id, pathname)}
                  className="text-(--text-link) underline underline-offset-2"
                >
                  Open the full vehicle record
                </Link>
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <TodoTab
                vehicleId={car.vehicle.id}
                onExportPdf={() => onExport(car)}
                exporting={exporting}
                onChanged={onChanged}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
