"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { PrepCar } from "@/lib/services/prep-service";
import { todoService } from "@/lib/services/todo-service";
import { vendorService } from "@/lib/services/vendor-service";
import type { TodoItem, TodoStatus, Vendor } from "@/lib/types";
import {
  ActionMenu,
  Badge,
  Banner,
  Button,
  Card,
  Sheet,
  useConfirm,
  type MenuItem,
} from "@/components/genaro";
import { StageIcon, type KanbanColumn } from "@/components/kanban/stage-icon";
import { RegPlate } from "@/components/shared/reg-plate";
import { valueAdditionFromTodos } from "@/lib/master-sheet";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { toast } from "@/lib/toast";
import { cn, formatCurrency, titleCase } from "@/lib/utils";
import { PrepJobModal, type PrepJobInput } from "./prep-job-modal";

type Lane = "in_progress" | "pending" | "completed";

/** The jobs' stages as board columns, so each card wears its lane's badge and colour. */
const LANES: KanbanColumn[] = [
  { id: "pending", label: "Up next", tone: "neutral", kind: "open" },
  { id: "in_progress", label: "In progress", tone: "info", kind: "open" },
  { id: "completed", label: "Done", tone: "success", kind: "done" },
];

const BAND: Record<Lane, string> = {
  pending: "bg-(--icon-secondary)",
  in_progress: "bg-(--icon-info)",
  completed: "bg-(--icon-success)",
};

/** The one move that takes a job on from where it stands. */
const NEXT: Record<TodoStatus, { content: string; to: TodoStatus; icon?: "PlayMinor" | "TickMinor" } | null> = {
  pending: { content: "Start", to: "in_progress", icon: "PlayMinor" },
  in_progress: { content: "Mark done", to: "completed", icon: "TickMinor" },
  completed: { content: "Reopen", to: "in_progress" },
  cancelled: null,
};

