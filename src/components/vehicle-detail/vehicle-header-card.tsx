"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, Megaphone, PoundSterling, Wrench } from "lucide-react";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import {
  VehicleImage,
  canOptimizeImage,
} from "@/components/shared/vehicle-image";
import { vehiclePhotoService } from "@/lib/services/vehicle-photo-service";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { ActionList, Card, Popover } from "@/components/polaris";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { variantLabel } from "@/lib/vehicle-variant";
import { formatDate, titleCase } from "@/lib/utils";

/**
 * The vehicle's next logical step in the prep → sale lifecycle. The page's
 * primary action reflects the current stage and, when clicked, jumps to the
 * tab where that work is done — so the most useful destination is always one
 * click away. `null` = a terminal state (sold) with no outstanding step.
 */
export const NEXT_STEP: Record<VehicleStatus, { label: string; tab: string } | null> = {
  received: { label: "Start inspection", tab: "inspection" },
  inspection_pending: { label: "Open inspection", tab: "inspection" },
  being_prepared: { label: "Prep and repairs", tab: "todo" },
  photos_pending: { label: "Add photos", tab: "photos" },
  photos_ready: { label: "Build advert", tab: "listing" },
  ready: { label: "Publish listing", tab: "listing" },
  listed: { label: "View enquiries", tab: "appointments" },
  reserved: { label: "Complete sale", tab: "financials" },
  sold: null,
  returned: { label: "Re-prep vehicle", tab: "todo" },
};

/** The page title: model year plus make and model. */
export function vehicleTitle(vehicle: Vehicle): string {
  return `${vehicle.year} ${titleCase(`${vehicle.make} ${vehicle.model}`)}`;
}

/**
 * Vehicle hero card — photo, plate and the key facts, the layout the team
 * knows, as the first card of the Polaris detail page. The page title,
 * status, back link and actions live in the Page header above it.
 */
export function VehicleHeaderCard({ vehicle }: { vehicle: Vehicle }) {
  const heroUrl = useHeroUrl(vehicle);
  const meta = [
    variantLabel(vehicle, ""),
    vehicle.stockId,
    vehicle.mileage ? `${vehicle.mileage.toLocaleString("en-GB")} mi` : "",
    vehicle.fuelType ? titleCase(String(vehicle.fuelType)) : "",
    vehicle.transmission ? titleCase(String(vehicle.transmission)) : "",
    vehicle.colour ? titleCase(vehicle.colour.toLowerCase()) : "",
  ].filter(Boolean);

  return (
    <Card>
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        {heroUrl ? (
          // A fixed 176x112 slot: next/image serves a 1x/2x rendition of that
          // size instead of the full-size original.
          <Image
            src={heroUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            width={176}
            height={112}
            unoptimized={!canOptimizeImage(heroUrl)}
            className="h-28 w-44 shrink-0 rounded-(--radius-200) bg-(--bg-surface-secondary) object-cover shadow-(--shadow-border-inset)"
          />
        ) : (
          <VehicleImage
            vehicle={vehicle}
            variant="card"
            sizes="176px"
            className="h-28 w-44 shrink-0 rounded-(--radius-200)"
          />
        )}
        <div className="flex min-w-0 flex-col items-start gap-1">
          <RegPlate registration={vehicle.registration} size="lg" />
          <p className="heading-sm mt-1 text-(--text)">
            {vehicleTitle(vehicle)}
          </p>
          {meta.length > 0 ? (
            <p className="body-md text-(--text-secondary)">{meta.join(" · ")}</p>
          ) : null}
          <p className="body-sm text-(--text-secondary)">
            Received {formatDate(vehicle.receivedDate)}
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * The cover photo: the chosen hero (vehicle.heroImageUrl, the same source the
 * Photos tab cover uses) so header and Photos tab never disagree; else the
 * first uploaded photo; else null (VehicleImage then shows its placeholder).
 */
function useHeroUrl(vehicle: Vehicle): string | null {
  const [firstPhotoUrl, setFirstPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    vehiclePhotoService
      .list(vehicle.id)
      .then((p) => active && setFirstPhotoUrl(p[0]?.url ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [vehicle.id]);
  return vehicle.heroImageUrl ?? firstPhotoUrl;
}

/**
 * The status badge beside the page title, which is also the control that
 * changes it: a Popover of every status (Polaris Popover + ActionList).
 */
export function VehicleStatusMenu({
  vehicle,
  onStatusChange,
}: {
  vehicle: Vehicle;
  onStatusChange: (status: VehicleStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      activator={
        <button
          type="button"
          className="appearance-none rounded-(--radius-200) outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)"
          aria-label="Change status"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <VehicleStatusBadge status={vehicle.status} withChevron />
        </button>
      }
    >
      <ActionList
        onActionAnyItem={() => setOpen(false)}
        sections={[
          {
            title: "Change status",
            items: VEHICLE_STATUSES.map((s) => ({
              content: s.label,
              active: s.value === vehicle.status,
              onAction: () => onStatusChange(s.value),
            })),
          },
        ]}
      />
    </Popover>
  );
}

/** Lucide glyphs are stroked; the Polaris icon slot fills by default. */
const LUCIDE = "fill-none";

/**
 * Sidebar (Layout oneThird) card: quick links into the detail tabs. The photo,
 * plate and identifiers live in the header card.
 */
export function VehicleSummaryAside({
  onNavigate,
}: {
  vehicle: Vehicle;
  /** Jump to a detail tab from the "Manage" list rows. */
  onNavigate?: (tab: string) => void;
}) {
  if (!onNavigate) return null;
  return (
    <Card title="Manage">
      <ActionList
        className="-mx-2"
        items={[
          {
            content: "Photos",
            icon: <Camera className={LUCIDE} />,
            suffix: "ChevronRightMinor",
            onAction: () => onNavigate("photos"),
          },
          {
            content: "Listing",
            icon: <Megaphone className={LUCIDE} />,
            suffix: "ChevronRightMinor",
            onAction: () => onNavigate("listing"),
          },
          {
            content: "Financials",
            icon: <PoundSterling className={LUCIDE} />,
            suffix: "ChevronRightMinor",
            onAction: () => onNavigate("financials"),
          },
          {
            content: "Things to do",
            icon: <Wrench className={LUCIDE} />,
            suffix: "ChevronRightMinor",
            onAction: () => onNavigate("todo"),
          },
        ]}
      />
    </Card>
  );
}
