"use client";

import { useEffect, useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import { Button, Card, SkeletonBodyText } from "@/components/polaris";
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
  onViewHistory?: () => void;
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
 * Vehicle Detail right-column card showing physical location state and
 * the 3 most recent movements. Mirrors the ASCII mockup in
 * `Module_A_Vehicle_Locations.md`. Move + history actions are wired by
 * the parent (it owns the MoveDialog state).
 */
export function LocationCard({
  vehicle,
  recentMovements,
  vendorNames = {},
  staffNames = {},
  onMove,
  onViewHistory,
}: LocationCardProps) {
  const [movements, setMovements] = useState<LocationMovement[] | null>(
    recentMovements ?? null,
  );

  useEffect(() => {
    if (recentMovements) {
      setMovements(recentMovements);
      return;
    }
    let cancelled = false;
    locationService
      .getRecentMovements(vehicle.id, 3)
      .then((rows) => {
        if (!cancelled) setMovements(rows);
      })
      .catch(() => {
        if (!cancelled) setMovements([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicle.id, recentMovements]);

  const days = daysSince(vehicle.locationSince);
  return (
    <Card title="Location">
      <div className="flex flex-col gap-1">
        <div className="body-md text-(--text)">
          Currently at:{" "}
          <span className="font-semibold">
            {VEHICLE_LOCATION_LABELS[vehicle.currentLocation]}
          </span>
        </div>
        <div className="body-sm text-(--text-secondary)">
          Since {shortDate(vehicle.locationSince)} · {days} day{days === 1 ? "" : "s"}
          {vehicle.outForTestDrive ? " · out for test drive" : ""}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <div className="body-sm font-semibold text-(--text-secondary)">
          Recent moves
        </div>
        {movements === null ? (
          <SkeletonBodyText lines={3} />
        ) : movements.length === 0 ? (
          <div className="body-sm text-(--text-secondary)">
            No movements yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {movements.map((m) => (
              <li key={m.id} className="body-sm flex items-baseline gap-2 text-(--text)">
                <span className="tabular-nums text-(--text-secondary)">
                  {shortDate(m.createdAt)}
                </span>
                <span>{describeMovement(m, vendorNames, staffNames)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onViewHistory || onMove ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onViewHistory ? (
            <Button variant="tertiary" icon={<HistoryIcon />} onClick={onViewHistory}>
              View full history
            </Button>
          ) : null}
          {onMove ? (
            <div className="ml-auto">
              <Button icon="ArrowRightMinor" onClick={onMove}>
                Move vehicle
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
