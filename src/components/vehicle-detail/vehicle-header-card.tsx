"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Cog,
  Fuel,
  Gauge,
  Hash,
  Palette,
  type LucideIcon,
} from "lucide-react";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import {
  VehicleImage,
  canOptimizeImage,
} from "@/components/shared/vehicle-image";
import { vehiclePhotoService } from "@/lib/services/vehicle-photo-service";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { ActionList, Button, Card, Popover } from "@/components/polaris";
import { VEHICLE_STATUS_CHOICES } from "@/lib/constants";
import { variantLabel } from "@/lib/vehicle-variant";
import { formatDate, titleCase } from "@/lib/utils";
import { PHOTOS_ENABLED } from "@/lib/phase-one";

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
  // With photos off (Phase 1) the step after prep is the advert.
  photos_pending: PHOTOS_ENABLED
    ? { label: "Add photos", tab: "photos" }
    : { label: "Build advert", tab: "listing" },
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
 * Vehicle hero card — the page's header (25 Oct 2026): back, the plate with
 * the status and days-in-stock badges beside it, the page's actions on the
 * right, then the vehicle's name (the page's h1) and its key facts. The Page
 * itself carries no header, so nothing repeats the name.
 */
export function VehicleHeaderCard({
  vehicle,
  back,
  badges,
  actions,
}: {
  vehicle: Vehicle;
  /** Where Back goes: the page the vehicle was opened from. */
  back: { href: string; label: string };
  /** Beside the plate: the status menu and days-in-stock chip. */
  badges?: ReactNode;
  /** Top right: the next step and any other page actions. */
  actions?: ReactNode;
}) {
  const heroUrl = useHeroUrl(vehicle);
  const variant = variantLabel(vehicle, "");
  // Each fact with its icon; the label is for screen readers, the icon says it
  // at a glance.
  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Hash, label: "Stock ID", value: vehicle.stockId },
    {
      icon: Gauge,
      label: "Mileage",
      value: vehicle.mileage ? `${vehicle.mileage.toLocaleString("en-GB")} mi` : "",
    },
    { icon: Fuel, label: "Fuel", value: vehicle.fuelType ? titleCase(String(vehicle.fuelType)) : "" },
    {
      icon: Cog,
      label: "Gearbox",
      value: vehicle.transmission ? titleCase(String(vehicle.transmission)) : "",
    },
    {
      icon: Palette,
      label: "Colour",
      value: vehicle.colour ? titleCase(vehicle.colour.toLowerCase()) : "",
    },
    { icon: CalendarDays, label: "Received", value: `Received ${formatDate(vehicle.receivedDate)}` },
  ].filter((f) => f.value);

  return (
    <Card>
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        {!PHOTOS_ENABLED ? null : heroUrl ? (
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
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              variant="tertiary"
              icon="ArrowLeftMinor"
              url={back.href}
              accessibilityLabel={`Back to ${back.label}`}
              title={`Back to ${back.label}`}
            />
            <RegPlate registration={vehicle.registration} size="lg" />
            {badges}
            {actions ? (
              <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </div>
          <h1 className="heading-lg mt-1 text-(--text)">
            {vehicleTitle(vehicle)}
          </h1>
          {variant ? (
            <p className="body-md text-(--text-secondary)">{variant}</p>
          ) : null}
          <ul className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {facts.map(({ icon: Icon, label, value }) => (
              <li
                key={label}
                title={label}
                className="flex items-center gap-1.5 body-md text-(--text-secondary)"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-(--icon-secondary)" />
                {label === "Received" ? null : <span className="sr-only">{label}: </span>}
                {value}
              </li>
            ))}
          </ul>
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
  // The photo list is only a fallback, so skip the request (the detail
  // shell already lists the same photos for its tab badge) when a cover is set.
  const hasCover = vehicle.heroImageUrl != null;
  useEffect(() => {
    if (hasCover || !PHOTOS_ENABLED) return;
    let active = true;
    vehiclePhotoService
      .list(vehicle.id)
      .then((p) => active && setFirstPhotoUrl(p[0]?.url ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [vehicle.id, hasCover]);
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
            items: VEHICLE_STATUS_CHOICES.map((s) => ({
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
