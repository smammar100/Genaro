"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
  IndexTable,
  Page,
  ProgressBar,
  SkeletonBox,
  Tabs,
  type BadgeTone,
} from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { cn, formatDate } from "@/lib/utils";

// The checklist sheet only opens once a row is picked, so it loads in its own
// chunk after the queue rather than with it.
const InspectionSidePanel = dynamic(
  () =>
    import("@/components/inspection/inspection-side-panel").then(
      (m) => m.InspectionSidePanel,
    ),
  { ssr: false },
);

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

/** The in-scope vehicles with their checks, plus the team and checklist. */
async function fetchQueue(companyId: string) {
  const [vs, users, items] = await Promise.all([
    vehicleService.getAll(companyId),
    authService.getUsersForCompany(companyId),
    inspectionChecklistService.getAll(companyId),
  ]);
  const scope = vs.filter((v) => SCOPE.has(v.status));
  // GEN-70: one request per vehicle, fired together. Awaited in series, a
  // queue of any real size is a visible stall before the page shows anything.
  const checksByVehicle = await Promise.all(
    scope.map((v) => inspectionService.getForVehicle(v.id)),
  );
  const rows: Row[] = scope.map((v, i) => {
    const checks = checksByVehicle[i];
    const progress = checks.filter((c) => c.status).length;
    return { vehicle: v, checks, progress, total: items.length };
  });
  return { rows, users, items };
}

export default function MaintenanceInspectionListPage() {
  const { company } = useAuth();
  const companyId = company?.id;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<InspectionChecklistItem[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [tab, setTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void fetchQueue(companyId).then((q) => {
      if (cancelled) return;
      setRows(q.rows);
      setUsers(q.users);
      setItems(q.items);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, refreshKey]);

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
        <SkeletonBox height={288} />
      ) : tabRows.length === 0 ? (
        <Card padding="0">
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
        </Card>
      ) : (
        // IndexTable is a flush card of its own.
        <QueueTable
          rows={tabRows}
          users={users}
          items={items}
          mode={mode}
          onOpen={setSelected}
        />
      )}

      <InspectionSidePanel
        vehicle={selected}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        onComplete={() => setRefreshKey((k) => k + 1)}
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
  // TODO(genaro): IndexTable has no per-breakpoint columns, so the secondary
  // columns no longer drop out on narrow screens (GEN-93): the table scrolls
  // sideways instead, and stacks each row once it is narrower than 490px.
  return (
    <IndexTable
      selectable={false}
      primaryColumn={1}
      headings={[
        { title: "Reg" },
        { title: "Vehicle" },
        { title: "Waiting" },
        { title: "MOT" },
        { title: "Inspector" },
        { title: "Progress" },
        { title: "Flagged" },
        { title: "Action", alignment: "end" },
      ]}
      rows={rows.map(({ vehicle, checks, progress, total }) => {
        const wait = waitInfo(vehicle.receivedDate);
        const squares = buildSquares(checks, items);
        const flagged = flaggedCount(checks);
        // The actual person who recorded the checks for THIS vehicle, not a
        // single global inspector applied to every row.
        const inspectorId = checks.find((c) => c.carriedOutBy)?.carriedOutBy;
        const inspector = inspectorId
          ? users.find((u) => u.id === inspectorId)
          : undefined;
        return {
          id: vehicle.id,
          cells: [
            <RegPlate key="reg" registration={vehicle.registration} size="sm" />,
            <span key="vehicle" className="flex flex-col">
              <span>
                {vehicle.make} {vehicle.model}
              </span>
              <span className="body-sm text-(--text-secondary)">
                {vehicle.stockId} · {formatDate(vehicle.receivedDate)}
              </span>
            </span>,
            <Badge
              key="waiting"
              tone={wait.tone}
              icon={wait.urgent ? "AlertMinor" : undefined}
            >
              {`${wait.days}d waiting`}
            </Badge>,
            <MotBadge key="mot" motExpiry={vehicle.motExpiry} />,
            inspector ? (
              <span key="inspector" className="inline-flex items-center gap-2 text-(--text-secondary)">
                <Avatar size="sm" name={inspector.name} />
                {inspector.name}
              </span>
            ) : (
              <span key="inspector" className="text-(--text-secondary)">—</span>
            ),
            <ProgressSquares key="progress" squares={squares} progress={progress} total={total} />,
            flagged > 0 ? (
              <Badge key="flagged" tone="critical" icon="AlertMinor">
                {String(flagged)}
              </Badge>
            ) : (
              <Badge key="flagged">0</Badge>
            ),
            <Button key="action" onClick={() => onOpen(vehicle)}>
              {mode === "completed"
                ? "View"
                : progress > 0
                  ? "Continue"
                  : "Start"}
            </Button>,
          ],
        };
      })}
    />
  );
}
