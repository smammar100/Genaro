"use client";

import { useId, useState } from "react";
import { toast } from "@/lib/toast";
import { useAutoFocus } from "@/hooks/use-auto-focus";
import { Button, Select, TextField } from "@/components/polaris";
// Stays on the app Dialog: it opens on top of the external-invoice form,
// which is itself an app Dialog, so it has to share that overlay stack.
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { vendorService } from "@/lib/services/vendor-service";
import type { UUID, Vendor, VendorSpeciality } from "@/lib/types";

interface Props {
  companyId: UUID;
  onCreated: (vendor: Vendor) => void;
  className?: string;
  /**
   * F-D4 — caller passes its current vendor list so we can short-circuit
   * the round-trip when the user retypes an existing name. Optional —
   * the DB unique index is the authoritative guard.
   */
  existingVendors?: Vendor[];
}

/** Display labels for vendor specialities (sentence case; MOT stays upper). */
export const SPECIALITY_LABELS: Record<VendorSpeciality, string> = {
  mechanical: "Mechanical",
  bodywork: "Bodywork",
  tyres: "Tyres",
  electrical: "Electrical",
  mot: "MOT",
  general: "General",
};

const SPECIALITY_OPTIONS = (
  ["mechanical", "bodywork", "tyres", "electrical", "mot", "general"] as const
).map((value) => ({ value, label: SPECIALITY_LABELS[value] }));

/**
 * Spec v3.0 · Module D.6 — inline "Add new vendor" inside the
 * external-invoice form. Captures name (required) + speciality + phone,
 * then calls `onCreated(vendor)` so the parent can select it.
 */
export function VendorInlineAdd({
  companyId,
  onCreated,
  className,
  existingVendors,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [speciality, setSpeciality] = useState<string>("general");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  // Ids so each label actually focuses its control on click.
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const specialityId = `${baseId}-speciality`;
  const phoneId = `${baseId}-phone`;
  // Desktop-only focus on open — see useAutoFocus.
  const nameRef = useAutoFocus<HTMLInputElement>(open);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Vendor name is required");
      return;
    }
    // F-D4: client-side pre-check against the parent's known vendor list.
    // The DB unique index (vendors_unique_name_per_company) is the
    // authoritative guard, but a pre-check spares the round-trip and gives
    // a friendlier message when we can detect the collision locally.
    const lowerTrimmed = trimmed.toLowerCase();
    const dup = (existingVendors ?? []).find(
      (v) => v.name.trim().toLowerCase() === lowerTrimmed,
    );
    if (dup) {
      toast.error(`A vendor named "${dup.name}" already exists`);
      onCreated(dup);
      setName("");
      setPhone("");
      setSpeciality("general");
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const v = await vendorService.upsert({
        companyId,
        name: trimmed,
        phone: phone.trim(),
        speciality: speciality as Vendor["speciality"],
        active: true,
      });
      toast.success(`Added ${v.name}`);
      onCreated(v);
      // Reset + close
      setName("");
      setPhone("");
      setSpeciality("general");
      setOpen(false);
    } catch (err) {
      const obj = err as { message?: string; code?: string };
      // F-D4 — friendly message when the DB unique index rejects.
      // Postgres unique-violation SQLSTATE is 23505.
      const isUnique =
        obj?.code === "23505" ||
        /duplicate key|already exists|unique/i.test(obj?.message ?? "");
      toast.error(
        isUnique
          ? `A vendor named "${trimmed}" already exists`
          : (obj?.message ?? "Could not add vendor"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button icon="PlusMinor" className={className} onClick={() => setOpen(true)}>
        Add new vendor
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New vendor</DialogTitle>
          </DialogHeader>
          {/* A real <form> so Enter in any field submits via "Add vendor". */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <DialogPanel className="grid gap-4">
              <div
                // TextField doesn't forward a ref, so hand its <input> to the
                // auto-focus hook.
                ref={(el) => {
                  nameRef.current = el?.querySelector("input") ?? null;
                }}
              >
                <TextField
                  id={nameId}
                  label="Name"
                  requiredIndicator
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Ali's Garage"
                />
              </div>
              <Select
                id={specialityId}
                label="Speciality"
                options={SPECIALITY_OPTIONS}
                value={speciality}
                onChange={setSpeciality}
              />
              <TextField
                id={phoneId}
                label="Phone (optional)"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={setPhone}
                placeholder="02085711234"
              />
            </DialogPanel>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" submit loading={saving}>
                Add vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
