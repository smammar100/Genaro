"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Button, SkeletonBodyText } from "@/components/genaro";
import { BandedCard } from "@/components/vehicle-detail/banded-card";
import {
  VEHICLE_LOCATION_LABELS,
  type LocationMovement,
  type UUID,
  type Vehicle,
  type VehicleLocation,
} from "@/lib/types";
import { locationService } from "@/lib/services/location-service";

interface LocationCardProps {
  vehicle: Vehicle;
  /**
   * Pre-loaded recent movements. If omitted, the card lazily fetches the
   * last 3 via `locationService.getRecentMovements`. Pass when the parent
   * already has them to skip the network round-trip.
   */
  recentMovements?: LocationMovement[];
  /** Pre-resolved vendor names keyed by `vendorId`. */
  vendorNames?: Record<UUID, string>;
  /** Pre-resolved user names keyed by `userId`. */
  staffNames?: Record<UUID, string>;
  onMove?: () => void;
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function describeMovement(
  m: LocationMovement,
  vendorNames: Record<UUID, string>,
  staffNames: Record<UUID, string>,
): string {
  const fromLabel = m.fromLocation
    ? VEHICLE_LOCATION_LABELS[m.fromLocation as VehicleLocation]
    : "Arrival";
  const toLabel = VEHICLE_LOCATION_LABELS[m.toLocation];
  let context = "";
  if (m.toLocation === "garage" && m.externalVendorId) {
    const v = vendorNames[m.externalVendorId];
    if (v) context = ` (${v})`;
  } else if (m.toLocation === "staff" && m.staffUserId) {
    const s = staffNames[m.staffUserId];
    if (s) context = ` (${s})`;
  }
  return `${fromLabel} → ${toLabel}${context}`;
}

/**
 * Vehicle Detail Overview card showing physical location state and the 3
 * most recent movements, as a `BandedCard`: Move vehicle as a link in the
 * header, then where it is and since when, and its recent moves. The full history lives on the vehicle's Location tab.
 * The parent wires `onMove` (it owns the MoveDialog state); without it the
 * card is read-only.
 * @import import { LocationCard } from "@/components/locations/location-card";
 */
export function LocationCard({
  vehicle,
  recentMovements,
  vendorNames = {},
  staffNames = {},
  onMove,
}: LocationCardProps) {
  const [fetched, setFetched] = useState<LocationMovement[] | null>(null);

  useEffect(() => {
    if (recentMovements) return;
    let cancelled = false;
    locationService
      .getRecentMovements(vehicle.id, 3)
      .then((rows) => {
        if (!cancelled) setFetched(rows);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicle.id, recentMovements]);

  const movements = recentMovements ?? fetched;

  const days = daysSince(vehicle.locationSince);
  const place = VEHICLE_LOCATION_LABELS[vehicle.currentLocation];
  const dayCount = `${days} day${days === 1 ? "" : "s"}`;
  return (
    <BandedCard
      icon={MapPin}
      title="Location"
      actions={
        onMove ? (
          <Button variant="plain" icon="ArrowRightMinor" onClick={onMove}>
            Move vehicle
          </Button>
        ) : undefined
      }
    >
      <div className="flex items-start justify-between gap-4">
        <span className="shrink-0 body-md text-(--text-secondary)">Currently at</span>
        <span className="flex min-w-0 flex-col items-end text-right">
          <span className="body-md font-semibold text-(--text)">{place}</span>
          <span className="body-sm text-(--text-secondary)">
            Since {shortDate(vehicle.locationSince)} · {dayCount}
            {vehicle.outForTestDrive ? " · out for test drive" : ""}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-(--border-secondary) pt-2.5">
        <span className="body-sm text-(--text-secondary)">Recent moves</span>
        {movements === null ? (
          <SkeletonBodyText lines={3} />
        ) : movements.length === 0 ? (
          <span className="body-md text-(--text-secondary)">No movements yet.</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {movements.map((m) => (
              <li key={m.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 body-md text-(--text)">
                <span className="tabular-nums text-(--text-secondary)">
                  {shortDate(m.createdAt)}
                </span>
                <span>{describeMovement(m, vendorNames, staffNames)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BandedCard>
  );
}
