"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/polaris";
import { getInitials, cn } from "@/lib/utils";
import type { CustomerSearchResult } from "@/lib/services/customer-service";

interface CustomerResultRowProps {
  result: CustomerSearchResult;
  selected: boolean;
  onSelect: () => void;
  /** What the user typed — used to highlight matched substrings. */
  query: string;
}

/**
 * Badge tone per match type, by how reliable the match is: phone and email
 * identify a person, a postcode narrows it down, a name alone needs a
 * second look before you reuse the record.
 */
const MATCH_BADGE_TONES: Record<string, BadgeTone> = {
  phone: "success",
  email: "success",
  postcode: "info",
  name: "attention",
};

const MATCH_LABELS: Record<string, string> = {
  phone: "Phone match",
  email: "Email match",
  postcode: "Postcode match",
  name: "Name match",
};

/**
 * One row in the search results list. Picking it acts like a radio —
 * parent tracks the selected customer id and re-renders all rows.
 */
export function CustomerResultRow({
  result,
  selected,
  onSelect,
  query,
}: CustomerResultRowProps) {
  const { customer, matchType } = result;
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const company = customer.companyName;
  const contactBits = [
    customer.mobilePhone,
    customer.email,
    customer.postcode,
  ]
    .filter(Boolean)
    .join(" · ");

  // A full-row selectable list item (radio indicator, avatar, two text
  // lines, badge) — richer than a Polaris Button can hold, so it stays a
  // native <button> styled with Polaris tokens.
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-center gap-3 rounded-(--radius-200) border p-3 text-left text-(--text) transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        selected
          ? "border-(--border-emphasis) bg-(--bg-surface-secondary-selected)"
          : "border-(--border) bg-(--bg-surface) hover:border-(--border-hover) hover:bg-(--bg-surface-hover)",
      )}
    >
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-(--border-emphasis)" : "border-(--border)",
        )}
      >
        {selected && (
          <span className="size-2.5 rounded-full bg-(--bg-fill-emphasis)" />
        )}
      </div>
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-xs">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            <Highlight text={fullName} query={query} />
          </span>
          {company && (
            <span className="truncate text-xs text-(--text-secondary)">
              · <Highlight text={company} query={query} />
            </span>
          )}
        </div>
        <p className="truncate text-xs text-(--text-secondary)">
          <Highlight text={contactBits || "—"} query={query} />
        </p>
      </div>
      <Badge tone={MATCH_BADGE_TONES[matchType]} className="shrink-0">
        {MATCH_LABELS[matchType] ?? matchType}
      </Badge>
    </button>
  );
}

/** Wraps each query-substring occurrence in <mark>. Falls back to plain text. */
function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = trimmed.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-(--radius-100) bg-(--bg-fill-caution-secondary) px-0.5 text-(--text)">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  );
}
