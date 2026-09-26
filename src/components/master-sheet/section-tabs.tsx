"use client";

import { Tabs } from "@/components/polaris";

/**
 * One tab per section of the client's sheet, each badged with its column
 * count. "All" (`null`) shows every column; a section keeps the pinned
 * identity columns and narrows the rest to its own.
 */
export function SectionTabs({
  sections,
  counts,
  value,
  onChange,
}: {
  sections: { value: string; label: string }[];
  /** Columns per section id, plus `all` for the whole sheet. */
  counts: Record<string, number>;
  /** The selected section, or null for "All". */
  value: string | null;
  onChange: (section: string | null) => void;
}) {
  const tabs = [{ value: null, label: "All" }, ...sections];
  const selected = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );
  return (
    <Tabs
      tabs={tabs.map((t) => ({
        id: t.value ?? "all",
        content: t.label,
        badge: counts[t.value ?? "all"] ?? 0,
      }))}
      selected={selected}
      onSelect={(index) => onChange(tabs[index]?.value ?? null)}
    />
  );
}
