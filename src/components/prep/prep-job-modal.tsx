"use client";

import { useRef, useState } from "react";
import { Modal, Select, TextField } from "@/components/genaro";
import { parseNumeric } from "@/lib/field-edit";
import type { TodoItem, TodoStatus, Vendor } from "@/lib/types";

export interface PrepJobInput {
  description: string;
  vendorId: string | null;
  cost: number | null;
  status: TodoStatus;
}

const JOB_STATUS_LABEL: Record<TodoStatus, string> = {
  pending: "Not started",
  in_progress: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};

/**
 * Add or edit one prep job: what needs doing, which garage, what it costs
 * and, when editing, where it stands. Mount it when it opens so it starts
 * from the job; it closes as soon as the job is saved.
 */
export function PrepJobModal({
  job,
  vendors,
  onClose,
  onSave,
}: {
  /** The job to edit, or `null` to add one. */
  job: TodoItem | null;
  vendors: Vendor[];
  onClose: () => void;
  onSave: (input: PrepJobInput) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState(job?.description ?? "");
  const [vendorId, setVendorId] = useState(job?.vendorId ?? "");
  const [cost, setCost] = useState(job?.cost != null ? String(job.cost) : "");
  const [status, setStatus] = useState<TodoStatus>(job?.status ?? "pending");
  const [errors, setErrors] = useState<{ description?: string; cost?: string }>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // An unparseable cost is a typo, not an instruction to clear it (GEN-105).
    const parsed = parseNumeric(cost);
    const next = {
      description: description.trim() ? undefined : "Say what needs doing",
      cost: parsed === undefined ? "Enter an amount like 125.50" : undefined,
    };
    setErrors(next);
    if (next.description || next.cost) return;
    onSave({ description: description.trim(), vendorId: vendorId || null, cost: parsed ?? null, status });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={job ? "Edit job" : "Add job"}
      primaryAction={{ content: job ? "Save job" : "Add job", onAction: () => formRef.current?.requestSubmit() }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        // Save sits in the modal's footer, outside the form, so Enter in a
        // field submits here.
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.defaultPrevented && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            e.currentTarget.requestSubmit();
          }
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <TextField
            label="Job"
            value={description}
            onChange={setDescription}
            placeholder="What needs doing?"
            error={errors.description}
          />
        </div>
        <Select
          label="Garage"
          options={[{ label: "No garage", value: "" }, ...vendors.map((v) => ({ label: v.name, value: v.id }))]}
          value={vendorId}
          onChange={setVendorId}
        />
        <TextField
          label="Cost"
          prefix="£"
          inputMode="decimal"
          placeholder="0.00"
          value={cost}
          onChange={setCost}
          error={errors.cost}
        />
        {job ? (
          <Select
            label="Status"
            options={(Object.keys(JOB_STATUS_LABEL) as TodoStatus[]).map((s) => ({
              label: JOB_STATUS_LABEL[s],
              value: s,
            }))}
            value={status}
            onChange={(v) => setStatus(v as TodoStatus)}
          />
        ) : null}
      </form>
    </Modal>
  );
}