/** One stage of the car's jobs, in a card banded and badged like its kanban lane. */
function LaneCard({
  lane,
  count,
  actions,
  children,
}: {
  lane: Lane;
  count: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const column = LANES.find((c) => c.id === lane) ?? LANES[0];
  return (
    <Card
      className="relative overflow-hidden"
      title={
        <span className="flex items-center gap-2">
          <StageIcon column={column} columns={LANES} variant="badge" />
          {column.label}
          <span className="tabular-nums text-(--text-secondary)">{count}</span>
        </span>
      }
      actions={actions}
    >
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", BAND[lane])} />
      {children}
    </Card>
  );
}

/**
 * One car's Things to do, in a side sheet, as its next steps: what's in
 * progress, what's up next and what's done, each job with the one move that
 * takes it on (Start, Mark done, Reopen) and a menu for the rest. Changes show
 * at once and save straight through; the board then reloads, so finishing the
 * last job moves the car to Ready for sales.
 */
export function PrepTodoSheet({
  car,
  exporting,
  onClose,
  onExport,
  onChanged,
}: {
  car: PrepCar | null;
  exporting: boolean;
  onClose: () => void;
  onExport: (car: PrepCar) => void;
  onChanged: () => void;
}) {
  const pathname = usePathname();
  const { company, user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  // The job the modal shows: `null` adds one, `undefined` is closed.
  const [editing, setEditing] = useState<TodoItem | null | undefined>(undefined);

  // Keep the last car on screen while the sheet slides out.
  const [shown, setShown] = useState(car);
  if (car && car !== shown) setShown(car);

  // A change shows at once; the board's reload then brings back what was stored.
  const [todos, setTodos] = useState<TodoItem[]>(shown?.todos ?? []);
  const [synced, setSynced] = useState(shown?.todos);
  if (shown && shown.todos !== synced) {
    setSynced(shown.todos);
    setTodos(shown.todos);
  }

  const companyId = company?.id;
  useEffect(() => {
    if (!companyId) return;
    void vendorService.getAll(companyId).then(setVendors);
  }, [companyId]);

  async function save(work: () => Promise<unknown>, optimistic: TodoItem[] | null, failure: string, done?: string) {
    const before = todos;
    if (optimistic) setTodos(optimistic);
    try {
      await work();
      if (done) toast.success(done);
      onChanged();
    } catch (e) {
      setTodos(before);
      toast.error(e instanceof Error ? e.message : failure);
    }
  }

  function patch(id: string, change: Partial<PrepJobInput>) {
    if (!user) return;
    void save(
      () => todoService.update(id, change, user.id),
      todos.map((t) => (t.id === id ? { ...t, ...change } : t)),
      "Couldn't save that change",
    );
  }

  function add(input: PrepJobInput) {
    if (!user || !shown) return;
    void save(
      () => todoService.add({ ...input, vehicleId: shown.vehicle.id, source: "manual", createdBy: user.id }),
      null,
      "Couldn't add the job",
      "Job added",
    );
  }

  async function remove(job: TodoItem) {
    if (!user) return;
    const ok = await confirm({
      title: "Delete this job?",
      description: `“${job.description}” will be removed from this car’s Things to do. This can’t be undone.`,
      confirmText: "Delete job",
      destructive: true,
    });
    if (!ok) return;
    await save(
      () => todoService.remove(job.id, user.id),
      todos.filter((t) => t.id !== job.id),
      "Couldn't delete the job",
      "Job deleted",
    );
  }

  const garage = (id: string | null) =>
    id ? (vendors.find((v) => v.id === id)?.name ?? "Unknown garage") : "No garage";

  function menu(job: TodoItem) {
    const moves: MenuItem[] = [];
    if (job.status === "pending") moves.push({ content: "Start job", icon: "PlayMinor", onAction: () => patch(job.id, { status: "in_progress" }) });
    if (job.status === "pending" || job.status === "in_progress")
      moves.push({ content: "Mark as done", icon: "TickMinor", onAction: () => patch(job.id, { status: "completed" }) });
    if (job.status === "in_progress" || job.status === "completed")
      moves.push({ content: "Move to not started", icon: <RotateCcw />, onAction: () => patch(job.id, { status: "pending" }) });
    moves.push({ content: "Edit job", icon: "EditMinor", onAction: () => setEditing(job) });
    return (
      <ActionMenu
        accessibilityLabel={`Actions for ${job.description}`}
        size="micro"
        preferredAlignment="right"
        sections={[
          { items: moves },
          {
            items: [
              job.status === "cancelled"
                ? { content: "Restore job", icon: <RotateCcw />, onAction: () => patch(job.id, { status: "pending" }) }
                : { content: "Cancel job", icon: "CancelMinor", onAction: () => patch(job.id, { status: "cancelled" }) },
              { content: "Delete job", icon: "DeleteMinor", destructive: true, onAction: () => void remove(job) },
            ],
          },
        ]}
      />
    );
  }

  function row(job: TodoItem, i: number) {
    const next = NEXT[job.status];
    const quiet = job.status === "completed" || job.status === "cancelled";
    const meta = [garage(job.vendorId)];
    if (job.cost != null) meta.push(formatCurrency(job.cost));
    if (job.source === "inspection") meta.push("From inspection");
    return (
      <li
        key={job.id}
        className={cn("flex items-center gap-3", i > 0 && "border-t border-(--border-secondary) pt-3")}
      >
        <div className="min-w-0 flex-1">
          <p className={quiet ? "body-md text-(--text-secondary) line-through decoration-(--text-secondary)" : "body-md"}>
            {job.description}
          </p>
          <p className="body-sm text-(--text-secondary)">{meta.join(" · ")}</p>
        </div>
        {job.status === "cancelled" ? <Badge>Cancelled</Badge> : null}
        {next ? (
          <Button
            size="micro"
            variant={job.status === "completed" ? "tertiary" : "secondary"}
            icon={next.icon}
            onClick={() => patch(job.id, { status: next.to })}
            accessibilityLabel={`${next.content}: ${job.description}`}
          >
            {next.content}
          </Button>
        ) : null}
        {menu(job)}
      </li>
    );
  }

  const doing = todos.filter((t) => t.status === "in_progress");
  const upNext = todos.filter((t) => t.status === "pending");
  const finished = [
    ...todos.filter((t) => t.status === "completed"),
    ...todos.filter((t) => t.status === "cancelled"),
  ];
  const doneCount = todos.filter((t) => t.status === "completed").length;
  const allDone = todos.length > 0 && doing.length === 0 && upNext.length === 0;

  return (
    <Sheet
      open={car !== null}
      onClose={onClose}
      size="large"
      background="subdued"
      title={
        shown ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">
              <RegPlate registration={shown.vehicle.registration} size="sm" />
            </span>
            <span className="truncate">{titleCase(`${shown.vehicle.make} ${shown.vehicle.model}`)}</span>
          </span>
        ) : (
          "Things to do"
        )
      }
      subtitle={
        shown
          ? `${shown.vehicle.stockId} · ${doing.length} in progress · ${upNext.length} up next · ${doneCount} done`
          : undefined
      }
      headerActions={
        shown ? [{ content: "Open vehicle", url: vehicleDetailHref(shown.vehicle.id, pathname) }] : undefined
      }
      footer={
        shown ? (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="body-md text-(--text-secondary)">
              Total{" "}
              <span className="body-md-semibold tabular-nums text-(--text)">
                {formatCurrency(valueAdditionFromTodos(todos))}
              </span>
            </span>
            <Button icon={<Download className="size-4" />} loading={exporting} onClick={() => onExport(shown)}>
              Download job card
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* One block that never shrinks: the app zeroes every element's
          min-height, so the sheet body would squeeze stacked cards together. */}
      <div className="flex shrink-0 flex-col gap-4">
        {allDone ? <Banner tone="success">All jobs done. This car is ready for sales.</Banner> : null}

        {doing.length ? (
          <LaneCard lane="in_progress" count={doing.length}>
            <ul className="flex flex-col gap-3">{doing.map(row)}</ul>
          </LaneCard>
        ) : null}

        <LaneCard
          lane="pending"
          count={upNext.length}
          actions={
            <Button variant="plain" icon="PlusMinor" onClick={() => setEditing(null)}>
              Add job
            </Button>
          }
        >
          {upNext.length ? (
            <ul className="flex flex-col gap-3">{upNext.map(row)}</ul>
          ) : (
            <p className="body-md text-(--text-secondary)">
              {todos.length
                ? "Nothing waiting to start."
                : "Nothing raised for this car yet. Add the first job to start prep."}
            </p>
          )}
        </LaneCard>

        {finished.length ? (
          <LaneCard lane="completed" count={finished.length}>
            <ul className="flex flex-col gap-3">{finished.map(row)}</ul>
          </LaneCard>
        ) : null}
      </div>

      {editing !== undefined ? (
        <PrepJobModal
          key={editing?.id ?? "new"}
          job={editing}
          vendors={vendors}
          onClose={() => setEditing(undefined)}
          onSave={(input) => (editing ? patch(editing.id, input) : add(input))}
        />
      ) : null}
      {confirmDialog}
    </Sheet>
  );
}
