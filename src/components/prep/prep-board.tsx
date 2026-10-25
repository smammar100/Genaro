"use client";

import { Wrench } from "lucide-react";
import {
  PREP_STATUSES,
  type PrepCar,
  type PrepStatus,
} from "@/lib/services/prep-service";
import type { TodoStatus, User } from "@/lib/types";
import { Card, EmptyState } from "@/components/genaro";
import { KanbanEmpty, KanbanFrame, KanbanLane, KanbanSkeleton } from "@/components/kanban/kanban-board";
import type { KanbanColumn } from "@/components/kanban/stage-icon";
import { PrepCard } from "./prep-card";

/** Each stage as a board column: two on the path, then ready, which ends it. */
const COLUMN: Record<PrepStatus, Pick<KanbanColumn, "tone" | "kind">> = {
  unassigned: { tone: "neutral", kind: "open" },
  in_progress: { tone: "info", kind: "open" },
  ready: { tone: "success", kind: "done" },
};

const COLUMNS: KanbanColumn[] = PREP_STATUSES.map((s) => ({
  id: s.value,
  label: s.label,
  ...COLUMN[s.value],
}));

/** What the board needs to act on a car; the page owns the data and calls. */
interface PrepBoardActions {
  users: User[];
  exportingId: string | null;
  onOpen: (vehicleId: string) => void;
  onAssign: (vehicleId: string, userId: string | null) => void;
  onExport: (car: PrepCar) => void;
  onSetTodoStatus: (car: PrepCar, todoId: string, status: TodoStatus) => void;
}

function PrepColumn({
  column,
  hint,
  cars,
  ...actions
}: PrepBoardActions & {
  column: KanbanColumn;
  hint: string;
  cars: PrepCar[];
}) {
  return (
    <KanbanLane column={column} columns={COLUMNS} count={cars.length} summary={hint}>
      {cars.length === 0 ? (
        <KanbanEmpty>Nothing here</KanbanEmpty>
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
            onSetTodoStatus={(todoId, status) => actions.onSetTodoStatus(car, todoId, status)}
          />
        ))
      )}
    </KanbanLane>
  );
}

/**
 * The prep board: one column per stage, in the shared Kanban lanes and cards. `cars` is null while loading. A car
 * moves column by itself — assigning it starts prep, finishing its last item
 * makes it ready — so the board never drags.
 */
export function PrepBoard({ cars, ...actions }: PrepBoardActions & { cars: PrepCar[] | null }) {
  if (cars === null) {
    return (
      <KanbanSkeleton columns={PREP_STATUSES.length} />
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
    <KanbanFrame>
      {PREP_STATUSES.map((s, i) => (
        <PrepColumn
          key={s.value}
          column={COLUMNS[i]}
          hint={s.subtitle}
          cars={cars.filter((c) => c.status === s.value)}
          {...actions}
        />
      ))}
    </KanbanFrame>
  );
}
