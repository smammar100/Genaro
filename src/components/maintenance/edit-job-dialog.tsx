"use client";

import { useEffect, useId, useState } from "react";
import {
  Labelled,
  Modal,
  Select,
  TextField,
} from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { RegPlate } from "@/components/shared/reg-plate";
import { useAuth } from "@/contexts/auth-context";
import { maintenanceService } from "@/lib/services/maintenance-service";
import { MAINTENANCE_STATUSES } from "@/lib/constants";
import type {
  MaintenanceJob,
  MaintenanceStatus,
  User,
  Vehicle,
  Vendor,
} from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { JobStatusBadge, jobStatusLabel } from "./job-status";

interface EditJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MaintenanceJob | null;
  vehicle: Vehicle | null;
  vendors: Vendor[];
  users: User[];
  onSaved: () => void;
}

export function EditJobDialog({
  open,
  onOpenChange,
  job,
  vehicle,
  vendors,
  users,
  onSaved,
}: EditJobDialogProps) {
  const dueDateId = useId();
  const { user } = useAuth();
  const [status, setStatus] = useState<MaintenanceStatus>("pending");
  const [assignedTo, setAssignedTo] = useState("none");
  const [vendorId, setVendorId] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed the form whenever a job opens.
  useEffect(() => {
    if (!open || !job) return;
    setStatus(job.status);
    setAssignedTo(job.assignedTo ?? "none");
    setVendorId(job.vendorId ?? "none");
    setDueDate(job.dueDate ?? "");
    setEstimatedCost(job.estimatedCost != null ? String(job.estimatedCost) : "");
    setActualCost(job.actualCost != null ? String(job.actualCost) : "");
    setDescription(job.description ?? "");
  }, [open, job]);

  if (!job) return null;

  async function handleSave() {
    if (!user || !job) return;
    if (!description.trim()) {
      toast.error("Add a work description");
      return;
    }
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    setSaving(true);
    try {
      if (status !== job.status) {
        await maintenanceService.updateStatus(job.id, status, user.id);
      }
      await maintenanceService.update(
        job.id,
        {
          description: description.trim(),
          assignedTo: assignedTo === "none" ? null : assignedTo,
          vendorId: vendorId === "none" ? null : vendorId,
          dueDate: dueDate || null,
          estimatedCost: num(estimatedCost),
          actualCost: num(actualCost),
        },
        user.id,
      );
      toast.success("Job updated");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Edit job"
      primaryAction={{
        content: "Save",
        loading: saving,
        onAction: () => void handleSave(),
      }}
      secondaryActions={[
        { content: "Cancel", onAction: () => onOpenChange(false) },
      ]}
    >
      <div className="flex flex-col gap-4">
        {/* Plate + job + live status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {vehicle ? (
              <RegPlate registration={vehicle.registration} size="lg" />
            ) : null}
            <div className="min-w-0">
              <p className="heading-sm truncate">
                {description || "Maintenance job"}
              </p>
              <p className="body-sm truncate text-(--text-secondary)">
                Job #{job.id.slice(0, 6).toUpperCase()}
                {vehicle ? ` · ${vehicle.make} ${vehicle.model}` : ""}
              </p>
            </div>
          </div>
          <JobStatusBadge status={status} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Status"
            options={MAINTENANCE_STATUSES.map((s) => ({
              label: jobStatusLabel(s.value),
              value: s.value,
            }))}
            value={status}
            onChange={(v) => setStatus(v as MaintenanceStatus)}
          />
          <Select
            label="Owner"
            options={[
              { label: "Unassigned", value: "none" },
              ...users.map((u) => ({
                label: `${u.name} (${getInitials(u.name)})`,
                value: u.id,
              })),
            ]}
            value={assignedTo}
            onChange={setAssignedTo}
          />
          <Select
            label="Vendor"
            options={[
              { label: "No vendor", value: "none" },
              ...vendors.map((vd) => ({ label: vd.name, value: vd.id })),
            ]}
            value={vendorId}
            onChange={setVendorId}
          />
          {/* Polaris TextField has no date type; the app's date input keeps
              the native picker. */}
          <Labelled id={dueDateId} label="Due date">
            <Input
              id={dueDateId}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Labelled>
          <TextField
            label="Estimated cost"
            type="number"
            prefix="£"
            step={0.01}
            inputMode="decimal"
            placeholder="0.00"
            value={estimatedCost}
            onChange={setEstimatedCost}
          />
          <TextField
            label="Actual cost"
            type="number"
            prefix="£"
            step={0.01}
            inputMode="decimal"
            placeholder="0.00"
            value={actualCost}
            onChange={setActualCost}
          />
        </div>

        <TextField
          label="Description"
          multiline={3}
          placeholder="Describe the work…"
          value={description}
          onChange={setDescription}
        />
      </div>
    </Modal>
  );
}
