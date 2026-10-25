import type { PrepCar } from "@/lib/services/prep-service";
import type { TodoItem, TodoStatus } from "@/lib/types";

type Counts = Pick<PrepCar, "done" | "inProgress" | "pending">;

/**
 * A car's prep roll-up as one segmented bar — done, in progress, pending —
 * so the split is visible at a glance. Cancelled items are left out: they are
 * not work anyone still has to do (GEN-112).
 */
export function PrepProgressBar({ done, inProgress, pending }: Counts) {
  const segment = (n: number, className: string) =>
    n > 0 ? <span className={className} style={{ flexGrow: n }} /> : null;
  const live = done + inProgress + pending;
  return (
    <div
      role="progressbar"
      aria-label="Prep progress"
      aria-valuemin={0}
      aria-valuemax={live}
      aria-valuenow={done}
      aria-valuetext={prepBreakdown({ done, inProgress, pending, cancelled: 0 })}
      className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-(--bg-fill-tertiary)"
    >
      {segment(done, "bg-(--bg-fill-success)")}
      {segment(inProgress, "bg-(--bg-fill-info)")}
      {segment(pending, "bg-(--bg-fill-tertiary)")}
    </div>
  );
}

/** "3 done · 1 in progress · 1 not started", plus any cancelled. */
export function prepBreakdown({
  done,
  inProgress,
  pending,
  cancelled,
}: Pick<PrepCar, "done" | "inProgress" | "pending" | "cancelled">): string {
  const parts = [`${done} done`, `${inProgress} in progress`, `${pending} not started`];
  if (cancelled) parts.push(`${cancelled} cancelled`);
  return parts.join(" · ");
}

/** Items still to do, in the order work happens: started first, then not started. */
export function openTodos(car: Pick<PrepCar, "todos">): TodoItem[] {
  const rank = (t: TodoItem) => (t.status === "in_progress" ? 0 : 1);
  return car.todos
    .filter((t) => t.status === "in_progress" || t.status === "pending")
    .sort((a, b) => rank(a) - rank(b));
}

/**
 * The car as it will be once one item's status changes, with its counts
 * rolled up again, so a tick shows before the save comes back. The column
 * stays put until the queue reloads.
 */
export function withTodoStatus(car: PrepCar, todoId: string, status: TodoStatus): PrepCar {
  const todos = car.todos.map((t) => (t.id === todoId ? { ...t, status } : t));
  const count = (s: TodoStatus) => todos.filter((t) => t.status === s).length;
  const pending = count("pending");
  const inProgress = count("in_progress");
  return {
    ...car,
    todos,
    open: pending + inProgress,
    pending,
    inProgress,
    cancelled: count("cancelled"),
    done: count("completed"),
  };
}
