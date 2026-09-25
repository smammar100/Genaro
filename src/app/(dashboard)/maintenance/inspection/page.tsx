"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import { inspectionService } from "@/lib/services/inspection-service";
import { inspectionChecklistService } from "@/lib/services/inspection-checklist-service";
import { authService } from "@/lib/services/auth-service";
import { motFlagFor } from "@/lib/services/mot-derivation";
import { NEGATIVE_INSPECTION_STATUSES } from "@/lib/constants";
import type { InspectionCheck, InspectionChecklistItem, User, Vehicle } from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Page,
  ProgressBar,
  Tabs,
  type BadgeTone,
} from "@/components/polaris";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegPlate } from "@/components/shared/reg-plate";
import { InspectionSidePanel } from "@/components/inspection/inspection-side-panel";
import { cn, formatDate } from "@/lib/utils";

interface Row {
  vehicle: Vehicle;
  checks: InspectionCheck[];
  progress: number;
  total: number;
}

type SquareKind = "pass" | "flag" | "empty";

/** Per-point square state across all checklist items: passed / flagged / not done. */
function buildSquares(
  checks: InspectionCheck[],
  items: InspectionChecklistItem[],
): SquareKind[] {
  return items.map((item) => {
    const c = checks.find((x) => x.checkNumber === item.number);
    if (!c || !c.status) return "empty";
    return NEGATIVE_INSPECTION_STATUSES.has(c.status) ? "flag" : "pass";
  });
}

const flaggedCount = (checks: InspectionCheck[]): number =>
  checks.filter((c) => c.status && NEGATIVE_INSPECTION_STATUSES.has(c.status))
    .length;

// Lifecycle states relevant to inspection: awaiting/in-progress + the two
// post-inspection states (being_prepared = done with faults, ready = done clean).
const SCOPE = new Set([
  "received",
  "inspection_pending",
  "being_prepared",
  "ready",
]);

export default function MaintenanceInspectionListPage() {
  const { company } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<InspectionChecklistItem[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [tab, setTab] = useState(0);

  async function load() {
    if (!company) return;
    const [vs, u, checklist] = await Promise.all([
      vehicleService.getAll(company.id),
      authService.getUsersForCompany(company.id),
      inspectionChecklistService.getAll(company.id),
    ]);
    const scope = vs.filter((v) => SCOPE.has(v.status));
    // GEN-70: was one awaited round trip per vehicle in series — on a queue
    // of any real size that's a visible stall before the page shows
    // anything. Fire them together instead.
    const checksByVehicle = await Promise.all(
      scope.map((v) => inspectionService.getForVehicle(v.id)),
    );
    const out: Row[] = scope.map((v, i) => {
      const checks = checksByVehicle[i];
      const progress = checks.filter((c) => c.status).length;
      return { vehicle: v, checks, progress, total: checklist.length };
    });
    setRows(out);
    setUsers(u);
    setItems(checklist);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // Pending = still needs inspection. Completed = all 20 points recorded, so
  // it auto-moves to the Completed tab the moment the inspection is finished.
  const { pending, completed } = useMemo(() => {
    const p: Row[] = [];
    const c: Row[] = [];
    for (const r of rows ?? []) {
      if (r.progress >= r.total) c.push(r);
      else p.push(r);
    }
    return { pending: p, completed: c };
  }, [rows]);

  const mode = tab === 0 ? "pending" : "completed";
  const tabRows = tab === 0 ? pending : completed;

  return (
    <Page
      title="Inspection queue"
      subtitle="Vehicles waiting on their 20-point inspection. Run a check and cars move through automatically once it is done."
      fullWidth
    >
      {/* Queue tabs: their own row under the header, outside the card. */}
      <Tabs
        tabs={[
          {
            id: "pending",
            content: "Pending",
            badge: rows ? pending.length : undefined,
          },
          {
            id: "completed",
            content: "Completed",
            badge: rows ? completed.length : undefined,
          },
        ]}
        selected={tab}
        onSelect={setTab}
      />

      {!rows ? (
        <Skeleton className="h-72" />
      ) : (
        <Card padding="0">
          {tabRows.length === 0 ? (
            <EmptyState
              heading={
                mode === "pending"
                  ? "No vehicles awaiting inspection"
                  : "No completed inspections yet"
              }
              icon={<ClipboardCheck className="fill-none" />}
            >
              {mode === "pending"
                ? "All current stock has cleared the inspection step."
                : "Inspected vehicles will appear here."}
            </EmptyState>
          ) : (
            <QueueTable
              rows={tabRows}
              users={users}
              items={items}
              mode={mode}
              onOpen={setSelected}
            />
          )}
        </Card>
      )}

      <InspectionSidePanel
        vehicle={selected}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        onComplete={() => void load()}
      />
    </Page>
  );
}

/** Days a vehicle has been waiting, with an urgency tone past 14 / 30 days. */
function waitInfo(receivedDate: string): {
  days: number;
  tone: BadgeTone | undefined;
  urgent: boolean;
} {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(receivedDate).getTime()) / 86_400_000),
  );
  if (days > 30) return { days, tone: "critical", urgent: true };
  if (days > 14) return { days, tone: "attention", urgent: true };
  return { days, tone: undefined, urgent: false };
}

const SQUARE_TONE: Record<SquareKind, string> = {
  pass: "bg-(--bg-fill-success)",
  flag: "bg-(--bg-fill-critical)",
  empty: "bg-(--bg-fill-tertiary)",
};

