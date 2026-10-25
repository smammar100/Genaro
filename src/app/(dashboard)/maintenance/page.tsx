"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  CirclePause,
  Clock,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { maintenanceService } from "@/lib/services/maintenance-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { vendorService } from "@/lib/services/vendor-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { authService } from "@/lib/services/auth-service";
import type {
  MaintenanceJob,
  MaintenanceStatus,
  User,
  Vehicle,
  Vendor,
} from "@/lib/types";
import { MAINTENANCE_STATUSES } from "@/lib/constants";
import {
  ActionMenu,
  Button,
  Card,
  EmptyState,
  Page,
  useConfirm,
} from "@/components/genaro";
import { QuickBookModal } from "@/components/calendar/quick-book-modal";
import { EditJobDialog } from "@/components/maintenance/edit-job-dialog";
import { jobStatusLabel } from "@/components/maintenance/job-status";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import { KanbanBoard, KanbanSkeleton } from "@/components/kanban/kanban-board";
import {
  KanbanCard,
  KanbanPlate,
  type KanbanFact,
} from "@/components/kanban/kanban-card";
import {
  dayDate,
  daysUntil,
  overdueText,
  shortDate,
  todayKey,
} from "@/components/kanban/card-dates";
import type { KanbanColumn } from "@/components/kanban/stage-icon";
import { formatCurrency, formatRegPlate } from "@/lib/utils";
import { toast } from "@/lib/toast";

// The add-job sheet only opens from "Add job", so it loads in its own chunk
// after the board rather than with it.
const AddEventSheet = dynamic(
  () => import("@/components/shared/add-event-sheet").then((m) => m.AddEventSheet),
  { ssr: false },
);

/** Each status's place on the board: on the path, the end of it, or off it. */
const STATUS_COLUMN: Record<
  MaintenanceStatus,
  Pick<KanbanColumn, "tone" | "kind" | "glyph">
> = {
  pending: { tone: "neutral", kind: "open" },
  in_progress: { tone: "info", kind: "open" },
  completed: { tone: "success", kind: "done" },
  stalled: { tone: "caution", kind: "exception", glyph: "pause" },
};

const COLUMNS: KanbanColumn[] = MAINTENANCE_STATUSES.map((s) => ({
  id: s.value,
  label: jobStatusLabel(s.value),
  ...STATUS_COLUMN[s.value],
}));

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(-6).toUpperCase();
}

/** "1.5h", "2h". */
const hours = (h: number) => `${Number(h.toFixed(1))}h`;

/**
 * The job's date line. An open job counts down to its due date in words and
 * tone (overdue in red with how late, today in caution), then the booked time
 * and the estimated length; a completed job shows when it finished.
 */
function dueFact(job: MaintenanceJob): KanbanFact {
  if (job.status === "completed") {
    return {
      icon: CircleCheck,
      tone: "success",
      text: job.completedDate ? `Completed ${shortDate(job.completedDate)}` : "Completed",
    };
  }
  const time = job.scheduledTime ? job.scheduledTime.slice(0, 5) : null;
  const length = job.estimatedDurationHours
    ? `${hours(job.estimatedDurationHours)} est.`
    : undefined;
  if (!job.dueDate) {
    return { icon: CalendarDays, tone: "muted", text: "No due date", detail: length };
  }
  const days = daysUntil(job.dueDate);
  const date = dayDate(job.dueDate);
  if (days < 0) {
    return {
      icon: TriangleAlert,
      tone: "critical",
      text: overdueText(days),
      detail: date,
      title: `Was due ${date}`,
    };
  }
  if (days === 0) {
    return { icon: Clock, tone: "caution", text: time ? `Today, ${time}` : "Due today", detail: length };
  }
  const day = days === 1 ? "Tomorrow" : date;
  return {
    icon: CalendarDays,
    text: time ? `${day}, ${time}` : `Due ${day.toLowerCase() === "tomorrow" ? "tomorrow" : day}`,
    detail: length,
  };
}

/**
 * Order within a column, which also places the drop slot: open jobs by due
 * date, undated last (the service's own order); completed jobs newest first.
 */
