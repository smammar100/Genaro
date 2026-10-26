import { CalendarCheck, Gauge, ListChecks, Users, Wrench, type LucideIcon } from "lucide-react";
import type { ServiceHistory, Vehicle } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { daysUntil } from "@/components/kanban/card-dates";
import { BandedCard } from "./banded-card";

const SERVICE_HISTORY: Record<ServiceHistory, string> = {
  full: "Full",
  partial: "Partial",
  none: "None",
  unknown: "Unknown",
};

interface Highlight {
  icon: LucideIcon;
  label: string;
  value: string;
  /** A quieter line under the value. */
  note?: string;
  tone?: "muted" | "caution" | "critical";
}

const TONE = {
  muted: "text-(--text-secondary)",
  caution: "text-(--text-caution)",
  critical: "text-(--text-critical)",
};

/** The MOT as a buyer hears it: the expiry date, flagged once it's close or gone. */
function motHighlight(expiry: string | null): Highlight {
  if (!expiry) return { icon: CalendarCheck, label: "MOT until", value: "—", tone: "muted" };
  const days = daysUntil(expiry);
  if (days < 0) {
    return { icon: CalendarCheck, label: "MOT until", value: formatDate(expiry), note: "Expired", tone: "critical" };
  }
  if (days <= 30) {
    return { icon: CalendarCheck, label: "MOT until", value: formatDate(expiry), note: "Due soon", tone: "caution" };
  }
  return { icon: CalendarCheck, label: "MOT until", value: formatDate(expiry) };
}

/**
 * The four facts a buyer asks for first when they phone about a car — mileage,
 * service history, MOT and previous owners — as a `BandedCard` beside Pricing
 * and Location: one fact per row, label left and value right, with the MOT
 * flagged once it's close or gone.
 */
export function SalesHighlightsCard({ vehicle }: { vehicle: Vehicle }) {
  const highlights: Highlight[] = [
    {
      icon: Gauge,
      label: "Mileage",
      value: vehicle.mileage ? `${vehicle.mileage.toLocaleString("en-GB")} mi` : "—",
      tone: vehicle.mileage ? undefined : "muted",
    },
    {
      icon: Wrench,
      label: "Service history",
      value: SERVICE_HISTORY[vehicle.serviceHistory] ?? "Unknown",
      tone: vehicle.serviceHistory === "unknown" ? "muted" : undefined,
    },
    motHighlight(vehicle.motExpiry),
    {
      icon: Users,
      label: "Previous owners",
      value: vehicle.formerKeepers != null ? String(vehicle.formerKeepers) : "—",
      tone: vehicle.formerKeepers != null ? undefined : "muted",
    },
  ];

  return (
    <BandedCard icon={ListChecks} title="Sales highlights">
      <dl className="flex flex-col gap-2.5">
        {highlights.map(({ icon: Icon, label, value, note, tone }) => (
          // Label left; value right with any note under it.
          <div key={label} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4">
            <dt className="flex items-center gap-1.5 body-md text-(--text-secondary)">
              <Icon aria-hidden className="size-4 shrink-0 text-(--icon-secondary)" />
              {label}
            </dt>
            <dd
              className={cn(
                "text-right body-md tabular-nums text-(--text)",
                tone !== "muted" && "font-semibold",
                tone && TONE[tone],
              )}
            >
              {value}
            </dd>
            {note ? (
              <dd className={cn("col-start-2 text-right body-sm", tone && TONE[tone])}>{note}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </BandedCard>
  );
}
