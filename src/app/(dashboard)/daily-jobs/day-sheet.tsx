"use client";

import "./daily-jobs.css";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  ActionList,
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  DatePicker,
  EmptyState,
  EmptyStateIllustration,
  IndexTable,
  Popover,
  Select,
  SkeletonBodyText,
  TextField,
  useConfirm,
  type BadgeTone,
} from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/lib/services/auth-service";
import { dailyJobService, registrationError } from "@/lib/services/daily-job-service";
import { toast } from "@/lib/toast";
import type { DailyJob, DailyJobPriority, User } from "@/lib/types";

const PRIORITIES: { value: DailyJobPriority; label: string; tone: BadgeTone }[] = [
  { value: "urgent", label: "Urgent", tone: "critical" },
  { value: "high", label: "High", tone: "warning" },
  { value: "normal", label: "Normal", tone: "info" },
  { value: "low", label: "Low", tone: "neutral" },
];
const RANK: Record<DailyJobPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const priorityMeta = (p: DailyJobPriority) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[2];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
function dayLabel(key: string, today: string): string {
  const name = fromKey(key).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  if (key === today) return `Today, ${name}`;
  if (key === addDays(today, 1)) return `Tomorrow, ${name}`;
  if (key === addDays(today, -1)) return `Yesterday, ${name}`;
  return name;
}
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const firstName = (name: string) => name.split(" ")[0];

/** Open jobs by priority, then the oldest first; completed ones last, in the order they were done. */
function sortJobs(jobs: DailyJob[]): DailyJob[] {
  return [...jobs].sort((a, b) => {
    if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
    if (a.status === "completed") return (a.completedAt ?? "").localeCompare(b.completedAt ?? "");
    return RANK[a.priority] - RANK[b.priority] || a.createdAt.localeCompare(b.createdAt);
  });
}

function DayStepper({ day, today, onChange }: { day: string; today: string; onChange: (d: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button icon={<ChevronLeft />} accessibilityLabel="Previous day" onClick={() => onChange(addDays(day, -1))} />
      <Popover
        active={open}
        onClose={() => setOpen(false)}
        sectioned
        activator={
          <Button icon={<CalendarDays />} disclosure ariaExpanded={open} onClick={() => setOpen((o) => !o)}>
            {dayLabel(day, today)}
          </Button>
        }
      >
        <DatePicker
          key={day}
          selected={fromKey(day)}
          onChange={(r) => {
            onChange(dayKey(r.start));
            setOpen(false);
          }}
        />
      </Popover>
      <Button icon={<ChevronRight />} accessibilityLabel="Next day" onClick={() => onChange(addDays(day, 1))} />
      {day !== today ? (
        <Button variant="plain" onClick={() => onChange(today)}>
          Back to today
        </Button>
      ) : null}
    </div>
  );
}

/** A staff member a job can be assigned to. */
interface Staff {
  id: string;
  name: string;
}

/** Shown for a job nobody was given: anyone can pick it up. */
const OPEN_LABEL = "Open (unassigned)";

function QuickAdd({
  staff,
  onAdd,
}: {
  staff: Staff[];
  onAdd: (title: string, priority: DailyJobPriority, reg: string, assignedTo: string | null) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [reg, setReg] = useState("");
  const [tried, setTried] = useState(false);
  const [priority, setPriority] = useState<DailyJobPriority>("normal");
  // "" is open: the poster gives it to nobody in particular.
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const err = tried ? registrationError(reg) : undefined;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    if (registrationError(reg)) {
      setTried(true);
      return;
    }
    setSaving(true);
    const ok = await onAdd(title.trim(), priority, reg, assignee || null);
    setSaving(false);
    if (!ok) return;
    setTitle("");
    setReg("");
    setTried(false);
    setPriority("normal");
    setAssignee("");
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
      <div className="min-w-[220px] flex-1">
        <TextField label="New job" labelHidden placeholder="Add a job, e.g. Take it to the car wash" value={title} onChange={setTitle} autoComplete="off" />
      </div>
      <div className="w-36">
        <TextField label="Reg" labelHidden placeholder="Reg (optional)" value={reg} onChange={(v) => setReg(v.toUpperCase())} error={err} autoComplete="off" />
      </div>
      <div className="w-28">
        <Select
          label="Priority"
          labelHidden
          options={PRIORITIES.map((p) => ({ label: p.label, value: p.value }))}
          value={priority}
          onChange={(v) => setPriority(v as DailyJobPriority)}
        />
      </div>
      <div className="w-60">
        <Select
          label="Assign to"
          labelInline
          options={[
            { label: OPEN_LABEL, value: "" },
            // The avatar is decoration: the option's label already says the name.
            ...staff.map((s) => ({
              label: s.name,
              value: s.id,
              media: (
                <span aria-hidden>
                  <Avatar name={s.name} size="xs" />
                </span>
              ),
            })),
          ]}
          value={assignee}
          onChange={setAssignee}
        />
      </div>
      <Button variant="primary" submit disabled={!title.trim()} loading={saving}>
        Add job
      </Button>
    </form>
  );
}

function PriorityPicker({ job, onChange }: { job: DailyJob; onChange: (p: DailyJobPriority) => void }) {
  const [open, setOpen] = useState(false);
  const meta = priorityMeta(job.priority);
  if (job.status === "completed") return <Badge tone="neutral">{meta.label}</Badge>;
  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      activator={
        // -ml-2 takes back the button's 8px padding, so the badge lines up
        // with the column's heading and a done job's plain badge.
        <Button variant="tertiary" size="micro" className="-ml-2" ariaExpanded={open} accessibilityLabel={`Priority: ${meta.label}. Change priority`} onClick={() => setOpen((o) => !o)}>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </Button>
      }
    >
      <ActionList
        onActionAnyItem={() => setOpen(false)}
        items={PRIORITIES.map((p) => ({ content: p.label, active: p.value === job.priority, onAction: () => onChange(p.value) }))}
      />
    </Popover>
  );
}

