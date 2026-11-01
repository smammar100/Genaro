"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { companyLocationService } from "@/lib/services/company-location-service";
import { VEHICLE_LOCATIONS, VEHICLE_LOCATION_LABELS, type CompanyLocation } from "@/lib/types";
import { liveLocations } from "@/lib/locations";
import {
  Badge,
  Button,
  Card,
  Layout,
  SkeletonBodyText,
  TextField,
  useConfirm,
} from "@/components/genaro";
import { CommitTextField } from "@/components/admin/commit-text-field";
import { toast } from "@/lib/toast";

const DESCRIPTION =
  "Where your cars can be, beside the built-in places: a second yard, another showroom, a unit down the road. Your places show as tabs on All vehicles and as destinations when you move a car. A place can only be removed once no car is there; its name stays in the cars' history.";

/**
 * Settings > Locations (call 2026-10-31): the company's own places for its
 * cars. The built-in ones carry rules (a garage needs a workshop, staff a
 * person), so they are listed but fixed; the company's own are plain places
 * it can add, rename and remove.
 */
export function LocationSettings() {
  const { company } = useAuth();
  const [places, setPlaces] = useState<CompanyLocation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    if (!company) return;
    void companyLocationService
      .getAll(company.id)
      .then(setPlaces)
      .catch(() => setPlaces([]));
  }, [company]);

  async function run(work: () => Promise<void>, success: string) {
    if (!company) return;
    setBusy(true);
    try {
      await work();
      setPlaces(await companyLocationService.getAll(company.id));
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
    <Layout>
      <Layout.AnnotatedSection title="Locations" description={DESCRIPTION}>
        <Card padding="0">
          {places === null ? (
            <div className="p-4">
              <SkeletonBodyText lines={5} />
            </div>
          ) : (
            <ul className="divide-y divide-(--border-secondary)">
              {VEHICLE_LOCATIONS.map((loc) => (
                <li key={loc} className="flex min-h-12 items-center gap-2 px-4 py-2">
                  <span className="body-md min-w-0 flex-1">{VEHICLE_LOCATION_LABELS[loc]}</span>
                  <Badge>Built in</Badge>
                </li>
              ))}
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
      </Layout.AnnotatedSection>
      {confirmDialog}
    </Layout>
  );
}
