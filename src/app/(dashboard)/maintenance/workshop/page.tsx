"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  FormSelect,
  FormTextField,
  Labelled,
  Link as GenaroLink,
  Modal,
  OptionList,
  Page,
  Select,
  SkeletonBox,
  Tooltip,
  useConfirm,
} from "@/components/genaro";
// TODO(genaro): Genaro has no date or time field, so date and time inputs
// keep the app's own picker until it has one.
// eslint-disable-next-line no-restricted-imports
import { Input } from "@/components/ui/input";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  JobStatusBadge,
  jobStatusLabel,
} from "@/components/maintenance/job-status";
import { cn, formatCurrency, formatDate, formatTime12 } from "@/lib/utils";
import { toast } from "@/lib/toast";

const schema = z.object({
  customerName: z.string().min(1, "Enter the customer’s name"),
  customerPhone: z
    .string()
    .min(1, "Phone number is required")
    .refine(isValidUkPhone, { message: "Enter a valid UK phone number (e.g. 07712 345678 or 020 7946 0958)" }),
  vehicleReg: z.string().min(2, "Enter the vehicle reg"),
  vehicleDescription: z.string().min(1, "Describe the vehicle"),
  description: z.string().min(1, "Describe the job"),
  assignedTo: z.string(),
  estimatedCost: z.coerce.number().optional(),
  scheduledDate: z.string().min(1, "Choose a date"),
  scheduledTime: z.string().min(1, "Choose a time"),
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
  const formRef = useRef<HTMLFormElement>(null);
  const dateId = useId();
  const timeId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const { user, company } = useAuth();
  const companyId = company?.id;
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
    if (!companyId) return;
    void Promise.all([
      workshopService.getAll(companyId),
      authService.getUsersForCompany(companyId),
    ]).then(([j, u]) => {
      setJobs(j);
      setUsers(u);
    });
  }, [companyId]);

  function openAdd() {
    setEditingId(null);
    form.reset(emptyDefaults());
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    form.reset(emptyDefaults());
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
    if (!reg.trim()) return;
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
      <Modal
        open={open}
        onClose={closeForm}
        title={editingId ? "Edit workshop job" : "Add workshop job"}
        primaryAction={{
          content: editingId ? "Save changes" : "Save job",
          loading: form.formState.isSubmitting,
          onAction: () => formRef.current?.requestSubmit(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: closeForm }]}
      >
        <form
          ref={formRef}
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          // Save sits in the modal's footer, outside the form, so Enter in a
          // field submits here, as it did with a submit button in the form.
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.defaultPrevented &&
              e.target instanceof HTMLInputElement
            ) {
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormTextField
            control={form.control}
            name="customerName"
            label="Customer name"
          />
          <FormTextField
            control={form.control}
            name="customerPhone"
            label="Customer phone"
            type="tel"
          />
          <div className="font-code">
            <FormTextField
              control={form.control}
              name="vehicleReg"
              label="Vehicle reg"
              placeholder="AB12 CDE"
            />
          </div>
          <FormTextField
            control={form.control}
            name="vehicleDescription"
            label="Vehicle description"
            placeholder="Vauxhall Corsa 2014"
          />
          <div className="sm:col-span-2">
            <FormTextField
              control={form.control}
              name="description"
              label="Job description"
              placeholder="AC re-gas + cabin filter"
            />
          </div>
          <FormSelect
            control={form.control}
            name="assignedTo"
            label="Assigned to"
            options={[
              { label: "Unassigned", value: "none" },
              ...users.map((u) => ({ label: u.name, value: u.id })),
            ]}
          />
          <FormTextField
            control={form.control}
            name="estimatedCost"
            label="Estimated cost"
            type="number"
            prefix="£"
            step={0.01}
            inputMode="decimal"
            placeholder="0.00"
          />
          <Labelled
            id={dateId}
            label="Date"
            error={form.formState.errors.scheduledDate?.message}
          >
            <Input id={dateId} type="date" {...form.register("scheduledDate")} />
          </Labelled>
          <Labelled
            id={timeId}
            label="Time"
            error={form.formState.errors.scheduledTime?.message}
          >
            <Input id={timeId} type="time" {...form.register("scheduledTime")} />
          </Labelled>
          <div className="sm:col-span-2">
            <FormTextField
              control={form.control}
              name="notes"
              label="Notes"
              multiline={2}
            />
          </div>
        </form>
      </Modal>

      {!jobs ? (
        <SkeletonBox height={256} />
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
              <Card padding="0">
                <OptionList
                  options={jobs.map((j) => ({
                    value: j.id,
                    label: (
                      <span className="flex min-w-0 items-center gap-3 text-left">
                        <span
                          aria-label={jobStatusLabel(j.status)}
                          role="img"
                          className={cn(
                            "size-2 shrink-0 rounded-(--radius-full)",
                            STATUS_DOT[j.status],
                          )}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-semibold">{j.customerName}</span>
                          <span className="body-sm truncate text-(--text-secondary)">
                            {`${j.vehicleReg} · ${formatTime12(j.scheduledTime)}`}
                          </span>
                        </span>
                      </span>
                    ),
                  }))}
                  selected={selected ? [selected.id] : []}
                  onChange={([id]) => setSelectedId(id)}
                />
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
                          className="mt-0.5 inline-flex items-center gap-1.5 text-body text-(--text-secondary) hover:text-(--text) hover:underline"
                        >
                          <Phone className="size-3.5" />
                          {selected.customerPhone}
                        </a>
                      ) : (
                        <span className="mt-0.5 inline-flex items-center gap-1.5 text-body text-(--text-secondary)">
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
                        {/* A plate-shaped link; a Genaro Button would wrap the
                            plate in its own chrome. */}
                        <Tooltip content="Open vehicle details">
                          <GenaroLink
                            removeUnderline
                            onClick={() =>
                              void openVehicleFromReg(selected.vehicleReg)
                            }
                          >
                            <RegPlate
                              registration={selected.vehicleReg}
                              size="sm"
                            />
                          </GenaroLink>
                        </Tooltip>
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
