"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { maintenanceService } from "@/lib/services/maintenance-service";
import { maintenanceNoteService } from "@/lib/services/maintenance-note-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { vendorService } from "@/lib/services/vendor-service";
import { authService } from "@/lib/services/auth-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import type {
  JobNoteType,
  MaintenanceJob,
  MaintenanceJobNote,
  MaintenanceStatus,
  User,
  Vehicle,
  Vendor,
} from "@/lib/types";
import { MAINTENANCE_STATUSES } from "@/lib/constants";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Layout,
  Page,
  PageActions,
  Select,
  TextField,
  type BadgeTone,
} from "@/components/polaris";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { RegPlate } from "@/components/shared/reg-plate";
import { EditJobDialog } from "@/components/maintenance/edit-job-dialog";
import {
  JobStatusBadge,
  jobStatusLabel,
} from "@/components/maintenance/job-status";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "@/lib/toast";

const NOTE_TYPES: { value: JobNoteType; label: string; tone?: BadgeTone }[] = [
  { value: "note", label: "Note" },
  { value: "call_log", label: "Call log", tone: "info" },
  { value: "status_update", label: "Status update", tone: "success" },
  { value: "vendor_update", label: "Vendor update", tone: "attention" },
];

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(-6).toUpperCase();
}

