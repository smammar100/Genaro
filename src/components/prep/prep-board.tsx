"use client";

import { CheckCircle2, CircleDashed, Timer, Wrench, type LucideIcon } from "lucide-react";
import {
  PREP_STATUSES,
  type PrepCar,
  type PrepStatus,
} from "@/lib/services/prep-service";
import type { User } from "@/lib/types";
import { Badge, Card, EmptyState, SkeletonBodyText } from "@/components/polaris";
import { PrepCard } from "./prep-card";

const STAGE_ICON: Record<PrepStatus, LucideIcon> = {
  unassigned: CircleDashed,
  in_progress: Timer,
  ready: CheckCircle2,
};

/** What the board needs to act on a car; the page owns the data and calls. */
export interface PrepBoardActions {
  users: User[];
  exportingId: string | null;
  onOpen: (vehicleId: string) => void;
  onAssign: (vehicleId: string, userId: string | null) => void;
  onExport: (car: PrepCar) => void;
}

function PrepColumn({
  status,
  label,
  hint,
  cars,
  ...actions
}: PrepBoardActions & {
  status: PrepStatus;
  label: string;
  hint: string;
  cars: PrepCar[];
}) {
  const Icon = STAGE_ICON[status];
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-2 rounded-(--radius-300) bg-(--bg-surface-secondary) p-2"
    >
      <header className="flex flex-col gap-0.5 px-2 pt-1 pb-1">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 text-(--icon-secondary)" />
          <h2 className="heading-sm">{label}</h2>
          <Badge>{String(cars.length)}</Badge>
        </div>
        <p className="body-sm text-(--text-secondary)">{hint}</p>
      </header>
      {cars.length === 0 ? (
        <p className="rounded-(--radius-200) border border-dashed border-(--border) px-3 py-6 text-center body-sm text-(--text-secondary)">
          Nothing here
        </p>
      ) : (
        cars.map((car) => (
          <PrepCard
            key={car.vehicle.id}
            car={car}
            users={actions.users}
            exporting={actions.exportingId === car.vehicle.id}
            onOpen={() => actions.onOpen(car.vehicle.id)}
            onAssign={(userId) => actions.onAssign(car.vehicle.id, userId)}
            onExport={() => actions.onExport(car)}
          />
        ))
      )}
    </section>
  );
}

/**
 * The prep board: one column per stage. `cars` is null while loading. A car
 * moves column by itself — assigning it starts prep, finishing its last item
 * makes it ready — so the board never drags.
 */
export function PrepBoard({ cars, ...actions }: PrepBoardActions & { cars: PrepCar[] | null }) {
  if (cars === null) {
    return (
      <div className="grid items-start gap-3 lg:grid-cols-3">
        {PREP_STATUSES.map((s) => (
          <Card key={s.value}>
            <SkeletonBodyText lines={6} />
          </Card>
        ))}
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <Card padding="0">
        <EmptyState icon={<Wrench className="fill-none" />} heading="Nothing in prep">
          Cars appear here the moment an inspection is completed with outstanding items.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-3">
      {PREP_STATUSES.map((s) => (
        <PrepColumn
          key={s.value}
          status={s.value}
          label={s.label}
          hint={s.subtitle}
          cars={cars.filter((c) => c.status === s.value)}
          {...actions}
        />
      ))}
    </div>
  );
}
