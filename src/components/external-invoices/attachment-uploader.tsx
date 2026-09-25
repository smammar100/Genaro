"use client";

import { useState } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { Button, DropZone, Spinner } from "@/components/polaris";
import { cn } from "@/lib/utils";
import {
  externalInvoiceService,
  type AttachmentUploadResult,
} from "@/lib/services/external-invoice-service";
import type { UUID } from "@/lib/types";
import { toast } from "@/lib/toast";

interface Props {
  companyId: UUID;
  vehicleId: UUID | null;
  /** Current attachment metadata (null while none / before upload). */
  value: {
    path: string | null;
    filename: string | null;
    sizeBytes: number | null;
    mimeType: string | null;
  };
  onChange: (value: {
    path: string | null;
    filename: string | null;
    sizeBytes: number | null;
    mimeType: string | null;
  }) => void;
  disabled?: boolean;
  className?: string;
}

const ACCEPT = "image/jpeg,image/png,application/pdf";

function prettyBytes(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Spec v3.0 · Module D.4 — drag/drop or button-pick attachment slot (Polaris
 * DropZone; it drops files that don't match `ACCEPT`).
 * Allowed: JPG, PNG, PDF up to 10 MB. Uploads to the
 * `external-invoices` Supabase Storage bucket; stores the object path.
 *
 * Empty state (no vehicle picked yet) shows a disabled placeholder
 * because the storage path is keyed by vehicleId.
 */
export function AttachmentUploader({
  companyId,
  vehicleId,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!vehicleId) {
      toast.error("Pick a vehicle first; attachments are scoped to vehicles.");
      return;
    }
    setUploading(true);
    try {
      const result: AttachmentUploadResult =
        await externalInvoiceService.uploadAttachment(
          file,
          companyId,
          vehicleId,
        );
      onChange({
        path: result.path,
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        mimeType: result.mimeType,
      });
      toast.success("Attachment uploaded");
    } catch (err) {
      const obj = err as { message?: string };
      toast.error(obj?.message ?? "Upload failed, try again");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange({
      path: null,
      filename: null,
      sizeBytes: null,
      mimeType: null,
    });
  }

  const hasAttachment = !!value.path;
  const isImage = (value.mimeType ?? "").startsWith("image/");

  return (
    <div className={cn("space-y-2", className)}>
      {hasAttachment ? (
        <div className="flex items-center gap-3 rounded-(--radius-200) border border-(--border) bg-(--bg-surface) p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-(--radius-200) bg-(--bg-surface-secondary) text-(--icon-secondary)">
            {isImage ? (
              <ImageIcon className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{value.filename}</div>
            <div className="text-xs text-(--text-secondary)">
              {prettyBytes(value.sizeBytes)} · {value.mimeType}
            </div>
          </div>
          <Button
            variant="tertiary"
            icon="CancelMinor"
            accessibilityLabel="Remove attachment"
            onClick={handleRemove}
            disabled={disabled || uploading}
          />
        </div>
      ) : uploading ? (
        <div
          role="status"
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-(--radius-200) border border-dashed border-(--border) bg-(--bg-surface) text-sm text-(--text-secondary)"
        >
          <Spinner size="small" accessibilityLabel="Uploading attachment" />
          <span>Uploading…</span>
        </div>
      ) : (
        <DropZone
          accept={ACCEPT}
          allowMultiple={false}
          actionTitle="Add file"
          actionHint="Drag a file here, or click to choose. JPG, PNG or PDF, up to 10 MB."
          disabled={disabled}
          onDrop={(files) => {
            const f = files[0];
            if (f) {
              void handleFile(f);
            } else {
              toast.error("Choose a JPG, PNG or PDF file.");
            }
          }}
        />
      )}
    </div>
  );
}
