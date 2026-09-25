"use client";

import { Tabs } from "@/components/polaris";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Saved-view tabs for the warranty and claim pages — Polaris Tabs on their
 * own row under the page header, with each view's row count as the badge.
 */
export function FilterChips<T extends string>({
  options,
  activeValue,
  onChange,
  className,
}: FilterChipsProps<T>) {
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === activeValue),
  );
  return (
    <Tabs
      className={className}
      tabs={options.map((o) => ({
        id: o.value,
        content: o.label,
        badge: o.count,
      }))}
      selected={selected}
      onSelect={(i) => {
        const opt = options[i];
        if (opt) onChange(opt.value);
      }}
    />
  );
}