/** 20-point progress as squares: green = passed, red = flagged, grey = not done. */
function ProgressSquares({
  squares,
  progress,
  total,
}: {
  squares: SquareKind[];
  progress: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {/*
        The 20-square meter needs ~257px on one line. Given eight columns it
        rarely gets that, and because the track was `flex-wrap` it collapsed
        into a 22px-wide, 257px-tall vertical stack that blew the row height
        out — visible from ~1200px down (GEN-93).

        So the squares only render at 2xl, where there is genuinely room, and
        `flex-nowrap` stops them ever stacking again. Below that the count and
        the bar carry the same information in the space available.
      */}
      <div
        className="hidden flex-nowrap gap-0.5 overflow-hidden 2xl:flex"
        title={`${progress} of ${total} points recorded`}
      >
        {squares.map((kind, i) => (
          <span
            key={i}
            className={cn("size-2.5 shrink-0 rounded-(--radius-050)", SQUARE_TONE[kind])}
          />
        ))}
      </div>

      {/* Compact fallback: a single proportional bar that fits any column. */}
      <span
        className="w-10 shrink-0 2xl:hidden"
        title={`${progress} of ${total} points recorded`}
      >
        <ProgressBar
          size="small"
          tone={squares.some((s) => s === "flag") ? "critical" : "success"}
          progress={total > 0 ? (progress / total) * 100 : 0}
          accessibilityLabel="Inspection progress"
        />
      </span>

      <span className="body-sm shrink-0 tabular-nums text-(--text-secondary)">
        {progress}/{total}
      </span>
    </div>
  );
}

const MOT_TONE: Record<string, BadgeTone | undefined> = {
  expired: "critical",
  expiring: "attention",
  unknown: undefined,
};

/** MOT expiry flag (GEN-75) — silent for a valid, not-soon-expiring MOT. */
function MotBadge({ motExpiry }: { motExpiry: string | null }) {
  const flag = motFlagFor(motExpiry);
  if (flag.tone === "ok")
    return <span className="text-(--text-secondary)">—</span>;
  return (
    <Badge
      tone={MOT_TONE[flag.tone]}
      icon={flag.tone !== "unknown" ? "AlertMinor" : undefined}
    >
      {flag.label}
    </Badge>
  );
}

function QueueTable({
  rows,
  users,
  items,
  mode,
  onOpen,
}: {
  rows: Row[];
  users: User[];
  items: InspectionChecklistItem[];
  mode: "pending" | "completed";
  onOpen: (v: Vehicle) => void;
}) {
  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {/*
              Responsive columns (GEN-93). On a phone this table is 896px of
              content in a ~326px window, so the secondary columns are hidden
              rather than left behind a long horizontal drag. Reg, Vehicle and
              Action — identify the car and act on it — are always present, and
              the hidden signals (waiting time, progress, flags) fold into the
              Vehicle cell so nothing is actually lost.
            */}
            <TableHead className="hidden sm:table-cell">Reg</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead className="hidden sm:table-cell">Waiting</TableHead>
            <TableHead className="hidden lg:table-cell">MOT</TableHead>
            <TableHead className="hidden lg:table-cell">Inspector</TableHead>
            <TableHead className="hidden lg:table-cell">Progress</TableHead>
            <TableHead className="hidden md:table-cell">Flagged</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ vehicle, checks, progress, total }) => {
            const wait = waitInfo(vehicle.receivedDate);
            const squares = buildSquares(checks, items);
            const flagged = flaggedCount(checks);
            // The actual person who recorded the checks for THIS vehicle, not a
            // single global inspector applied to every row.
            const inspectorId = checks.find((c) => c.carriedOutBy)?.carriedOutBy;
            const inspector = inspectorId
              ? users.find((u) => u.id === inspectorId)
              : undefined;
            return (
              <TableRow key={vehicle.id}>
                <TableCell className="hidden sm:table-cell">
                  <RegPlate registration={vehicle.registration} size="sm" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col leading-tight">
                    {/* Below sm the Reg column is dropped entirely — three
                        columns will not fit 326px without clipping the action
                        button — so the plate rides in this cell instead. */}
                    <span className="mb-1 sm:hidden">
                      <RegPlate registration={vehicle.registration} size="sm" />
                    </span>
                    <span className="font-medium">
                      {vehicle.make} {vehicle.model}
                    </span>
                    <span className="body-sm text-(--text-secondary)">
                      {vehicle.stockId} · {formatDate(vehicle.receivedDate)}
                    </span>
                    {/* Carries the hidden columns' signal on small screens so
                        nothing is lost when they drop out. */}
                    <span className="body-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-(--text-secondary) lg:hidden">
                      <span className="tabular-nums">
                        {progress}/{total} checked
                      </span>
                      <span className={cn("sm:hidden", wait.urgent && "text-(--text-critical)")}>
                        · {wait.days}d waiting
                      </span>
                      {flagged > 0 && (
                        <span className="text-(--text-critical) md:hidden">
                          · {flagged} flagged
                        </span>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    tone={wait.tone}
                    icon={wait.urgent ? "AlertMinor" : undefined}
                  >
                    {`${wait.days}d waiting`}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <MotBadge motExpiry={vehicle.motExpiry} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {inspector ? (
                    <span className="inline-flex items-center gap-2 text-(--text-secondary)">
                      <Avatar size="sm" name={inspector.name} />
                      {inspector.name}
                    </span>
                  ) : (
                    <span className="text-(--text-secondary)">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <ProgressSquares squares={squares} progress={progress} total={total} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {flagged > 0 ? (
                    <Badge tone="critical" icon="AlertMinor">
                      {String(flagged)}
                    </Badge>
                  ) : (
                    <Badge>0</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button onClick={() => onOpen(vehicle)}>
                    {mode === "completed"
                      ? "View"
                      : progress > 0
                        ? "Continue"
                        : "Start"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
