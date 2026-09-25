"use client";

import { useState } from "react";
import { TextField } from "@/components/polaris";
import { cn } from "@/lib/utils";

/**
 * Inline text field that commits on blur/Enter so it isn't a write per
 * keystroke; Escape restores the stored value. Polaris TextField has no
 * blur/key handlers, so they sit on the wrapper (focus events bubble in React).
 */
export function CommitTextField({
  value,
  label,
  disabled,
  placeholder,
  className,
  onCommit,
}: {
  value: string;
  label: string;
  disabled: boolean;
  placeholder?: string;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [stored, setStored] = useState(value);
  if (stored !== value) {
    setStored(value);
    setDraft(value);
  }

  return (
    <div
      className={cn("min-w-0 flex-1", className)}
      onBlur={() => {
        const next = draft.trim();
        if (!next) {
          setDraft(value);
          return;
        }
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLElement).blur();
        if (e.key === "Escape") setDraft(value);
      }}
    >
      <TextField
        label={label}
        labelHidden
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        onChange={setDraft}
      />
    </div>
  );
}
