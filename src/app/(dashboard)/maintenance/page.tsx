"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Wrench,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  CircleAlert,
  MoreHorizontal,
  Pencil,
  Trash2,
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
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Page,
  type BadgeTone,
} from "@/components/polaris";
import { Skeleton } from "@/components/ui/skeleton";
import { RowActionButton } from "@/components/ui/resource-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddEventSheet } from "@/components/shared/add-event-sheet";
import { EditJobDialog } from "@/components/maintenance/edit-job-dialog";
import { jobStatusLabel } from "@/components/maintenance/job-status";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn, formatCurrency, formatDate, formatRegPlate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { DragHandle } from "@/components/shared/drag-handle";

const STATUS_META: Record<
  MaintenanceStatus,
  { Icon: typeof CircleDashed; tone: string }
> = {
  pending: { Icon: CircleDashed, tone: "text-(--icon-secondary)" },
  in_progress: { Icon: CircleDot, tone: "text-(--icon-info)" },
  completed: { Icon: CheckCircle2, tone: "text-(--icon-success)" },
  stalled: { Icon: CircleAlert, tone: "text-(--icon-caution)" },
};

type Urgency = "overdue" | "today" | "week" | "later" | "done";
const URGENCY_BADGE: Record<
  Exclude<Urgency, "later" | "done">,
  { tone: BadgeTone; label: string }
> = {
  overdue: { tone: "critical", label: "Overdue" },
  today: { tone: "attention", label: "Due today" },
  week: { tone: "info", label: "This week" },
};

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(-6).toUpperCase();
}

/** Derive an at-a-glance urgency from the job's due date (open jobs only). */
function urgencyOf(job: MaintenanceJob): Urgency {
  if (job.status === "completed") return "done";
  if (!job.dueDate) return "later";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${job.dueDate.slice(0, 10)}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "later" || urgency === "done") return null;
  const { tone, label } = URGENCY_BADGE[urgency];
  return (
    <Badge tone={tone} icon={urgency === "overdue" ? "AlertMinor" : undefined}>
      {label}
    </Badge>
  );
}

