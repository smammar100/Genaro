"use client";

import { type ReactNode } from "react";
import { Badge, Card, type BadgeTone } from "@/components/polaris";
import { cn } from "@/lib/utils";

/**
 * Vehicle-detail primitives. Thin wrappers around the Polaris Card and
 * Badge so every tab panel on the vehicle page reads like a Polaris
 * ProductDetail main column: a stack of cards with sentence-case
 * heading-sm titles, plain-button actions and toned status badges.
 */

// ============================================================
// PILL — Polaris Badge with the app's tone names.
// ============================================================

type PillTone = "good" | "warn" | "bad" | "info" | "purple" | "neutral";

const PILL_TONE: Record<PillTone, BadgeTone> = {
  good: "success",
  warn: "attention",
  bad: "critical",
  info: "info",
  purple: "info",
  neutral: "neutral",
};

interface PillProps {
  tone?: PillTone;
  /** Adds a leading status pip. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = "neutral", dot = false, className, children }: PillProps) {
  return (
    <Badge
      tone={PILL_TONE[tone]}
      progress={dot ? "complete" : undefined}
      // Raw status values ("live", "cancelled") read as sentence case.
      className={cn("[&>span:last-child]:first-letter:uppercase", className)}
    >
      {children}
    </Badge>
  );
}

// ============================================================
// KPI CARD — Polaris metric card: label, value, optional hint.
// ============================================================

interface KpiCardProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Tone of the hint text for "needs attention" / "problem" KPIs. */
  accent?: "amber" | "destructive";
}

export function KpiCard({ icon: Icon, label, value, hint, accent }: KpiCardProps) {
  return (
    // "Needs attention" is carried by the hint text tone, never by
    // coloured borders or tinted surfaces.
    <Card className="gap-1">
      <div className="flex items-center justify-between">
        <span className="body-md text-(--text-secondary) underline decoration-(--border) decoration-dotted underline-offset-4">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-(--icon-secondary)" />}
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {hint && (
        <div
          className={cn(
            "body-sm text-(--text-secondary)",
            accent === "amber" && "text-(--text-caution)",
            accent === "destructive" && "text-(--text-critical)",
          )}
        >
          {hint}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// SECTION DIVIDER — labelled hairline used between sub-sections
// in a single tab.
// ============================================================

interface SectionDividerProps {
  label: string;
  trailing?: ReactNode;
}

export function SectionDivider({ label, trailing }: SectionDividerProps) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-3">
      <h2 className="heading-sm text-(--text)">{label}</h2>
      <div className="h-px flex-1 bg-(--border)" />
      {trailing}
    </div>
  );
}

// ============================================================
// PANEL — Polaris Card with an optional header (title / subtitle /
// trailing action). Centralises the "title + content" layout we
// repeat in every tab.
// ============================================================

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** When true, drop the inner content padding (for tables / lists). */
  flush?: boolean;
  className?: string;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  flush,
  className,
}: PanelProps) {
  const hasHeader = Boolean(title || action);
  return (
    <Card className={cn("gap-4", className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && <h2 className="heading-sm text-(--text)">{title}</h2>}
            {subtitle && (
              <p className="body-sm text-(--text-secondary)">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn(flush && "-mx-4")}>{children}</div>
    </Card>
  );
}

// ============================================================
// FIELD GRID — labelled key/value list used in Overview, Listing,
// Purchase Information, etc.
// ============================================================

interface FieldGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function FieldGrid({ children, cols = 2, className }: FieldGridProps) {
  return (
    // Columns follow the width of the card the grid sits in (container
    // query), not the viewport, so it never crams two columns into a card
    // squeezed by a sidebar.
    <div className="@container">
      <div
        className={cn(
          "grid gap-x-8 gap-y-5",
          cols === 2 && "grid-cols-1 @md:grid-cols-2",
          cols === 3 && "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3",
          cols === 4 && "grid-cols-2 @3xl:grid-cols-4",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  /** True for currency / numbers — applies tabular-nums for clean column alignment. */
  numeric?: boolean;
  muted?: boolean;
  className?: string;
}

export function Field({ label, children, numeric, muted, className }: FieldProps) {
  return (
    <div className={className}>
      <div className="body-md text-(--text-secondary)">{label}</div>
      <div
        className={cn(
          "mt-1 body-md text-(--text)",
          numeric && "tabular-nums",
          muted && "text-(--text-secondary)",
        )}
      >
        {children}
      </div>
    </div>
  );
}
