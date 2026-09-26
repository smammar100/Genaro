"use client";

import type * as React from "react";
import { Sparkles } from "lucide-react";
import { Badge, InlineError, Select, type SelectProps } from "@/components/polaris";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Option label for a lower-case enum value ("hatchback" → "Hatchback"). */
export function optionLabel(v: string) {
  if (v === "suv" || v === "mpv") return v.toUpperCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Red asterisk on an important field. A prompt, not a rule: nothing on this
 * form blocks saving (client, 18 Sep 2026).
 */
export function Important() {
  return (
    <span className="text-(--text-critical)" title="Important — fill in when you can">
      *
    </span>
  );
}

/** Marks a field that the DVLA / AutoTrader lookup filled in. */
export function FromDvla() {
  return (
    <Badge tone="info" icon={<Sparkles className="size-3" />}>
      From DVLA
    </Badge>
  );
}

/**
 * Label + registered input + the (typo-only) validation message. Inputs stay
 * the app's RHF-registered `Input` (refs, onBlur-driven validation, datalists,
 * date pickers); the label/help/error spacing mirrors Polaris' Labelled so
 * they line up with the Polaris Selects in the same grid. The "From DVLA"
 * badge sits beside the <label>, not in it, so the field's accessible name is
 * unchanged.
 */
export function Field({
  label,
  htmlFor,
  auto,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  /** Shows a "From DVLA" badge once the lookup matched. */
  auto?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex min-h-5 flex-wrap items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {auto ? <FromDvla /> : null}
      </div>
      {children}
      {error ? <InlineError message={error} /> : null}
    </div>
  );
}

/**
 * A Polaris Select that can carry the "From DVLA" badge. Select's label is
 * plain text, so when the badge shows, the visible label is drawn here and
 * the Select keeps its own (visually hidden) label as the accessible name.
 */
export function DvlaSelect({ auto, ...props }: SelectProps & { auto?: boolean }) {
  if (!auto) return <Select {...props} />;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-5 flex-wrap items-center gap-2" aria-hidden>
        <span className="body-md font-medium">{props.label}</span>
        <FromDvla />
      </div>
      <Select {...props} labelHidden />
    </div>
  );
}
