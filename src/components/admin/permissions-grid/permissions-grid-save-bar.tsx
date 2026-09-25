"use client";

import { ContextualSaveBar } from "@/components/polaris";

interface Props {
  changeCount: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function PermissionsGridSaveBar({
  changeCount,
  saving,
  onSave,
  onDiscard,
}: Props) {
  if (changeCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label={`${changeCount} unsaved permission changes`}
      className="sticky bottom-4 z-10 mx-auto w-full max-w-screen-2xl"
      data-testid="permissions-save-bar"
    >
      <ContextualSaveBar
        className="rounded-(--radius-300) shadow-(--shadow-600)"
        message={`${changeCount} unsaved change${changeCount === 1 ? "" : "s"}`}
        discardAction={{
          content: "Discard",
          // Discard is disabled while a save is in flight.
          onAction: () => {
            if (!saving) onDiscard();
          },
        }}
        saveAction={{ content: "Save changes", loading: saving, onAction: onSave }}
      />
    </div>
  );
}