/** Who the job is for: an avatar and first name, or Open. */
function Assignee({ name }: { name: string | null }) {
  if (!name) return <span className="body-sm text-(--text-secondary)">Open</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={name}>
      {/* Decoration: the first name beside it is what's read out. */}
      <span aria-hidden>
        <Avatar name={name} size="xs" />
      </span>
      <span className="body-sm text-(--text)">{firstName(name)}</span>
    </span>
  );
}

/**
 * The Assigned to cell: anyone can change who an open job is for, as with
 * priority. A finished job just says who it was for.
 */
function AssigneePicker({
  job,
  staff,
  nameOf,
  onChange,
}: {
  job: DailyJob;
  staff: Staff[];
  nameOf: (id: string | null) => string;
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = job.assignedTo ? nameOf(job.assignedTo) : null;
  if (job.status === "completed") return <Assignee name={name} />;
  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      activator={
        // -ml-2 takes back the button's padding, so it lines up with the heading.
        <Button
          variant="tertiary"
          size="micro"
          className="-ml-2"
          ariaExpanded={open}
          accessibilityLabel={`Assigned to: ${name ?? "nobody, open to anyone"}. Change who it's assigned to`}
          onClick={() => setOpen((o) => !o)}
        >
          <Assignee name={name} />
        </Button>
      }
    >
      <ActionList
        onActionAnyItem={() => setOpen(false)}
        items={[
          { content: OPEN_LABEL, active: !job.assignedTo, onAction: () => onChange(null) },
          ...staff.map((s) => ({ content: s.name, active: job.assignedTo === s.id, onAction: () => onChange(s.id) })),
        ]}
      />
    </Popover>
  );
}

