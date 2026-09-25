"use client";
import { variantLabel } from "@/lib/vehicle-variant";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Camera,
  ClipboardList,
  EyeOff,
  Megaphone,
  PoundSterling,
  Undo2,
  Users,
  Wrench,
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
import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceList, ResourceListItem } from "@/components/ui/resource-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { formatDate, titleCase } from "@/lib/utils";

interface VehicleHeaderCardProps {
  vehicle: Vehicle;
  onStatusChange: (status: VehicleStatus) => void;
  onRemoveFromWebsite: () => void;
  /** Jump to a detail tab (the primary CTA opens where the next work happens). */
  onNavigate: (tab: string) => void;
  /** Back arrow target (Shopify-style page header). */
  back?: { href: string; label: string };
}

/**
 * The vehicle's next logical step in the prep → sale lifecycle. The header's
 * primary CTA reflects the current stage and, when clicked, jumps to the tab
 * where that work is done — so the most useful destination is always one click
 * away. `null` = a terminal state (sold) with no outstanding step.
 */
const NEXT_STEP: Record<VehicleStatus, { label: string; tab: string; icon: LucideIcon } | null> = {
  received: { label: "Start Inspection", tab: "inspection", icon: ClipboardList },
  inspection_pending: { label: "Open Inspection", tab: "inspection", icon: ClipboardList },
  being_prepared: { label: "Prep & Repairs", tab: "todo", icon: Wrench },
  photos_pending: { label: "Add Photos", tab: "photos", icon: Camera },
  photos_ready: { label: "Build Advert", tab: "listing", icon: Megaphone },
  ready: { label: "Publish Listing", tab: "listing", icon: Megaphone },
  listed: { label: "View Enquiries", tab: "appointments", icon: Users },
  reserved: { label: "Complete Sale", tab: "financials", icon: PoundSterling },
  sold: null,
  returned: { label: "Re-prep Vehicle", tab: "todo", icon: Undo2 },
};

/**
 * Vehicle hero card. Reuses the app's existing shared components
 * (`RegPlate`, `VehicleStatusBadge`, `DaysInStockChip`, `VehicleImage`)
 * so styling stays consistent with `/vehicles` and the dashboard.
 *
 * Actions: a single state-aware primary CTA (advance the lifecycle) plus a
 * ⋯ menu for the genuine non-tab actions (Job Card PDF, remove from website).
 * The status pill is itself a dropdown to jump to any status directly.
 */
export function VehicleHeaderCard({
  vehicle,
  onStatusChange,
  onRemoveFromWebsite,
  onNavigate,
  back,
}: VehicleHeaderCardProps) {
  const nextStep = NEXT_STEP[vehicle.status];
  const canRemoveFromWebsite =
    vehicle.status === "sold" && vehicle.removedFromWebsiteAt === null;

  const heroUrl = useHeroUrl(vehicle);
  const meta = [
    variantLabel(vehicle, ""),
    vehicle.stockId,
    vehicle.mileage ? `${vehicle.mileage.toLocaleString("en-GB")} mi` : "",
    vehicle.fuelType ? titleCase(String(vehicle.fuelType)) : "",
    vehicle.transmission ? titleCase(String(vehicle.transmission)) : "",
    vehicle.colour ? titleCase(vehicle.colour.toLowerCase()) : "",
  ].filter(Boolean);

  // Photo + plate + title + key facts in one card (the layout the team knew),
  // restyled Shopify-fashion; actions sit top-right.
  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-0">
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        {back && (
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label={`Back to ${back.label}`}
            title={`Back to ${back.label}`}
          >
            <Link href={back.href}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {heroUrl ? (
          // A fixed 176x112 slot: next/image serves a 1x/2x rendition of that
          // size instead of the full-size original.
          <Image
            src={heroUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            width={176}
            height={112}
            unoptimized={!canOptimizeImage(heroUrl)}
            className="-outline-offset-1 h-28 w-44 shrink-0 rounded-lg object-cover outline-1 outline-black/10 dark:outline-white/10"
          />
        ) : (
          <VehicleImage
            vehicle={vehicle}
            variant="card"
            sizes="176px"
            className="h-28 w-44 shrink-0 rounded-lg"
          />
        )}
        <div className="flex min-w-0 flex-col items-start gap-1">
          <RegPlate registration={vehicle.registration} size="lg" />
          <h1 className="truncate text-xl font-semibold leading-7 text-foreground">
            {vehicle.year} {titleCase(`${vehicle.make} ${vehicle.model}`)}
          </h1>
          <p className="text-[13px] text-muted-foreground">{meta.join(" · ")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px]">
            <StatusMenu vehicle={vehicle} onStatusChange={onStatusChange} />
            <DaysInStockChip days={vehicle.daysInStock} />
            <span className="text-muted-foreground">
              Received {formatDate(vehicle.receivedDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canRemoveFromWebsite && (
          <Button size="sm" variant="outline" onClick={onRemoveFromWebsite}>
            <EyeOff className="mr-1.5 h-4 w-4" />
            Remove from Website
          </Button>
        )}
        {nextStep && (
          <Button size="sm" onClick={() => onNavigate(nextStep.tab)}>
            <nextStep.icon className="mr-1.5 h-4 w-4" />
            {nextStep.label}
          </Button>
        )}
      </div>
      </CardContent>
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

function StatusMenu({
  vehicle,
  onStatusChange,
}: {
  vehicle: Vehicle;
  onStatusChange: (status: VehicleStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="appearance-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Change status"
        >
          <VehicleStatusBadge status={vehicle.status} withChevron />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Change status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VEHICLE_STATUSES.map((s) => (
          <DropdownMenuItem key={s.value} onSelect={() => onStatusChange(s.value)}>
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Right-hand column: quick links into the detail tabs. The photo, plate and
 * identifiers live in the header card.
 */
export function VehicleSummaryAside({
  onNavigate,
}: {
  vehicle: Vehicle;
  /** Jump to a detail tab from the "Manage" list rows. */
  onNavigate?: (tab: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {onNavigate && (
        <Card size="sm" className="gap-3">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-semibold">Manage</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResourceList>
              <ResourceListItem
                icon={<Camera className="size-4" />}
                title="Photos"
                onClick={() => onNavigate("photos")}
              />
              <ResourceListItem
                icon={<Megaphone className="size-4" />}
                title="Listing"
                onClick={() => onNavigate("listing")}
              />
              <ResourceListItem
                icon={<PoundSterling className="size-4" />}
                title="Financials"
                onClick={() => onNavigate("financials")}
              />
              <ResourceListItem
                icon={<Wrench className="size-4" />}
                title="Things to do"
                onClick={() => onNavigate("todo")}
              />
            </ResourceList>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
