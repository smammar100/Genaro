"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sheet } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { InspectionChecklist } from "@/components/vehicles/inspection-checklist";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import type { Vehicle } from "@/lib/types";

interface Props {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional hook fired after the inspection is completed. Sheet closes automatically. */
  onComplete?: () => void;
}

/**
 * v4.1 §11.5 / Gap 4 — inspection opens as a right-side `Sheet`, not a route.
 * Wraps the existing `InspectionChecklist` so its lifecycle stays the same.
 */
export function InspectionSidePanel({ vehicle, open, onOpenChange, onComplete }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  // Keep the last vehicle on screen while the sheet slides out.
  const [shown, setShown] = useState(vehicle);
  if (vehicle && vehicle !== shown) setShown(vehicle);

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      size="large"
      title={
        <span className="flex items-center gap-2">
          20-point inspection
          {shown ? <RegPlate registration={shown.registration} size="sm" /> : null}
        </span>
      }
      subtitle={
        shown
          ? `${shown.make} ${shown.model} · ${shown.stockId} · Inspector: ${user?.name ?? "—"}`
          : undefined
      }
      headerActions={
        shown
          ? [{ content: "Open vehicle", url: vehicleDetailHref(shown.id, pathname) }]
          : undefined
      }
    >
      {shown ? (
        <InspectionChecklist
          key={shown.id}
          vehicle={shown}
          inspector={user?.name ?? "—"}
          onComplete={() => {
            onOpenChange(false);
            onComplete?.();
          }}
        />
      ) : null}
    </Sheet>
  );
}
