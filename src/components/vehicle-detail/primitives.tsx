"use client";

import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * v5 vehicle-detail primitives. Thin wrappers around shadcn so the
 * vehicle-detail surface looks and feels exactly like the rest of the
 * app — same Card chrome, same Badge tones, same typography. The "v5
 * layout" lives in how these pieces are arranged inside each tab; the
 * pieces themselves are stock app components.
 */

// ============================================================
// PILL — wraps shadcn Badge so the status tones are app-wide
// consistent (mirrors the warranty StatusPill pattern).
// ============================================================

type PillTone = "good" | "warn" | "bad" | "info" | "purple" | "neutral";

// Polaris badge tones (success / warning / critical / info / neutral).
const PILL_CLASSES: Record<PillTone, string> = {
  good: "bg-[#affebf] text-[#014b40]",
  warn: "bg-[#ffeb78] text-[#4f4700]",
  bad: "bg-[#fed1d7] text-[#8e0b21]",
  info: "bg-[#d5ebff] text-[#003a5a]",
  purple: "bg-[#f1ebff] text-[#5700d1]",
  neutral: "bg-black/[0.06] text-[#303030]",
};

const DOT_CLASSES: Record<PillTone, string> = {
  good: "bg-[#014b40]",
  warn: "bg-[#4f4700]",
  bad: "bg-[#8e0b21]",
  info: "bg-[#003a5a]",
  purple: "bg-[#5700d1]",
  neutral: "bg-[#616161]",
};

interface PillProps {
  tone?: PillTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = "neutral", dot = false, className, children }: PillProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1.5 first-letter:uppercase",
        PILL_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])}
        />
      )}
      {children}
    </Badge>
  );
}

// ============================================================
// KPI CARD — mirrors the warranty KpiCard pattern (icon + label
// + value + hint + amber/destructive accent).
// ============================================================

interface KpiCardProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Surface accent for "needs attention" / "problem" KPIs. */
  accent?: "amber" | "destructive";
}

export function KpiCard({ icon: Icon, label, value, hint, accent }: KpiCardProps) {
  return (
    <Card
      size="sm"
      // Polaris metric card: plain white card. "Needs attention" is carried
      // by the hint text tone, never by coloured borders or tinted surfaces.
      className="gap-2"
    >
      <CardContent className="flex flex-col gap-1 p-0">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground underline decoration-dotted decoration-[#b5b5b5] underline-offset-4">
            {label}
          </span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
        {hint && (
          <div
            className={cn(
              "text-xs text-muted-foreground",
              accent === "amber" && "text-[#4f4700]",
              accent === "destructive" && "text-[#8e0b21]",
            )}
          >
            {hint}
          </div>
        )}
      </CardContent>
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
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
      {trailing}
    </div>
  );
}

// ============================================================
// PANEL — Card wrapper with optional header (title / subtitle /
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
  return (
    <Card size="sm" className={cn("gap-4", className)}>
      {(title || action) && (
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-0">
          <div className="flex flex-col gap-1">
            {title && <CardTitle className="text-sm font-semibold">{title}</CardTitle>}
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("p-0", flush && "-mx-4")}>{children}</CardContent>
    </Card>
  );
}

// ============================================================
// INFO CARD — soft accent card used at the top of tabs to
// explain what the tab tracks.
// ============================================================

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
    <div
      className={cn(
        "grid gap-x-8 gap-y-5",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
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
      <div className="text-[13px] font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[13px] text-foreground",
          numeric && "tabular-nums",
          muted && "text-muted-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}