function compareJobs(a: MaintenanceJob, b: MaintenanceJob, column: string): number {
  if (column === "completed") {
    return (b.completedDate ?? "9999").localeCompare(a.completedDate ?? "9999");
  }
  return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
}

/** A job as it will be once moved: completing it stamps today. */
function movedJob(job: MaintenanceJob, status: string): MaintenanceJob {
  return {
    ...job,
    status: status as MaintenanceStatus,
    completedDate:
      status === "completed" ? (job.completedDate ?? todayKey()) : job.completedDate,
  };
}

export default function MaintenancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const { user, company } = useAuth();
  const companyId = company?.id;
  const [jobs, setJobs] = useState<MaintenanceJob[] | null>(null);
  const [editJob, setEditJob] = useState<MaintenanceJob | null>(null);
  const [bookJob, setBookJob] = useState<MaintenanceJob | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  function refetch() {
    if (!company) return;
    void maintenanceService.getAll(company.id).then(setJobs);
  }

  useEffect(() => {
    if (!companyId) return;
    void Promise.all([
      maintenanceService.getAll(companyId),
      vehicleService.getAll(companyId),
      vendorService.getAll(companyId),
      authService.getUsersForCompany(companyId),
    ]).then(([j, v, ve, u]) => {
      setJobs(j);
      setVehicles(v);
      setVendors(ve);
      setUsers(u);
    });
  }, [companyId]);

  const liveJobs = useMemo(() => {
    if (!jobs) return null;
    // Auto-archive: jobs completed more than 6 months ago drop off the live
    // pipeline (they remain in history / the master sheet).
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    return jobs.filter(
      (j) =>
        !(j.status === "completed" && j.completedDate && j.completedDate < cutoffDate),
    );
  }, [jobs]);

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const vendorById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  async function handleMove(id: string, status: MaintenanceStatus) {
    if (!user || !company || !jobs) return;
    const job = jobs.find((j) => j.id === id);
    if (!job || job.status === status) return;
    const before = jobs;
    // Optimistic, as on the sales board (GEN-70): the card lands the moment
    // it's dropped rather than after the write and a full refetch.
    setJobs(jobs.map((j) => (j.id === id ? movedJob(j, status) : j)));
    try {
      await maintenanceService.updateStatus(id, status, user.id);
      setJobs(await maintenanceService.getAll(company.id));
      toast.success("Job moved");
    } catch (e) {
      setJobs(before);
      toast.error(e instanceof Error ? e.message : "Couldn't move the job");
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!company) return;
    const ok = await confirm({
      title: "Delete maintenance job?",
      description: `This permanently deletes the job for ${label}. This cannot be undone.`,
      confirmText: "Delete job",
      destructive: true,
    });
    if (!ok) return;
    try {
      await maintenanceService.remove(id);
      setJobs(await maintenanceService.getAll(company.id));
      toast.success("Job deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete job");
    }
  }

  const isEmpty = liveJobs !== null && liveJobs.length === 0;

  return (
    <Page
      title="Maintenance pipeline"
      subtitle="Track every repair and prep job through its stages, from booked to completed, across all your stock."
      fullWidth
      // The empty state carries the one primary action when there are no jobs.
      primaryAction={
        isEmpty
          ? undefined
          : { content: "Add job", onAction: () => setAddOpen(true) }
      }
    >
      {!liveJobs ? (
        <KanbanSkeleton columns={COLUMNS.length} />
      ) : isEmpty ? (
        <Card padding="0">
          <EmptyState
            heading="No maintenance jobs yet"
            icon={<Wrench className="fill-none" />}
            action={{ content: "Add job", onAction: () => setAddOpen(true) }}
          >
            Add a job, or add a vehicle to auto-create a pending one.
          </EmptyState>
        </Card>
      ) : (
        <KanbanBoard
          id="maintenance-jobs"
          columns={COLUMNS}
          items={liveJobs}
          getId={(j) => j.id}
          getColumnId={(j) => j.status}
          compare={compareJobs}
          moved={movedJob}
          onMove={(id, status) => void handleMove(id, status as MaintenanceStatus)}
          onAdd={() => setAddOpen(true)}
          addLabel="Add job"
          noun={{ one: "job", many: "jobs" }}
          renderCard={(j) => {
            const v = vehicleById.get(j.vehicleId);
            const vendor = j.vendorId ? vendorById.get(j.vendorId) : undefined;
            const assignee = j.assignedTo ? userById.get(j.assignedTo) : undefined;
            const cost = j.actualCost ?? j.estimatedCost;
            const jobHref = `/maintenance/jobs/${j.id}`;
            const jobLabel = v ? formatRegPlate(v.registration) : `#${shortId(j.id)}`;
            return (
              <KanbanCard
                onOpen={() => router.push(jobHref)}
                thumbnail={
                  v && PHOTOS_ENABLED ? (
                    <VehicleImage
                      vehicle={v}
                      variant="thumb"
                      sizes="48px"
                      className="w-12 rounded-(--radius-200)"
                    />
                  ) : undefined
                }
                identity={
                  v ? (
                    <KanbanPlate
                      registration={v.registration}
                      href={vehicleDetailHref(v.id, pathname)}
                      title="Open vehicle"
                    />
                  ) : (
                    <span className="body-sm text-(--text-secondary)">No vehicle</span>
                  )
                }
                reference={`#${shortId(j.id)}`}
                vehicle={v ? `${v.make} ${v.model}` : undefined}
                title={
                  <Link href={jobHref} draggable={false} className="hover:underline">
                    {j.description}
                  </Link>
                }
                titleText={j.description}
                facts={[
                  dueFact(j),
                  vendor
                    ? { icon: Wrench, text: vendor.name, title: "Garage" }
                    : { icon: Wrench, tone: "muted", text: "No garage" },
                ]}
                note={
                  j.status === "stalled"
                    ? {
                        icon: CirclePause,
                        tone: "caution",
                        text: j.notes?.trim()
                          ? `Stalled: ${j.notes.trim()}`
                          : "Stalled, no reason given",
                      }
                    : undefined
                }
                person={{ name: assignee?.name, empty: "Unassigned" }}
                money={
                  cost
                    ? {
                        value: formatCurrency(cost),
                        kind: j.actualCost != null ? "actual" : "estimate",
                      }
                    : undefined
                }
                quickAction={
                  j.status !== "completed" ? (
                    <Button
                      variant="tertiary"
                      size="micro"
                      icon={<CalendarPlus />}
                      accessibilityLabel={`Book appointment for ${j.description}`}
                      title="Book appointment"
                      onClick={() => setBookJob(j)}
                    />
                  ) : undefined
                }
                menu={
                  <ActionMenu
                    accessibilityLabel={`Job actions for ${jobLabel}`}
                    size="micro"
                    preferredAlignment="right"
                    sections={[
                      {
                        items: [
                          ...(j.status !== "completed"
                            ? [
                                {
                                  content: "Book appointment",
                                  icon: <CalendarPlus />,
                                  onAction: () => setBookJob(j),
                                },
                              ]
                            : []),
                          { content: "Edit job", icon: "EditMinor", onAction: () => setEditJob(j) },
                        ],
                      },
                      {
                        items: [
                          {
                            content: "Delete job",
                            icon: "DeleteMinor",
                            destructive: true,
                            onAction: () => void handleDelete(j.id, jobLabel),
                          },
                        ],
                      },
                    ]}
                  />
                }
              />
            );
          }}
        />
      )}

      <AddEventSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        lockKind="maintenance"
        onCreated={refetch}
      />

      <EditJobDialog
        open={editJob !== null}
        onOpenChange={(o) => {
          if (!o) setEditJob(null);
        }}
        job={editJob}
        vehicle={editJob ? (vehicleById.get(editJob.vehicleId) ?? null) : null}
        vendors={vendors}
        users={users}
        onSaved={refetch}
      />

      <QuickBookModal
        booking={bookJob ? { kind: "maint", job: bookJob } : null}
        vehicles={vehicles}
        onClose={() => setBookJob(null)}
        onBooked={refetch}
      />

      {confirmDialog}
    </Page>
  );
}
