"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Tabs, Tag, TextField } from "@/components/polaris";
import {
  VEHICLE_FEATURES,
  FEATURE_CATEGORIES,
  type FeatureCategory,
} from "@/lib/vehicle-features";

interface FeaturePickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

/** Catalogue names grouped by category (static reference data). */
const CAT_ITEMS: Record<FeatureCategory, string[]> = FEATURE_CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat] = VEHICLE_FEATURES.filter((f) => f.category === cat).map(
      (f) => f.name,
    );
    return acc;
  },
  {} as Record<FeatureCategory, string[]>,
);

/**
 * Equipment picker for the Advert tool — one category at a time. A segmented
 * tab bar (with selected-count badges) switches between Comfort / Exterior /
 * Interior / Safety & Security / Other; each shows a searchable two-column
 * checklist with a Select-all-in-view shortcut. A running selected summary sits
 * below. Mirrors the AutoTrader "This car comes with…" taxonomy.
 */
export function FeaturePicker({ selected, onChange }: FeaturePickerProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<FeatureCategory>(FEATURE_CATEGORIES[0]);

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected],
  );
  const has = (name: string) => selectedSet.has(name.toLowerCase());

  const toggle = (name: string) =>
    has(name)
      ? onChange(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()))
      : onChange([...selected, name]);

  const addMany = (names: string[]) => {
    const missing = names.filter((n) => !has(n));
    if (missing.length) onChange([...selected, ...missing]);
  };
  const removeMany = (names: string[]) => {
    const drop = new Set(names.map((n) => n.toLowerCase()));
    onChange(selected.filter((s) => !drop.has(s.toLowerCase())));
  };

  const selectedInCat = (cat: FeatureCategory) =>
    CAT_ITEMS[cat].filter((n) => has(n)).length;

  const q = query.trim().toLowerCase();
  const items = useMemo(
    () => CAT_ITEMS[active].filter((n) => n.toLowerCase().includes(q)),
    [active, q],
  );
  const allInViewOn = items.length > 0 && items.every((n) => has(n));

  return (
    <div className="flex flex-col gap-3">
      {/* Header: count + clear all */}
      <div className="flex items-center justify-between">
        <span className="body-md-semibold">
          {selected.length} feature{selected.length === 1 ? "" : "s"} selected
        </span>
        {selected.length > 0 && (
          <Button variant="plain" onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>

      {/* Category tabs with selected-count badges */}
      <Tabs
        tabs={FEATURE_CATEGORIES.map((cat) => {
          const n = selectedInCat(cat);
          return { id: cat, content: cat, badge: n > 0 ? n : undefined };
        })}
        selected={FEATURE_CATEGORIES.indexOf(active)}
        onSelect={(i) => {
          setActive(FEATURE_CATEGORIES[i]);
          setQuery("");
        }}
      />

      {/* Search (scoped to active category) + select-all-in-view */}
      <div className="flex items-center justify-between gap-2">
        <div className="w-full sm:w-64">
          <TextField
            label={`Search ${active}`}
            labelHidden
            prefix="SearchMinor"
            value={query}
            onChange={setQuery}
            placeholder={`Search ${active}…`}
            clearButton
            onClearButtonClick={() => setQuery("")}
          />
        </div>
        {items.length > 0 && (
          <Button
            onClick={() => (allInViewOn ? removeMany(items) : addMany(items))}
          >
            {allInViewOn ? "Clear all in view" : "Select all in view"}
          </Button>
        )}
      </div>

      {/* Two-column checklist for the active category */}
      <div className="grid max-h-72 grid-cols-1 gap-x-4 overflow-y-auto px-1 sm:grid-cols-2">
        {items.length === 0 ? (
          <div className="body-sm col-span-full px-2 py-6 text-center text-(--text-secondary)">
            No {active} features match “{query}”.
          </div>
        ) : (
          items.map((name) => (
            <Checkbox
              key={name}
              label={name}
              checked={has(name)}
              onChange={() => toggle(name)}
            />
          ))
        )}
      </div>

      {/* Running selected summary */}
      <div className="border-t border-(--border) pt-3">
        <div className="body-md-semibold mb-1.5">
          Selected ({selected.length})
        </div>
        {selected.length === 0 ? (
          <div className="body-sm rounded-(--radius-200) bg-(--bg-surface-secondary) px-3 py-3 text-center text-(--text-secondary)">
            No features selected, pick from the categories above.
          </div>
        ) : (
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {selected.map((name) => (
              <Tag key={name} onRemove={() => toggle(name)}>
                {name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