export default function MaintenancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const { user, company } = useAuth();
  const [jobs, setJobs] = useState<MaintenanceJob[] | null>(null);
  const [editJob, setEditJob] = useState<MaintenanceJob | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overLane, setOverLane] = useState<MaintenanceStatus | null>(null);

  function refetch() {
    if (!company) return;
    void maintenanceService.getAll(company.id).then(setJobs);
  }

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      maintenanceService.getAll(company.id),
      vehicleService.getAll(company.id),
      vendorService.getAll(company.id),
      authService.getUsersForCompany(company.id),
    ]).then(([j, v, ve, u]) => {
      setJobs(j);
      setVehicles(v);
      setVendors(ve);
      setUsers(u);
    });
  }, [company]);

  const grouped = useMemo(() => {
    if (!jobs) return null;
    // Auto-archive: jobs completed more than 6 months ago drop off the live
    // pipeline (they remain in history / the master sheet).
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const map: Record<MaintenanceStatus, MaintenanceJob[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      stalled: [],
    };
    for (const j of jobs) {
      if (
        j.status === "completed" &&
        j.completedDate &&
        j.completedDate < cutoffDate
      ) {
        continue;
      }
      map[j.status].push(j);
    }
    return map;
  }, [jobs]);

  async function handleMove(id: string, status: MaintenanceStatus) {
    if (!user || !company) return;
    await maintenanceService.updateStatus(id, status, user.id);
    setJobs(await maintenanceService.getAll(company.id));
    toast.success("Job moved");
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

  const totalJobs = grouped
    ? Object.values(grouped).reduce((n, l) => n + l.length, 0)
    : 0;
  const isEmpty = grouped !== null && totalJobs === 0;

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
      {!grouped ? (
        <div className="grid gap-3 lg:grid-cols-4">
          {MAINTENANCE_STATUSES.map((s) => (
            <Skeleton key={s.value} className="h-72" />
          ))}
        </div>
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
        <div className="grid items-start gap-3 lg:grid-cols-4">
          {MAINTENANCE_STATUSES.map((status) => {
            const list = grouped[status.value];
            const { Icon, tone } = STATUS_META[status.value];
            return (
              <div
                key={status.value}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setOverLane(status.value);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const job = dragId
                    ? jobs?.find((x) => x.id === dragId)
                    : undefined;
                  if (dragId && job && job.status !== status.value) {
                    void handleMove(dragId, status.value);
                  }
                  setDragId(null);
                  setOverLane(null);
                }}
                className={cn(
                  "flex min-h-32 flex-col gap-2 rounded-(--radius-300) bg-(--bg-surface-secondary) p-2 transition-colors",
                  dragId &&
                    overLane === status.value &&
                    "bg-(--bg-surface-secondary-selected) ring-2 ring-(--border-emphasis)",
                )}
              >
                <div className="flex items-center gap-1.5 px-1.5 pt-1 pb-0.5">
                  <Icon className={cn("size-3.5", tone)} />
                  <h2 className="heading-sm">
                    {jobStatusLabel(status.value)}
                  </h2>
                  <Badge>{String(list.length)}</Badge>
                </div>
                <div className="flex max-h-[calc(100dvh-22rem)] min-h-12 flex-col gap-2 overflow-y-auto pr-0.5">
                  {list.length === 0 ? (
                    <Button
                      variant="tertiary"
                      icon="PlusMinor"
                      fullWidth
                      onClick={() => setAddOpen(true)}
                    >
                      Add job
                    </Button>
                  ) : (
                    list.map((j) => {
                      const v = vehicles.find((x) => x.id === j.vehicleId);
                      const vendor = vendors.find((x) => x.id === j.vendorId);
                      const assignee = users.find((u) => u.id === j.assignedTo);
                      const cardTotal = j.actualCost ?? j.estimatedCost;
                      const cardDate =
                        j.completedDate ?? j.dueDate ?? j.startDate;
                      const urgency = urgencyOf(j);
                      return (
                        <article
                          key={j.id}
                          draggable
                          onDragStart={(e) => {
                            setDragId(j.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", j.id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setOverLane(null);
                          }}
                          className={cn(
                            "group/card relative shrink-0 cursor-grab active:cursor-grabbing",
                            dragId === j.id && "opacity-50",
                          )}
                        >
                          <Card
                            padding="0"
                            className={cn(
                              "flex flex-col",
                              urgency === "overdue" &&
                                "ring-1 ring-(--border-critical-secondary)",
                            )}
                          >
                          {/* On the card's left edge rather than in the
                              header row. These columns are narrow enough that
                              the registration already truncates, and an inline
                              grip took another 20px off it. The rows all carry
                              px-3, so a grip in that padding costs the layout
                              nothing. */}
                          <DragHandle className="absolute left-0 top-1/2 z-10 -translate-y-1/2 [&_svg]:size-3" />
                          {/* Accent header — reg + job # */}
                          <div className="flex items-center justify-between gap-2 border-b border-(--border-secondary) px-3 py-2">
                            <div className="flex min-w-0 items-baseline gap-2">
                              {v ? (
                                <>
                                  {/* The plate is what identifies the car,
                                      so it is the thing that must never be cut.
                                      It used to `truncate` while the job id sat
                                      `shrink-0` beside it, which is backwards:
                                      the id took a fixed 50px of a 121px row and
                                      the plate absorbed the whole shortfall,
                                      rendering "L400 JCM" as "L400…" (GEN-115).
                                      Swap the priority -- the plate keeps its
                                      width, the id yields what is left. */}
                                  <Link
                                    href={vehicleDetailHref(v.id, pathname)}
                                    className="shrink-0 font-mono text-sm font-semibold hover:underline"
                                  >
                                    {formatRegPlate(v.registration)}
                                  </Link>
                                  <Link
                                    href={`/maintenance/jobs/${j.id}`}
                                    title={`Job #${shortId(j.id)}`}
                                    className="body-sm min-w-0 truncate text-(--text-secondary) hover:text-(--text) hover:underline"
                                  >
                                    #{shortId(j.id)}
                                  </Link>
                                </>
                              ) : (
                                <Link
                                  href={`/maintenance/jobs/${j.id}`}
                                  className="font-mono text-sm font-semibold hover:underline"
                                >
                                  #{shortId(j.id)}
                                </Link>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <RowActionButton aria-label="Job actions">
                                    <MoreHorizontal />
                                  </RowActionButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setEditJob(j)}
                                  >
                                    <Pencil className="mr-2 size-3.5" />
                                    Edit job
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-(--text-critical)"
                                    onClick={() =>
                                      void handleDelete(
                                        j.id,
                                        v ? formatRegPlate(v.registration) : `#${shortId(j.id)}`,
                                      )
                                    }
                                  >
                                    <Trash2 className="mr-2 size-3.5" />
                                    Delete job
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Body — click opens the job detail. The header
                              (reg link, job# link, actions menu) sits outside
                              this element, so those keep their own behaviour. */}
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex cursor-pointer flex-col gap-2 p-3 transition-colors hover:bg-(--bg-surface-hover)"
                            onClick={(e) => {
                              // A completed drag doesn't fire a click, but guard
                              // anyway; also ignore clicks bubbling from any
                              // interactive child.
                              if (dragId) return;
                              if (
                                (e.target as HTMLElement).closest(
                                  "a,button,[role=menuitem]",
                                )
                              )
                                return;
                              router.push(`/maintenance/jobs/${j.id}`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/maintenance/jobs/${j.id}`);
                              }
                            }}
                          >
                            {cardTotal ? (
                              <span className="body-md-numeric font-semibold">
                                {formatCurrency(cardTotal)}
                              </span>
                            ) : null}

                            <p className="body-md line-clamp-2">
                              {j.description}
                            </p>

                            {(vendor || v) && (
                              <div className="flex flex-wrap gap-1">
                                {vendor && <Badge>{vendor.name}</Badge>}
                                {v && (
                                  <Badge>{`${v.make} ${v.model}`}</Badge>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="body-sm text-(--text-secondary)">
                                  {cardDate ? formatDate(cardDate) : "—"}
                                </span>
                                <UrgencyBadge urgency={urgency} />
                              </div>
                              {assignee ? (
                                <span title={assignee.name} className="inline-flex">
                                  <Avatar size="sm" name={assignee.name} />
                                </span>
                              ) : vendor ? (
                                <span title={vendor.name} className="inline-flex">
                                  <Avatar size="sm" name={vendor.name} />
                                </span>
                              ) : (
                                <span title="Unassigned" className="inline-flex">
                                  <Avatar size="sm" accessibilityLabel="Unassigned" />
                                </span>
                              )}
                            </div>
                          </div>
                          </Card>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
        vehicle={
          editJob
            ? (vehicles.find((v) => v.id === editJob.vehicleId) ?? null)
            : null
        }
        vendors={vendors}
        users={users}
        onSaved={refetch}
      />

      {confirmDialog}
    </Page>
  );
}
