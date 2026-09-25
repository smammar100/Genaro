"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inspectionChecklistService } from "@/lib/services/inspection-checklist-service";
import type { InspectionChecklistItem } from "@/lib/types";
import {
  Button,
  Card,
  Layout,
  Modal,
  SkeletonBodyText,
  TextField,
} from "@/components/polaris";
import { CommitTextField } from "@/components/admin/commit-text-field";
import { toast } from "@/lib/toast";

const DESCRIPTION =
  "The points on the vehicle inspection, in order. Renaming an item or its status options is safe at any time; inspections already recorded keep what was answered.";

function parseStatusOptions(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Settings › Inspection Checklist (GEN-78).
 *
 * The 20-point inspection checklist used to be fixed in code. Add, rename,
 * reorder, edit the status options for, and remove points here — the live
 * Inspection Queue and per-vehicle inspection both read from this list, so
 * a change is visible on the next inspection started.
 *
 * Removing a point never touches inspections already recorded: each check
 * is a snapshot row with its own label and status, not a live join to this
 * table — it only stops that point appearing on inspections started
 * afterwards.
 */
export function InspectionChecklistSettings() {
  const { company, user } = useAuth();
  const [items, setItems] = useState<InspectionChecklistItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newOptions, setNewOptions] = useState("");
  const [removing, setRemoving] = useState<InspectionChecklistItem | null>(
    null,
  );

  useEffect(() => {
    if (!company) return;
    void inspectionChecklistService.getAll(company.id).then(setItems);
  }, [company]);

  async function reload() {
    if (!company) return;
    setItems(await inspectionChecklistService.getAll(company.id));
  }

  async function run(work: () => Promise<void>, success?: string) {
    setBusy(true);
    try {
      await work();
      await reload();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that change");
    } finally {
      setBusy(false);
    }
  }

  function handleRename(item: InspectionChecklistItem, label: string) {
    if (!user || label.trim() === item.item) return;
    void run(
      () =>
        inspectionChecklistService.update(item.id, { item: label }, user.id).then(),
      "Item renamed",
    );
  }

  function handleOptionsChange(item: InspectionChecklistItem, raw: string) {
    if (!user) return;
    const statusOptions = parseStatusOptions(raw);
    if (
      statusOptions.length === 0 ||
      statusOptions.join(",") === item.statusOptions.join(",")
    ) {
      return;
    }
    void run(
      () =>
        inspectionChecklistService
          .update(item.id, { statusOptions }, user.id)
          .then(),
      "Status options updated",
    );
  }

  function handleMove(index: number, delta: number) {
    if (!user || !company || !items) return;
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    // Optimistic: the checklist order is the whole point of this control.
    setItems(next);
    void run(
      () =>
        inspectionChecklistService.reorder(
          company.id,
          next.map((i) => i.id),
          user.id,
        ),
      "Order saved",
    );
  }

  function handleAdd() {
    if (!user || !company) return;
    const item = newItem.trim();
    if (!item) {
      toast.error("Item name is required");
      return;
    }
    const statusOptions = parseStatusOptions(newOptions);
    if (statusOptions.length === 0) {
      toast.error("Add at least one status option, comma-separated");
      return;
    }
    void run(async () => {
      await inspectionChecklistService.create(
        { companyId: company.id, item, statusOptions },
        user.id,
      );
      setNewItem("");
      setNewOptions("");
    }, "Item added");
  }

  function confirmRemoval() {
    if (!user || !removing) return;
    const item = removing;
    void run(async () => {
      await inspectionChecklistService.remove(item.id, user.id);
      setRemoving(null);
      toast.success(`"${item.item}" removed`);
    });
  }

  if (!items) {
    return (
      <Layout>
        <Layout.AnnotatedSection title="Inspection checklist" description={DESCRIPTION}>
          <Card>
            <SkeletonBodyText lines={6} />
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    );
  }

  return (
    <Layout>
      <Layout.AnnotatedSection title="Inspection checklist" description={DESCRIPTION}>
        <Card padding="0">
          <ul className="divide-y divide-(--border-secondary)">
            {items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex shrink-0 flex-col">
                  <Button
                    variant="tertiary"
                    size="micro"
                    icon="ChevronUpMinor"
                    accessibilityLabel={`Move ${item.item} earlier`}
                    disabled={i === 0 || busy}
                    onClick={() => handleMove(i, -1)}
                  />
                  <Button
                    variant="tertiary"
                    size="micro"
                    icon="ChevronDownMinor"
                    accessibilityLabel={`Move ${item.item} later`}
                    disabled={i === items.length - 1 || busy}
                    onClick={() => handleMove(i, 1)}
                  />
                </span>

                <span className="w-6 shrink-0 text-xs tabular-nums text-(--text-secondary)">
                  {i + 1}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <CommitTextField
                    value={item.item}
                    label={`Rename ${item.item}`}
                    disabled={busy}
                    onCommit={(v) => handleRename(item, v)}
                  />
                  <CommitTextField
                    value={item.statusOptions.join(", ")}
                    label={`Status options for ${item.item}`}
                    disabled={busy}
                    placeholder="Comma-separated status options"
                    onCommit={(v) => handleOptionsChange(item, v)}
                  />
                </div>

                <Button
                  variant="tertiary"
                  tone="critical"
                  size="micro"
                  icon="DeleteMinor"
                  accessibilityLabel={`Remove ${item.item}`}
                  disabled={busy}
                  onClick={() => setRemoving(item)}
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-(--border-secondary) p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <TextField
                id="new-item"
                label="New item"
                value={newItem}
                onChange={setNewItem}
                placeholder="e.g. Boot seal condition"
              />
              {/* Enter adds: TextField has no key handler, so listen on the wrapper. */}
              <div
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              >
                <TextField
                  id="new-options"
                  label="Status options"
                  value={newOptions}
                  onChange={setNewOptions}
                  placeholder="e.g. Good, Fair, Poor"
                />
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-(--text-secondary)">
                Comma-separated, in the order they should appear in the status
                dropdown on the inspection.
              </p>
              <Button icon="PlusMinor" disabled={busy} onClick={handleAdd}>
                Add item
              </Button>
            </div>
          </div>
        </Card>

        <Modal
          open={removing !== null}
          onClose={() => setRemoving(null)}
          size="small"
          title={`Remove “${removing?.item ?? ""}”?`}
          primaryAction={{
            content: "Remove item",
            destructive: true,
            loading: busy,
            onAction: confirmRemoval,
          }}
          secondaryActions={[{ content: "Cancel", onAction: () => setRemoving(null) }]}
        >
          <p className="text-sm text-(--text)">
            It will no longer appear on inspections started after this.
            Inspections already recorded keep whatever was answered for this
            point.
          </p>
        </Modal>
      </Layout.AnnotatedSection>
    </Layout>
  );
}
