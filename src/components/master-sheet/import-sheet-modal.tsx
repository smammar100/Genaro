"use client";

import { useState } from "react";
import { Banner, DescriptionList, DropZone, Modal } from "@/components/genaro";
import { toast } from "@/lib/toast";

interface ImportSummary {
  rowsRead: number;
  mapped: number;
  newCars: number;
  updatedCars: number;
  inStock: number;
  sold: number;
  returnedToOwner: number;
  unregistered: number;
  skipped: Record<string, number>;
  mismatches: string[];
  mismatchCount: number;
  inserted?: number;
  updated?: number;
}

async function send(file: File, mode: "preview" | "apply"): Promise<ImportSummary> {
  const body = new FormData();
  body.set("file", file);
  body.set("mode", mode);
  const res = await fetch("/api/vehicle/import", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as ImportSummary & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "The upload didn't go through. Try again.");
  return json;
}

/**
 * Bulk upload of the master sheet (call 2026-10-31). Choosing the .xlsx reads
 * it and says what would happen (new cars, cars brought up to date, rows left
 * out) before anything is written; Import writes it. Cars are matched on their
 * legacy S/N, so uploading the same sheet twice changes nothing new.
 * @import import { ImportSheetModal } from "@/components/master-sheet/import-sheet-modal";
 */
export function ImportSheetModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after a successful import, so the sheet can reload. */
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"reading" | "importing" | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function pick(files: File[]) {
    const picked = files[0];
    if (!picked) return;
    setFile(picked);
    setPreview(null);
    setError(null);
    setBusy("reading");
    try {
      setPreview(await send(picked, "preview"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function importSheet() {
    if (!file || !preview) return;
    setBusy("importing");
    setError(null);
    try {
      const done = await send(file, "apply");
      toast.success(`Master sheet updated: ${done.inserted ?? 0} new cars, ${done.updated ?? 0} updated`);
      reset();
      onImported();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const skipped = preview ? Object.entries(preview.skipped) : [];
  const total = preview ? preview.newCars + preview.updatedCars : 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import master sheet"
      primaryAction={{
        content: total > 0 ? `Import ${total} cars` : "Import",
        onAction: () => void importSheet(),
        loading: busy === "importing",
        disabled: !preview || total === 0 || busy !== null,
      }}
      // Closing is ignored while an import runs (see close).
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div className="flex flex-col gap-4">
        <p className="body-md text-(--text-secondary)">
          Upload the master sheet as an Excel file in its usual layout (headers on row 4).
          New cars are added; cars already here, matched on Legacy S/N, are brought up to
          date. Nothing is saved until you import.
        </p>
        <DropZone
          label="Master sheet"
          accept=".xlsx"
          allowMultiple={false}
          actionTitle="Choose file"
          actionHint={file ? file.name : "Accepts .xlsx"}
          disabled={busy !== null}
          onDrop={(files) => void pick(files)}
        />
        {busy === "reading" ? (
          <p className="body-md text-(--text-secondary)">Reading {file?.name}…</p>
        ) : null}
        {error ? <Banner tone="critical">{error}</Banner> : null}
        {preview ? (
          <>
            <DescriptionList
              gap="tight"
              items={[
                { term: "Rows read", description: preview.rowsRead },
                { term: "New cars", description: preview.newCars },
                { term: "Cars brought up to date", description: preview.updatedCars },
                {
                  term: "Of these",
                  description: `${preview.inStock} in stock, ${preview.sold} sold, ${preview.returnedToOwner} returned to owner`,
                },
                ...(preview.unregistered > 0
                  ? [{ term: "No registration", description: preview.unregistered }]
                  : []),
                ...skipped.map(([reason, n]) => ({ term: `Left out: ${reason}`, description: n })),
              ]}
            />
            {preview.mismatchCount > 0 ? (
              <Banner tone="warning">
                {preview.mismatchCount} row{preview.mismatchCount === 1 ? "'s" : "s'"} total buying
                price differs from the sheet&apos;s own total; the app recalculates it from the cost
                columns. First: {preview.mismatches[0]}
              </Banner>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