export default function MaintenanceJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, confirmDialog } = useConfirm();
  const { user, company } = useAuth();
  const [job, setJob] = useState<MaintenanceJob | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notes, setNotes] = useState<MaintenanceJobNote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<JobNoteType>("note");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!company) return;
    const j = await maintenanceService.getById(id);
    setJob(j);
    if (j) {
      const [v, n, u, ve] = await Promise.all([
        vehicleService.getById(j.vehicleId),
        maintenanceNoteService.getForJob(j.id),
        authService.getUsersForCompany(company.id),
        vendorService.getAll(company.id),
      ]);
      setVehicle(v);
      setNotes(n);
      setUsers(u);
      setVendors(ve);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, company]);

  async function handleAddNote() {
    if (!user || !job || !newNote.trim()) return;
    setSaving(true);
    try {
      await maintenanceNoteService.add({
        jobId: job.id,
        userId: user.id,
        noteType,
        content: newNote.trim(),
      });
      setNewNote("");
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: MaintenanceStatus) {
    if (!user || !job) return;
    await maintenanceService.updateStatus(job.id, newStatus, user.id);
    toast.success(`Status: ${newStatus.replace("_", " ")}`);
    void load();
  }

  async function handleAssign(assignedTo: string) {
    if (!user || !job) return;
    await maintenanceService.update(
      job.id,
      { assignedTo: assignedTo === "none" ? null : assignedTo },
      user.id,
    );
    toast.success("Owner updated");
    void load();
  }

  async function handleDelete() {
    if (!job) return;
    const ok = await confirm({
      title: "Delete maintenance job?",
      description: `This permanently deletes the job${vehicle ? ` for ${vehicle.registration}` : ""}. This cannot be undone.`,
      confirmText: "Delete job",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await maintenanceService.remove(job.id);
      toast.success("Job deleted");
      router.push("/maintenance");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete job");
      setDeleting(false);
    }
  }

  const backAction = { content: "Maintenance", url: "/maintenance" };

  if (job === undefined) {
    return (
      <Page title="Maintenance job" backAction={backAction}>
        <Skeleton className="h-96" />
      </Page>
    );
  }
  if (job === null) {
    return (
      <Page title="Maintenance job" backAction={backAction}>
        <Card padding="0">
          <EmptyState
            heading="Job not found"
            icon="CircleAlertMajor"
            action={{ content: "Back to maintenance", url: "/maintenance" }}
          >
            It may have been deleted, or the link is out of date.
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const noteTypeOf = (value: JobNoteType) =>
    NOTE_TYPES.find((t) => t.value === value);

  return (
    <Page
      title={`Job #${shortId(job.id)}`}
      subtitle={job.description}
      backAction={backAction}
      titleMetadata={<JobStatusBadge status={job.status} />}
      secondaryActions={[
        { content: "Edit job", icon: "EditMinor", onAction: () => setEditOpen(true) },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card title="Job details">
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <KV label="Estimated cost" value={formatCurrency(job.estimatedCost)} numeric />
              <KV label="Actual cost" value={formatCurrency(job.actualCost)} numeric />
              <KV label="Due date" value={formatDate(job.dueDate)} />
            </div>
          </Card>

          <Card title="Notes and activity">
            <div className="mt-3 flex flex-col gap-3">
              <Select
                label="Note type"
                options={NOTE_TYPES.map((nt) => ({
                  label: nt.label,
                  value: nt.value,
                }))}
                value={noteType}
                onChange={(v) => setNoteType(v as JobNoteType)}
              />
              <TextField
                label="Note"
                labelHidden
                multiline={3}
                value={newNote}
                onChange={setNewNote}
                placeholder="Add a note…"
              />
              <div className="flex justify-end">
                <Button
                  icon="PlusMinor"
                  onClick={() => void handleAddNote()}
                  disabled={!newNote.trim()}
                  loading={saving}
                >
                  Add note
                </Button>
              </div>
            </div>
            {notes.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-(--border-secondary) pt-4">
                {notes.map((n) => {
                  const author = users.find((u) => u.id === n.userId);
                  const nt = noteTypeOf(n.noteType);
                  return (
                    <li
                      key={n.id}
                      className="rounded-(--radius-200) bg-(--bg-surface-secondary) p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone={nt?.tone}>{nt?.label ?? n.noteType}</Badge>
                          <span className="body-sm-semibold">
                            {author?.name ?? "System"}
                          </span>
                        </div>
                        <span className="body-sm text-(--text-secondary)">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="body-md mt-1 whitespace-pre-wrap">
                        {n.content}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card title="Status">
            <div className="mt-3">
              <Select
                label="Status"
                labelHidden
                options={MAINTENANCE_STATUSES.map((s) => ({
                  label: jobStatusLabel(s.value),
                  value: s.value,
                }))}
                value={job.status}
                onChange={(v) => void handleStatusChange(v as MaintenanceStatus)}
              />
            </div>
          </Card>

          <Card title="Owner">
            <div className="mt-3">
              <Select
                label="Owner"
                labelHidden
                options={[
                  { label: "Unassigned", value: "none" },
                  ...users.map((u) => ({ label: u.name, value: u.id })),
                ]}
                value={job.assignedTo ?? "none"}
                onChange={(v) => void handleAssign(v)}
              />
            </div>
          </Card>

          {vehicle ? (
            <Card title="Vehicle">
              <div className="mt-3 flex flex-col items-start gap-2">
                <Link
                  href={vehicleDetailHref(vehicle.id, pathname)}
                  title="Open vehicle details"
                  className="transition-opacity hover:opacity-80"
                >
                  <RegPlate registration={vehicle.registration} />
                </Link>
                <span className="body-md">
                  {vehicle.make} {vehicle.model}
                </span>
                <span className="body-sm text-(--text-secondary)">
                  {vehicle.stockId}
                </span>
              </div>
            </Card>
          ) : null}
        </Layout.Section>
      </Layout>

      <PageActions
        secondaryActions={[
          {
            content: "Delete job",
            destructive: true,
            disabled: deleting,
            onAction: () => void handleDelete(),
          },
        ]}
      />

      <EditJobDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        job={job}
        vehicle={vehicle}
        vendors={vendors}
        users={users}
        onSaved={() => void load()}
      />

      {confirmDialog}
    </Page>
  );
}

function KV({
  label,
  value,
  numeric,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="rounded-(--radius-200) bg-(--bg-surface-secondary) p-3">
      <div className="body-sm text-(--text-secondary)">{label}</div>
      <div className={numeric ? "body-md-numeric mt-1" : "body-md mt-1"}>
        {value}
      </div>
    </div>
  );
}
