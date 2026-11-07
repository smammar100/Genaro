"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { companyLocationService } from "@/lib/services/company-location-service";
import { VEHICLE_LOCATIONS, VEHICLE_LOCATION_LABELS, type BuiltInLocation, type CompanyLocation } from "@/lib/types";
import { liveLocations } from "@/lib/locations";
import {
  Badge,
  Button,
  Card,
  SkeletonBodyText,
  TextField,
  useConfirm,
} from "@/components/genaro";
import { CommitTextField } from "@/components/admin/commit-text-field";
import { toast } from "@/lib/toast";


/**
 * Settings > Locations (call 2026-10-31): where the company's cars can be.
 * The built-in places can be removed and restored (2026-11-07, 0066); the
 * company's own can also be added and renamed. A place with a car in it
 * can't be removed (the database refuses).
 */
export function LocationSettings() {
  const { company } = useAuth();
  const [places, setPlaces] = useState<CompanyLocation[] | null>(null);
  const [hidden, setHidden] = useState<BuiltInLocation[]>([]);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    if (!company) return;
    void companyLocationService
      .getAll(company.id)
      .then(setPlaces)
      .catch(() => setPlaces([]));
    void companyLocationService.getHidden(company.id).then(setHidden).catch(() => setHidden([]));
  }, [company]);

  async function run(work: () => Promise<void>, success: string) {
    if (!company) return;
    setBusy(true);
    try {
      await work();
      const [all, gone] = await Promise.all([
        companyLocationService.getAll(company.id),
        companyLocationService.getHidden(company.id),
      ]);
      setPlaces(all);
      setHidden(gone);
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that change");
    } finally {
      setBusy(false);
    }
  }

  const live = places ? liveLocations(places) : [];

  function handleAdd() {
    const label = newLabel.trim();
    if (!company || !label) return;
    void run(async () => {
      await companyLocationService.create(company.id, label, (places?.length ?? 0) + 1);
      setNewLabel("");
    }, `${label} added`);
  }

  function handleRename(place: CompanyLocation, label: string) {
    const next = label.trim();
    if (!next || next === place.label) return;
    void run(() => companyLocationService.rename(place.id, next), "Location renamed");
  }

  async function handleRemoveBuiltIn(loc: BuiltInLocation) {
    if (!company) return;
    const label = VEHICLE_LOCATION_LABELS[loc];
    const ok = await confirm({
      title: `Remove ${label}?`,
      description:
        "It stops appearing as a tab and as somewhere to move a car, from any screen. Cars that were there keep it in their history, and you can restore it here. A place with a car in it can't be removed.",
      confirmText: "Remove location",
      destructive: true,
    });
    if (ok) void run(() => companyLocationService.hide(company.id, loc), `${label} removed`);
  }

  function handleRestore(loc: BuiltInLocation) {
    if (!company) return;
    void run(() => companyLocationService.restore(company.id, loc), `${VEHICLE_LOCATION_LABELS[loc]} restored`);
  }

  async function handleRemove(place: CompanyLocation) {
    const ok = await confirm({
      title: `Remove ${place.label}?`,
      description:
        "It stops appearing as a tab and as somewhere to move a car. Cars that were there keep it in their history. A place with a car in it can't be removed.",
      confirmText: "Remove location",
      destructive: true,
    });
    if (ok) void run(() => companyLocationService.archive(place.id), `${place.label} removed`);
  }

  return (
    <div className="flex flex-col gap-4">
        <Card padding="0">
          {places === null ? (
            <div className="p-4">
              <SkeletonBodyText lines={5} />
            </div>
          ) : (
            <ul className="divide-y divide-(--border-secondary)">
              {VEHICLE_LOCATIONS.map((loc) => {
                const removed = hidden.includes(loc);
                const label = VEHICLE_LOCATION_LABELS[loc];
                return (
                  <li key={loc} className="flex min-h-12 items-center gap-2 px-4 py-2">
                    <span className={removed ? "body-md min-w-0 flex-1 text-(--text-secondary)" : "body-md min-w-0 flex-1"}>
                      {label}
                    </span>
                    {removed ? (
                      <>
                        <Badge>Removed</Badge>
                        <Button size="micro" disabled={busy} onClick={() => handleRestore(loc)} accessibilityLabel={`Restore ${label}`}>
                          Restore
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="micro"
                        tone="critical"
                        disabled={busy}
                        onClick={() => void handleRemoveBuiltIn(loc)}
                        accessibilityLabel={`Remove ${label}`}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                );
              })}
              {live.map((place) => (
                <li key={place.id} className="flex items-center gap-2 px-3 py-2">
                  <CommitTextField
                    value={place.label}
                    label={`Rename ${place.label}`}
                    disabled={busy}
                    onCommit={(label) => handleRename(place, label)}
                  />
                  <Button
                    size="micro"
                    tone="critical"
                    disabled={busy}
                    onClick={() => void handleRemove(place)}
                    accessibilityLabel={`Remove ${place.label}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2 border-t border-(--border-secondary) p-4">
            {/* Enter adds: TextField has no key handler, so listen on the wrapper. */}
            <div
              className="min-w-0 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            >
              <TextField
                label="Add a location"
                placeholder="Yard 2"
                value={newLabel}
                disabled={busy || places === null}
                onChange={setNewLabel}
                maxLength={40}
              />
            </div>
            <Button icon="PlusMinor" disabled={busy || !newLabel.trim()} onClick={handleAdd}>
              Add location
            </Button>
          </div>
        </Card>
      {confirmDialog}
    </div>
  );
}
