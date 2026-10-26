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
import { ActionList, Button, Card, Popover } from "@/components/genaro";
import { VEHICLE_STATUS_CHOICES } from "@/lib/constants";
import { variantLabel } from "@/lib/vehicle-variant";
import { cn, formatDate, titleCase } from "@/lib/utils";
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

/** The lifecycle the progress line draws: every status but Returned, in order. */
const STAGES = VEHICLE_STATUS_CHOICES.filter((s) => s.value !== "returned");

/**
 * Vehicle hero card: the page's header, the "command header" picked from the
 * vehicle overview prototypes (26 Oct 2026). Back, the plate with the status
 * and days-in-stock badges beside it, the vehicle's name (the page's h1) with
 * its variant, and its key facts. A band along the bottom shows how far the
 * car is from arrival to sale, the next step with its open to-dos, and the
 * page's actions. The Page itself carries no header, so nothing repeats the
 * name.
 * @import import { VehicleHeaderCard } from "@/components/vehicle-detail/vehicle-header-card";
 */
export function VehicleHeaderCard({
  vehicle,
  back,
  badges,
  actions,
  todoCount,
  onOpenTodos,
}: {
  vehicle: Vehicle;
  /** Where Back goes: the page the vehicle was opened from. */
  back: { href: string; label: string };
  /** Beside the plate: the status menu and days-in-stock chip. */
  badges?: ReactNode;
  /** Bottom right, beside the next step: its button and any other page actions. */
  actions?: ReactNode;
  /** Open to-dos, linked under the next step. Null or omitted while unknown. */
  todoCount?: number | null;
  /** Opens the Things to do tab from the to-do link. */
  onOpenTodos?: () => void;
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

  const nextStep = NEXT_STEP[vehicle.status];

  return (
    <Card padding="0" className="@container">
      <div className="flex min-w-0 flex-wrap items-start gap-4 p-4">
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
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="heading-lg text-(--text)">{vehicleTitle(vehicle)}</h1>
            {variant ? (
              <p className="body-md text-(--text-secondary)">{variant}</p>
            ) : null}
          </div>
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

      <div className="grid items-center gap-x-8 gap-y-3 border-t border-(--border-secondary) px-4 py-3 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <VehicleProgress status={vehicle.status} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="body-md font-semibold text-(--text)">
              {nextStep ? `Next: ${nextStep.label.toLowerCase()}` : "Sold, nothing left to do"}
            </span>
            {todoCount ? (
              <span>
                <Button variant="plain" onClick={onOpenTodos}>
                  {`${todoCount} thing${todoCount === 1 ? "" : "s"} to do`}
                </Button>
              </span>
            ) : todoCount === 0 ? (
              <span className="body-md text-(--text-secondary)">No open jobs</span>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </Card>
  );
}

/**
 * How far the car is from arrival to sale: one segment per stage, done ones
 * green, the current one brand, with the stage named underneath. A returned
 * car sits outside the line, so it's all upcoming and labelled Returned.
 */
function VehicleProgress({ status }: { status: VehicleStatus }) {
  const current = STAGES.findIndex((s) => s.value === status);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <ol
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}
        aria-label="Progress to sale"
      >
        {STAGES.map((s, i) => {
          const done = current >= 0 && i < current;
          const here = i === current;
          return (
            <li key={s.value} aria-current={here ? "step" : undefined}>
              <span
                aria-hidden
                className={cn(
                  "block h-1.5 rounded-full",
                  done
                    ? "bg-(--bg-fill-success)"
                    : here
                      ? "bg-(--bg-fill-brand)"
                      : "bg-(--bg-fill-tertiary)",
                )}
              />
              <span className="sr-only">
                {s.label}
                {done ? " (done)" : here ? " (current)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="body-sm text-(--text-secondary)">
        {current >= 0
          ? `${STAGES[current].label} · stage ${current + 1} of ${STAGES.length}`
          : "Returned"}
      </span>
    </div>
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
 * changes it: a Popover of every status (Genaro Popover + ActionList).
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
