"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { inspectionService } from "@/lib/services/inspection-service";
import { inspectionNoteService } from "@/lib/services/inspection-note-service";
import { inspectionChecklistService } from "@/lib/services/inspection-checklist-service";
import { authService } from "@/lib/services/auth-service";
import { NEGATIVE_INSPECTION_STATUSES } from "@/lib/constants";
import type {
  InspectionCheck,
  InspectionChecklistItem,
  InspectionNote,
  User,
  Vehicle,
} from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
// onComplete callback lets a side-panel host close the panel instead of
// navigating away from the underlying page (Phase 5 — v4.1 spec §11.5).
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Select,
  TextField,
} from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";

interface Props {
  vehicle: Vehicle;
  inspector: string;
  /** When provided, called after the inspection completes instead of navigating. */
  onComplete?: () => void;
}

/** Compact circular progress indicator for the summary header. */
function ProgressRing({ percent }: { percent: number }) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (percent / 100) * c}
          className="stroke-(--bg-fill-success) transition-[stroke-dashoffset]"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-2xs font-semibold tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

export function InspectionChecklist({ vehicle, inspector, onComplete }: Props) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<InspectionCheck[] | null>(null);
  const [items, setItems] = useState<InspectionChecklistItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState<InspectionNote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  // Per-field autosave indicator + a post-complete banner so the "saved"
  // and "completed" states are visible (the form has no manual Save).
  const [saving, setSaving] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<{ flagged: number } | null>(
    null,
  );

  useEffect(() => {
    void inspectionService.getForVehicle(vehicle.id).then(setChecks);
    void inspectionNoteService.getForVehicle(vehicle.id).then(setNotes);
    void authService.getAllUsers().then(setUsers);
    void inspectionChecklistService.getAll(vehicle.companyId).then(setItems);
  }, [vehicle.id, vehicle.companyId]);

  async function handleAddNote() {
    if (!user || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await inspectionNoteService.add({
        vehicleId: vehicle.id,
        userId: user.id,
        content: newNote.trim(),
      });
      setNotes(await inspectionNoteService.getForVehicle(vehicle.id));
      setNewNote("");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleStart() {
    if (!user) return;
    const fresh = await inspectionService.start(vehicle.id, user.id);
    setChecks(fresh);
    toast.success("Inspection started");
  }

  async function handleStatusChange(num: number, status: string) {
    if (!user) return;
    setSaving(true);
    try {
      const existing = checks?.find((c) => c.checkNumber === num);
      await inspectionService.saveCheck({
        vehicleId: vehicle.id,
        checkNumber: num,
        status,
        actionRequired: existing?.actionRequired ?? null,
        carriedOutBy: user.id,
      });
      setChecks(await inspectionService.getForVehicle(vehicle.id));
    } finally {
      setSaving(false);
    }
  }

  async function handleActionChange(num: number, action: string) {
    if (!user) return;
    setSaving(true);
    try {
      const existing = checks?.find((c) => c.checkNumber === num);
      await inspectionService.saveCheck({
        vehicleId: vehicle.id,
        checkNumber: num,
        status: existing?.status ?? "",
        actionRequired: action || null,
        carriedOutBy: user.id,
      });
      setChecks(await inspectionService.getForVehicle(vehicle.id));
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!user) return;
    setSubmitting(true);
    try {
      const result = await inspectionService.complete(vehicle.id, user.id);
      setLastCompleted({ flagged: result.flagged });
      toast.success(
        result.flagged > 0
          ? `Inspection complete, ${result.flagged} item${result.flagged === 1 ? "" : "s"} added to Things to Do`
          : "Inspection complete, all items pass",
      );
      onComplete?.();
    } finally {
      setSubmitting(false);
    }
  }

  if (checks === null) {
    return (
      <Card>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-1 h-72 w-full" />
      </Card>
    );
  }

  if (checks.length === 0) {
    return (
      <Card padding="0">
        <EmptyState
          heading="No inspection yet"
          icon={<ClipboardCheck />}
          action={{
            content: "Start inspection",
            onAction: () => void handleStart(),
          }}
        >
          Run a 20-point inspection to surface issues and auto-generate Things
          to Do. Your answers save automatically as you go.
        </EmptyState>
      </Card>
    );
  }

  const completed = checks.filter((c) => c.status).length;
  const total = items.length;
  const percent = Math.round((completed / total) * 100);
  const flagged = checks.filter(
    (c) => c.status && NEGATIVE_INSPECTION_STATUSES.has(c.status),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ProgressRing percent={percent} />
            <div className="text-sm">
              <div className="flex flex-wrap items-center gap-2 font-medium">
                <span>{completed}/{total} completed</span>
                {flagged > 0 && (
                  <Badge tone="critical" icon="AlertMinor">
                    {`${flagged} flagged`}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-(--text-secondary)">
                <span>Inspector: {inspector}</span>
                <span aria-hidden>·</span>
                {saving ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Saving…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-(--text-success)">
                    <Check className="size-3" /> All changes saved
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void handleStart()} disabled={submitting}>
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleComplete()}
              disabled={completed === 0}
              loading={submitting}
            >
              Complete inspection
            </Button>
          </div>
        </div>
      </Card>

      {lastCompleted ? (
        <Banner tone="success">
          Inspection completed
          {lastCompleted.flagged > 0
            ? `, ${lastCompleted.flagged} item${lastCompleted.flagged === 1 ? "" : "s"} sent to Things to Do.`
            : ", all items pass."}{" "}
          You can still update any answer below; changes save automatically.
        </Banner>
      ) : null}

      <Card padding="0">
        <div className="divide-y divide-(--border-secondary)">
          {items.map((item) => {
            const check = checks.find((c) => c.checkNumber === item.number);
            const status = check?.status ?? "";
            const isNegative = !!status && NEGATIVE_INSPECTION_STATUSES.has(status);
            const dot = !status
              ? "bg-(--bg-fill-tertiary)"
              : isNegative
                ? "bg-(--bg-fill-critical)"
                : "bg-(--bg-fill-success)";
            return (
              /*
                One row needs ~418px laid out horizontally (fixed 160px label
                + 144px status + the action input). On a phone the sheet gives
                it ~341px with `overflow-x: hidden` and no scrollable
                ancestor, so the status dropdown and action field were pushed
                off-screen and simply could not be reached — an inspection was
                impossible to complete on a phone (GEN-93).

                Below sm the row becomes two stacked lines: identity above,
                controls below. `sm:contents` dissolves both wrappers at sm and
                up, so the children become direct flex children again and the
                desktop layout is byte-for-byte what it was.
              */
              <div
                key={item.number}
                className={cn(
                  "flex flex-col gap-2 px-4 py-3",
                  "sm:flex-row sm:items-center sm:gap-3 sm:py-2",
                  isNegative && "bg-(--bg-surface-critical)",
                )}
              >
                <div className="flex min-w-0 items-center gap-3 sm:contents">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", dot)}
                    title={status || "Not checked"}
                  />
                  <span className="w-6 shrink-0 text-xs tabular-nums text-(--text-secondary)">
                    {item.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium sm:w-40 sm:flex-none sm:shrink-0">
                    {item.item}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 sm:contents">
                  <div className="w-36 shrink-0">
                    <Select
                      label={`Status for ${item.item}`}
                      labelHidden
                      placeholder="Select…"
                      options={item.statusOptions}
                      value={status}
                      onChange={(v) => void handleStatusChange(item.number, v)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      aria-label={`Action required for ${item.item}`}
                      defaultValue={check?.actionRequired ?? ""}
                      placeholder={
                        isNegative ? "Describe what needs doing…" : "(optional)"
                      }
                      onBlur={(e) =>
                        handleActionChange(item.number, e.target.value)
                      }
                      className={cn(
                        "h-10 text-xs sm:h-8",
                        isNegative && "border-transparent",
                      )}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Inspection notes — v4.1 §11.5 / Gap 4: append-only sub-entity */}
      <Card
        title="Inspection notes"
        actions={
          <span className="text-xs text-(--text-secondary)">
            {notes.length} note{notes.length === 1 ? "" : "s"} · append-only
          </span>
        }
      >
        <div className="flex flex-col gap-2">
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
              loading={savingNote}
            >
              Add note
            </Button>
          </div>
        </div>
        {notes.length > 0 && (
          <div className="mt-1 flex flex-col gap-2 border-t border-(--border-secondary) pt-3">
            {notes.map((n) => {
              const author = users.find((u) => u.id === n.userId);
              return (
                <div
                  key={n.id}
                  className="rounded-(--radius-200) bg-(--bg-surface-secondary) p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {author?.name ?? "Unknown"}
                    </span>
                    <span className="text-xs text-(--text-secondary)">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{n.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
