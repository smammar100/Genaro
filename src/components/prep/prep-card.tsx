"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import type { PrepCar } from "@/lib/services/prep-service";
import type { TodoStatus, User } from "@/lib/types";
import { Badge, Button, Checkbox, Tooltip, type BadgeTone } from "@/components/genaro";
import { KANBAN_CARD_SURFACE } from "@/components/kanban/kanban-card";
import { RegPlate } from "@/components/shared/reg-plate";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { getDaysInStockColor, titleCase } from "@/lib/utils";
import { PrepAssignee } from "./prep-assignee";
import { openTodos, prepBreakdown, PrepProgressBar } from "./prep-progress";

/** Jobs listed on a card; the rest are a click away in Things to do. */
const SHOWN = 3;

const AGE_TONE: Record<ReturnType<typeof getDaysInStockColor>, BadgeTone> = {
  green: "neutral",
  amber: "warning",
  red: "critical",
};

/**
 * Days in stock, on the same thresholds as every other stock-age chip. Just
 * "23d" so the header keeps room for the car's name; screen readers hear it
 * in full.
 */
function AgeBadge({ days }: { days: number }) {
  const tone = AGE_TONE[getDaysInStockColor(days)];
  return (
    <Badge
      tone={tone}
      icon={tone === "critical" ? <AlertTriangle className="size-3" /> : undefined}
    >
      <span title={`${days} days in stock`}>
        <span aria-hidden>{days}d</span>
        <span className="sr-only">{days} days in stock</span>
      </span>
    </Badge>
  );
}

/**
 * One car on the prep board, on the shared Kanban card surface: plate, car
 * and stock age, its work roll-up, then the jobs still to do as a checklist,
 * so work is ticked off where it's seen. Ticking the last one sends the car
 * to Ready for sales. The footer has who has it and its job card.
 */
export function PrepCard({
  car,
  users,
  exporting,
  onOpen,
  onAssign,
  onExport,
  onSetTodoStatus,
}: {
  car: PrepCar;
  users: User[];
  exporting: boolean;
  onOpen: () => void;
  onAssign: (userId: string | null) => void;
  onExport: () => void;
  onSetTodoStatus: (todoId: string, status: TodoStatus) => void;
}) {
  const pathname = usePathname();
  const { vehicle } = car;
  const assignee = users.find((u) => u.id === vehicle.prepAssignedTo) ?? null;

  // Jobs ticked here stay on the card, struck through, so a mis-tap can be unticked.
  const [ticked, setTicked] = useState<string[]>([]);
  const open = openTodos(car);
  const shown = car.todos
    .filter((t) => open.includes(t) || ticked.includes(t.id))
    .slice(0, SHOWN);
  const remaining = open.filter((t) => !shown.includes(t)).length;
  const live = car.total - car.cancelled;
  const allDone = live > 0 && open.length === 0;

  function toggle(todoId: string, done: boolean) {
    if (!ticked.includes(todoId)) setTicked([...ticked, todoId]);
    onSetTodoStatus(todoId, done ? "completed" : "pending");
  }

  const openLabel =
    live === 0
      ? "Add the first job"
      : allDone
        ? `Show all ${live} jobs`
        : remaining > 1
          ? `Show all ${remaining} remaining`
          : remaining === 1
            ? "Show 1 remaining"
            : "Open things to do";

  return (
    <article className={KANBAN_CARD_SURFACE}>
      <header className="flex items-center gap-2 px-4 pt-4">
        <Link
          href={vehicleDetailHref(vehicle.id, pathname)}
          className="shrink-0 whitespace-nowrap"
          title="Open the vehicle record"
        >
          <RegPlate registration={vehicle.registration} size="sm" />
        </Link>
        <span className="min-w-0 flex-1 truncate body-md-semibold">
          {titleCase(`${vehicle.make} ${vehicle.model}`)}
        </span>
        <AgeBadge days={car.daysWaiting} />
      </header>

      <div className="flex flex-col gap-2 px-4 pt-3">
        {live > 0 ? (
          // The counts are on hover. Below: the card clips anything above
          // its top edge.
          <Tooltip
            content={prepBreakdown(car)}
            preferredPosition="below"
            className="flex w-full py-1"
          >
            <PrepProgressBar {...car} />
          </Tooltip>
        ) : null}
        {live === 0 ? (
          <p className="body-sm text-(--text-secondary)">Nothing raised yet.</p>
        ) : allDone ? (
          <p className="flex items-center gap-2 body-md text-(--text-success)">
            <CheckCircle2 aria-hidden className="size-4" />
            All {live} jobs done
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {shown.map((t) => (
              <li key={t.id}>
                <Checkbox
                  label={
                    <span
                      className={
                        t.status === "completed"
                          ? "text-(--text-secondary) line-through decoration-(--text-secondary)"
                          : undefined
                      }
                    >
                      {t.description}
                      {t.status === "in_progress" ? (
                        <span className="ml-1.5 body-xs text-(--text-info)">In progress</span>
                      ) : null}
                    </span>
                  }
                  checked={t.status === "completed"}
                  onChange={(done) => toggle(t.id, done)}
                />
              </li>
            ))}
          </ul>
        )}
        <div>
          <Button variant="plain" onClick={onOpen}>
            {openLabel}
          </Button>
        </div>
      </div>

      <footer className="mt-3 flex items-center gap-2 border-t border-(--border-secondary) px-3 py-2">
        <div className="min-w-0 flex-1">
          <PrepAssignee
            registration={vehicle.registration}
            users={users}
            assignee={assignee}
            onAssign={onAssign}
          />
        </div>
        {/* To the left: the button sits on the card's right edge, and the
            lane clips anything past it. */}
        <Tooltip content="Download job card PDF" preferredPosition="left">
          <Button
            variant="tertiary"
            size="micro"
            icon={<Download className="size-4" />}
            loading={exporting}
            onClick={onExport}
            accessibilityLabel={`Download job card for ${vehicle.registration}`}
          />
        </Tooltip>
      </footer>
    </article>
  );
}