export function DaySheet() {
  const { user, company } = useAuth();
  const today = dayKey(new Date());
  const [day, setDay] = useState(today);
  const [jobs, setJobs] = useState<DailyJob[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [people, setPeople] = useState<Map<string, string>>(new Map());
  // Who a job can be assigned to: active staff, by name.
  const [staff, setStaff] = useState<Staff[]>([]);
  const { confirm, confirmDialog } = useConfirm();

  // The day lives in the address (?date=), so a sheet can be linked to.
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("date");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDay(d);
  }, []);
  const changeDay = useCallback((d: string) => {
    setDay(d);
    const url = new URL(window.location.href);
    if (d === dayKey(new Date())) url.searchParams.delete("date");
    else url.searchParams.set("date", d);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (!company) return;
    void authService.getUsersForCompany(company.id).then((users: User[]) => {
      setPeople(new Map(users.map((u) => [u.id, u.name])));
      setStaff(
        users
          .filter((u) => u.active)
          .map((u) => ({ id: u.id, name: u.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, [company]);

  useEffect(() => {
    if (!company) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobs(null);
    setLoadError(false);
    dailyJobService
      .getForDay(company.id, day)
      .then((rows) => live && setJobs(rows))
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [company, day]);

  const nameOf = useCallback((id: string | null) => (id ? (people.get(id) ?? "Someone") : ""), [people]);
  const sorted = useMemo(() => (jobs ? sortJobs(jobs) : null), [jobs]);
  const me = user?.id ?? "";

  /** Show the change at once; put it back and say so if the save fails. */
  async function apply(id: string, local: Partial<DailyJob>, save: () => Promise<DailyJob>, failure: string) {
    const before = jobs;
    setJobs((all) => all?.map((j) => (j.id === id ? { ...j, ...local } : j)) ?? all);
    try {
      const saved = await save();
      setJobs((all) => all?.map((j) => (j.id === id ? saved : j)) ?? all);
    } catch {
      setJobs(before);
      toast.error(failure);
    }
  }

  async function add(title: string, priority: DailyJobPriority, reg: string, assignedTo: string | null): Promise<boolean> {
    if (!company || !user) return false;
    try {
      const saved = await dailyJobService.add({
        companyId: company.id,
        jobDate: day,
        title,
        registration: reg,
        priority,
        createdBy: user.id,
        assignedTo,
      });
      setJobs((all) => [...(all ?? []), saved]);
      return true;
    } catch {
      toast.error("Couldn't add the job. Try again.");
      return false;
    }
  }

  async function remove(job: DailyJob) {
    const ok = await confirm({
      title: "Delete this job?",
      description: `"${job.title}" comes off the sheet for everyone.`,
      confirmText: "Delete job",
      destructive: true,
    });
    if (!ok) return;
    try {
      await dailyJobService.remove(job.id);
      setJobs((all) => all?.filter((j) => j.id !== job.id) ?? all);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the job.");
    }
  }

  const done = sorted?.filter((j) => j.status === "completed").length ?? 0;
  const picked = sorted?.filter((j) => j.status === "pending" && j.pickedUpBy).length ?? 0;
  const open = (sorted?.length ?? 0) - done - picked;
  const past = day < today;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DayStepper day={day} today={today} onChange={changeDay} />
        {sorted ? (
          <span className="body-sm text-(--text-secondary) tabular-nums">
            {open} to pick up · {picked} picked up · {done} done
          </span>
        ) : null}
      </div>

      {loadError ? (
        <Banner tone="critical" title="Couldn't load this day's jobs">
          Check your connection, then reload the page.
        </Banner>
      ) : null}

      <Card padding="0">
        {past ? null : (
          <div className="p-3">
            <QuickAdd staff={staff} onAdd={add} />
          </div>
        )}
        {!sorted ? (
          loadError ? null : (
            <div className="p-4">
              <SkeletonBodyText lines={6} />
            </div>
          )
        ) : sorted.length === 0 ? (
          <EmptyState compact illustration={<EmptyStateIllustration variant="checklist" />} heading={past ? "No jobs were posted for this day" : "No jobs for this day yet"}>
            {past ? "Pick another day, or go back to today." : "Add the first one above. Anyone on the team can pick it up."}
          </EmptyState>
        ) : (
          <IndexTable
            className="dj-sheet rounded-none shadow-none"
            selectable={false}
            headings={[
              { title: "Job" },
              { title: "Priority" },
              { title: "Posted by" },
              { title: "Assigned to" },
              { title: "Status" },
              { title: "Action", alignment: "end" },
            ]}
            rows={sorted.map((job) => {
              const completed = job.status === "completed";
              const poster = nameOf(job.createdBy);
              const posted = (
                <span className="flex min-w-0 items-center gap-1.5" title={`Posted by ${poster} at ${timeLabel(job.createdAt)}`}>
                  <Avatar name={poster} size="xs" accessibilityLabel={poster} />
                  <span className="body-sm text-(--text-secondary)">
                    {firstName(poster)} <span className="tabular-nums">· {timeLabel(job.createdAt)}</span>
                  </span>
                </span>
              );
              return {
                id: job.id,
                cells: [
                  <div key="job" className="flex min-w-[180px] flex-col gap-1 whitespace-normal">
                    {/* On the plate's baseline, so a title sits level with the reg however it wraps. */}
                    <span className="flex min-w-0 items-baseline gap-2">
                      {job.registration ? <RegPlate registration={job.registration} size="sm" className="shrink-0" /> : null}
                      <span className="body-md min-w-0">
                        <span className={`dj-title${completed ? " dj-title--done" : ""}`}>{job.title}</span>
                      </span>
                    </span>
                    {/* Takes the Posted by column's place when the table is narrow. */}
                    <span className="dj-meta">{posted}</span>
                  </div>,
                  <PriorityPicker
                    key="priority"
                    job={job}
                    onChange={(p) => void apply(job.id, { priority: p }, () => dailyJobService.setPriority(job.id, p), "Couldn't change the priority.")}
                  />,
                  <span key="posted">{posted}</span>,
                  <AssigneePicker
                    key="assigned"
                    job={job}
                    staff={staff}
                    nameOf={nameOf}
                    onChange={(to) => void apply(job.id, { assignedTo: to }, () => dailyJobService.assign(job.id, to), "Couldn't change who the job is assigned to.")}
                  />,
                  <span key="status">
                    {completed ? (
                      <Badge tone="success" progress="complete">{`Done by ${job.completedBy === me ? "you" : firstName(nameOf(job.completedBy))}`}</Badge>
                    ) : job.pickedUpBy ? (
                      <Badge tone="info" progress="partiallyComplete">{job.pickedUpBy === me ? "With you" : `With ${firstName(nameOf(job.pickedUpBy))}`}</Badge>
                    ) : (
                      <Badge tone="attention" progress="incomplete">Pending</Badge>
                    )}
                  </span>,
                  // Every row's button takes the same 96px at the column's
                  // right edge, under the Action heading. The poster's delete
                  // sits to its left, only where there is one.
                  <div key="action" className="flex items-center justify-end gap-1">
                    {!completed && job.createdBy === me ? (
                      <Button variant="tertiary" size="micro" icon={<Trash2 />} accessibilityLabel={`Delete "${job.title}"`} onClick={() => void remove(job)} />
                    ) : null}
                    <span className="flex w-24">
                      {completed ? (
                        <Button
                          variant="tertiary"
                          size="micro"
                          fullWidth
                          accessibilityLabel={`Mark "${job.title}" pending again`}
                          onClick={() => void apply(job.id, { status: "pending", completedBy: null, completedAt: null }, () => dailyJobService.reopen(job.id), "Couldn't reopen the job.")}
                        >
                          Undo
                        </Button>
                      ) : job.pickedUpBy ? (
                        <Button
                          size="micro"
                          fullWidth
                          accessibilityLabel={`Mark "${job.title}" completed`}
                          onClick={() => void apply(job.id, { status: "completed", completedBy: me, completedAt: new Date().toISOString() }, () => dailyJobService.complete(job.id, me), "Couldn't mark the job completed.")}
                        >
                          Complete
                        </Button>
                      ) : (
                        <Button
                          size="micro"
                          fullWidth
                          accessibilityLabel={`Pick up "${job.title}"`}
                          onClick={() => void apply(job.id, { pickedUpBy: me, pickedUpAt: new Date().toISOString() }, () => dailyJobService.pickUp(job.id, me), "Couldn't pick up the job.")}
                        >
                          Pick up
                        </Button>
                      )}
                    </span>
                  </div>,
                ],
              };
            })}
          />
        )}
      </Card>
      {confirmDialog}
    </div>
  );
}
