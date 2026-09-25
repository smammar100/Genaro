"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import type { PrepCar } from "@/lib/services/prep-service";
import type { User } from "@/lib/types";
import { Badge, Button, Card, Tooltip, type BadgeTone } from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { formatCurrency, getDaysInStockColor, titleCase } from "@/lib/utils";
import { PrepAssignee } from "./prep-assignee";
import { PrepProgressBar, prepSummary } from "./prep-progress";

const AGE_TONE: Record<ReturnType<typeof getDaysInStockColor>, BadgeTone> = {
  green: "neutral",
  amber: "warning",
  red: "critical",
};

/** Days in stock, on the same thresholds as every other stock-age chip. */
function AgeBadge({ days }: { days: number }) {
  const tone = AGE_TONE[getDaysInStockColor(days)];
  return (
    <Badge
      tone={tone}
      icon={tone === "critical" ? <AlertTriangle className="size-3" /> : undefined}
    >
      {`${days}d in stock`}
    </Badge>
  );
}

/**
 * One car on the prep board: plate and stock age, the car, its work roll-up
 * and prep cost, then who has it and its job card. The middle opens the
 * car's Things to do list.
 */
export function PrepCard({
  car,
  users,
  exporting,
  onOpen,
  onAssign,
  onExport,
}: {
  car: PrepCar;
  users: User[];
  exporting: boolean;
  onOpen: () => void;
  onAssign: (userId: string | null) => void;
  onExport: () => void;
}) {
  const pathname = usePathname();
  const { vehicle, cost, daysWaiting, status } = car;
  const assignee = users.find((u) => u.id === vehicle.prepAssignedTo) ?? null;

  return (
    <Card padding="0">
      <article className="flex flex-col">
        <header className="flex items-center justify-between gap-2 px-4 pt-3">
          <Link
            href={vehicleDetailHref(vehicle.id, pathname)}
            className="min-w-0"
            title="Open the vehicle record"
          >
            <RegPlate registration={vehicle.registration} size="sm" />
          </Link>
          <AgeBadge days={daysWaiting} />
        </header>

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open things to do for ${vehicle.registration}`}
          className="flex flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-(--bg-surface-hover)"
        >
          <span>
            <span className="block truncate body-md-semibold">
              {titleCase(`${vehicle.make} ${vehicle.model}`)}
            </span>
            <span className="block body-sm text-(--text-secondary)">{vehicle.stockId}</span>
          </span>
          <span className="flex flex-col gap-1.5">
            <PrepProgressBar {...car} />
            <span className="flex items-center justify-between gap-2">
              <span className="body-sm text-(--text-secondary)">{prepSummary(car)}</span>
              {cost > 0 ? (
                <span className="body-md-numeric">{formatCurrency(cost)}</span>
              ) : null}
            </span>
          </span>
        </button>

        {status === "ready" ? (
          <p className="mx-4 mb-3 flex items-center gap-1.5 rounded-(--radius-200) bg-(--bg-surface-success) px-3 py-2 body-sm text-(--text-success)">
            <CheckCircle2 aria-hidden className="size-4" />
            Ready to move to sales
          </p>
        ) : null}

        <footer className="flex items-center gap-2 border-t border-(--border-secondary) px-3 py-2.5">
          <PrepAssignee
            registration={vehicle.registration}
            users={users}
            assignee={assignee}
            onAssign={onAssign}
          />
          <Tooltip content="Download job card PDF">
            <Button
              icon={<Download className="size-4" />}
              loading={exporting}
              onClick={onExport}
              accessibilityLabel={`Download job card for ${vehicle.registration}`}
            />
          </Tooltip>
        </footer>
      </article>
    </Card>
  );
}
