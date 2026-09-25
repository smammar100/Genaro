"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Wrench,
  Phone,
  CalendarClock,
  Car,
  User as UserIcon,
  CircleDot,
  PoundSterling,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidUkPhone } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { workshopService } from "@/lib/services/workshop-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { authService } from "@/lib/services/auth-service";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type {
  MaintenanceStatus,
  User,
  WorkshopJob,
} from "@/lib/types";
import { MAINTENANCE_STATUSES } from "@/lib/constants";
import {
  Button,
  Card,
  EmptyState,
  Page,
  Select,
} from "@/components/polaris";
import { ResourceList, ResourceListItem } from "@/components/ui/resource-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  JobStatusBadge,
  jobStatusLabel,
} from "@/components/maintenance/job-status";
import { cn, formatCurrency, formatDate, formatTime12 } from "@/lib/utils";
import { toast } from "@/lib/toast";

const schema = z.object({
  customerName: z.string().min(1),
  customerPhone: z
    .string()
    .min(1, "Phone number is required")
    .refine(isValidUkPhone, { message: "Enter a valid UK phone number (e.g. 07712 345678 or 020 7946 0958)" }),
  vehicleReg: z.string().min(2),
  vehicleDescription: z.string().min(1),
  description: z.string().min(1),
  assignedTo: z.string(),
  estimatedCost: z.coerce.number().optional(),
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().min(1),
  notes: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const STATUS_DOT: Record<MaintenanceStatus, string> = {
  pending: "bg-(--bg-fill-caution)",
  in_progress: "bg-(--bg-fill-info)",
  completed: "bg-(--bg-fill-success)",
  stalled: "bg-(--bg-fill-critical)",
};

export default function WorkshopPage() {
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const phoneId = `${baseId}-phone`;
  const regId = `${baseId}-reg`;
  const descVehicleId = `${baseId}-desc-vehicle`;
  const jobDescId = `${baseId}-job-desc`;
  const assignedId = `${baseId}-assigned`;
  const costId = `${baseId}-cost`;
  const dateId = `${baseId}-date`;
  const timeId = `${baseId}-time`;
  const notesId = `${baseId}-notes`;
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const { user, company } = useAuth();
  const [jobs, setJobs] = useState<WorkshopJob[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const emptyDefaults = (): FormInput => ({
    customerName: "",
    customerPhone: "",
    vehicleReg: "",
    vehicleDescription: "",
    description: "",
    assignedTo: "none",
    estimatedCost: undefined,
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: "10:00",
    notes: "",
  });

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      workshopService.getAll(company.id),
      authService.getUsersForCompany(company.id),
    ]).then(([j, u]) => {
      setJobs(j);
      setUsers(u);
    });
  }, [company]);

  function openAdd() {
    setEditingId(null);
    form.reset(emptyDefaults());
    setOpen(true);
  }

  function openEdit(j: WorkshopJob) {
    setEditingId(j.id);
    form.reset({
      customerName: j.customerName,
      customerPhone: j.customerPhone,
      vehicleReg: j.vehicleReg,
      vehicleDescription: j.vehicleDescription,
      description: j.description,
      assignedTo: j.assignedTo ?? "none",
      estimatedCost: j.estimatedCost ?? undefined,
      scheduledDate: j.scheduledDate,
      scheduledTime: j.scheduledTime,
      notes: j.notes ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: FormOutput) {
    if (!user || !company) return;
    const payload = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      vehicleReg: values.vehicleReg,
      vehicleDescription: values.vehicleDescription,
      description: values.description,
      assignedTo: values.assignedTo === "none" ? null : values.assignedTo,
      estimatedCost: values.estimatedCost ?? null,
      scheduledDate: values.scheduledDate,
      scheduledTime: values.scheduledTime,
      notes: values.notes || null,
    };
    if (editingId) {
      await workshopService.update(editingId, payload);
    } else {
      await workshopService.create({ companyId: company.id, ...payload }, user.id);
    }
    setJobs(await workshopService.getAll(company.id));
    toast.success(editingId ? "Workshop job updated" : "Workshop job created");
    form.reset(emptyDefaults());
    setEditingId(null);
    setOpen(false);
  }

  async function handleStatus(id: string, status: MaintenanceStatus) {
    await workshopService.updateStatus(id, status);
    if (!company) return;
    setJobs(await workshopService.getAll(company.id));
  }

  /**
   * Workshop jobs store the plate as free text (no vehicle FK), so resolve it
   * against stock on demand. Navigates when a match exists; otherwise says so.
   */
  async function openVehicleFromReg(reg: string) {
    if (!reg?.trim()) return;
    try {
      const vehicle = await vehicleService.getByRegistration(
        reg,
        company?.id,
      );
      if (vehicle) router.push(vehicleDetailHref(vehicle.id, pathname));
      else toast.error(`No stock vehicle matches ${reg}.`);
    } catch {
      toast.error("Couldn't look up that vehicle.");
    }
  }

  async function handleDelete(j: WorkshopJob) {
    if (!company) return;
    const ok = await confirm({
      title: "Delete workshop job?",
      description: `This permanently deletes the job for ${j.customerName} (${j.vehicleReg}). This cannot be undone.`,
      confirmText: "Delete job",
      destructive: true,
    });
    if (!ok) return;
    try {
      await workshopService.remove(j.id);
      if (selectedId === j.id) setSelectedId(null);
      setJobs(await workshopService.getAll(company.id));
      toast.success("Workshop job deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete job");
    }
  }

  const isEmpty = jobs !== null && jobs.length === 0;

  return (
    <Page
      title="Workshop"
      subtitle="External, walk-in customer service jobs, kept separate from internal stock preparation."
      fullWidth
      // The empty state carries the one primary action when there are no jobs.
      primaryAction={
        isEmpty ? undefined : { content: "Add workshop job", onAction: openAdd }
      }
    >
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setEditingId(null);
            form.reset(emptyDefaults());
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit workshop job" : "Add workshop job"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 px-6 pb-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>Customer name</Label>
                <Input id={nameId} {...form.register("customerName")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={phoneId}>Customer phone</Label>
                <Input id={phoneId} {...form.register("customerPhone")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={regId}>Vehicle reg</Label>
                <Input
                  id={regId}
                  {...form.register("vehicleReg")}
                  className="font-mono"
                  placeholder="AB12 CDE"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={descVehicleId}>Vehicle description</Label>
                <Input
                  id={descVehicleId}
                  {...form.register("vehicleDescription")}
                  placeholder="Vauxhall Corsa 2014"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor={jobDescId}>Job description</Label>
                <Input
                  id={jobDescId}
                  {...form.register("description")}
                  placeholder="AC re-gas + cabin filter"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={assignedId}>Assigned to</Label>
                <UiSelect
                  items={{
                    none: "Unassigned",
                    ...Object.fromEntries(users.map((u) => [u.id, u.name])),
                  }}
                  value={form.watch("assignedTo")}
                  onValueChange={(v) => form.setValue("assignedTo", v)}
                >
                  <SelectTrigger id={assignedId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={costId}>Estimated cost</Label>
                <Input
                  id={costId}
                  type="number"
                  step="0.01"
                  {...form.register("estimatedCost")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={dateId}>Date</Label>
                <Input id={dateId} type="date" {...form.register("scheduledDate")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={timeId}>Time</Label>
                <Input id={timeId} type="time" {...form.register("scheduledTime")} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor={notesId}>Notes</Label>
                <Textarea id={notesId} {...form.register("notes")} className="min-h-16" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                submit
                variant="primary"
                loading={form.formState.isSubmitting}
              >
                {editingId ? "Save changes" : "Save job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!jobs ? (
        <Skeleton className="h-64" />
      ) : isEmpty ? (
        <Card padding="0">
          <EmptyState
            heading="No workshop jobs"
            icon={<Wrench className="fill-none" />}
            action={{ content: "Add workshop job", onAction: openAdd }}
          >
            Track customer walk-in service appointments here.
          </EmptyState>
        </Card>
      ) : (
        (() => {
          const selected =
            jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null;
          return (
            <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
              {/* Job list */}
              <Card padding="0" className="p-2">
                <ResourceList aria-label="Workshop jobs">
                  {jobs.map((j) => {
                    const isSel = selected?.id === j.id;
                    return (
                      <ResourceListItem
                        key={j.id}
                        aria-current={isSel ? "true" : undefined}
                        className={cn(isSel && "bg-(--bg-surface-selected)")}
                        onClick={() => setSelectedId(j.id)}
                        icon={<UserIcon />}
                        title={j.customerName}
                        description={`${j.vehicleReg} · ${formatTime12(j.scheduledTime)}`}
                        trailing={
                          <span
                            aria-label={jobStatusLabel(j.status)}
                            role="img"
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              STATUS_DOT[j.status],
                            )}
                          />
                        }
                      />
                    );
                  })}
                </ResourceList>
              </Card>

              {/* Booking detail */}
              {selected && (
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="heading-sm">{selected.customerName}</h2>
                        <JobStatusBadge status={selected.status} />
                      </div>
                      {selected.customerPhone ? (
                        <a
                          href={`tel:${selected.customerPhone}`}
                          className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-(--text) hover:underline"
                        >
                          <Phone className="size-3.5" />
                          {selected.customerPhone}
                        </a>
                      ) : (
                        <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-(--text-secondary)">
                          <Phone className="size-3.5" />
                          Walk-in
                        </span>
                      )}
                    </div>
                    <div className="w-40">
                      <Select
                        label="Status"
                        labelHidden
                        options={MAINTENANCE_STATUSES.map((s) => ({
                          label: jobStatusLabel(s.value),
                          value: s.value,
                        }))}
                        value={selected.status}
                        onChange={(v) =>
                          void handleStatus(selected.id, v as MaintenanceStatus)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field icon={Car} label="Vehicle">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {/* A plate-shaped link; a Polaris Button would wrap the
                            plate in its own chrome. */}
                        <button
                          type="button"
                          onClick={() =>
                            void openVehicleFromReg(selected.vehicleReg)
                          }
                          className="rounded-(--radius-100) transition-opacity hover:opacity-80"
                          title="Open vehicle details"
                        >
                          <RegPlate
                            registration={selected.vehicleReg}
                            size="sm"
                          />
                        </button>
                        <span className="text-(--text-secondary)">
                          {selected.vehicleDescription}
                        </span>
                      </span>
                    </Field>
                    <Field icon={CalendarClock} label="Scheduled">
                      {formatDate(selected.scheduledDate)} ·{" "}
                      {formatTime12(selected.scheduledTime)}
                    </Field>
                    <Field icon={UserIcon} label="Assigned to">
                      {users.find((u) => u.id === selected.assignedTo)?.name ??
                        "Unassigned"}
                    </Field>
                    <Field icon={PoundSterling} label="Cost">
                      <span className="body-md-numeric font-semibold">
                        {formatCurrency(
                          selected.actualCost ?? selected.estimatedCost,
                        )}
                      </span>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field icon={CircleDot} label="Job">
                        {selected.description}
                      </Field>
                    </div>
                    {selected.notes ? (
                      <div className="sm:col-span-2">
                        <Field icon={Wrench} label="Notes">
                          <span className="whitespace-pre-wrap">
                            {selected.notes}
                          </span>
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-(--border-secondary) pt-4">
                    <Button
                      tone="critical"
                      onClick={() => void handleDelete(selected)}
                    >
                      Delete job
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => openEdit(selected)}>
                        Edit job
                      </Button>
                      <Button
                        tone="success"
                        onClick={() =>
                          void handleStatus(selected.id, "completed")
                        }
                        disabled={selected.status === "completed"}
                      >
                        Mark complete
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          );
        })()
      )}

      {confirmDialog}
    </Page>
  );
}

/** One labelled detail cell in the booking panel. */
function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-(--radius-200) bg-(--bg-surface-secondary) p-3">
      <div className="body-sm mb-1 inline-flex items-center gap-1.5 text-(--text-secondary)">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="body-md">{children}</div>
    </div>
  );
}
