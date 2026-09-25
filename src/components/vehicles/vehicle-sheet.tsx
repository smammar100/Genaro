"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import { dealerPartnerService } from "@/lib/services/dealer-partner-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import type { DealerPartner, Vehicle, VehicleStatus } from "@/lib/types";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { DataGridPagination } from "@/components/data-grid";
import { LocationBadge } from "@/components/locations/location-badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useIsNarrow } from "@/hooks/use-media-query";
import { usePermissions } from "@/hooks/use-permissions";
import { optionLabel } from "@/lib/master-sheet";
import { affectsCostTotals, withDerivedCosts } from "@/lib/vehicle-costs";
import {
  cycleSort,
  sortRows,
  toSortableDate,
  toSortableNumber,
  toSortableText,
  type SortState,
} from "@/lib/table-sort";

/* ------------------------------------------------------------------ *
 * Shared "wide spreadsheet" module — the Master Sheet grid extracted
 * so the Master Sheet and All Vehicles pages render the exact same
 * module (sticky row-counter + Stock ID, full gridlines, card-white
 * sticky header, chip-bar filter, inline edit, quick-add, paginated
 * footer). Each page supplies its own column set + filter fields; the
 * structure and styling are identical by construction.
 * ------------------------------------------------------------------ */

export type ColType =
  | "vehicle"
  | "stockId"
  | "text"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "select"
  | "status"
  // Module A — physical location with off-site badge (Spec v3.0 · Chunk 2.6)
  | "location"
  // Escape hatch — column supplies its own renderer (and is never editable).
  | "custom";

export interface ColDef {
  key: keyof Vehicle | "profit";
  label: string;
  type: ColType;
  width: number;
  /** Override the raw value used for CSV export / edit seeding. */
  format?: (v: Vehicle) => string;
  /**
   * A derived (formula) column — the cell shows this instead of `v[key]` and is
   * never editable. `key` then only names the field it derives from.
   */
  value?: (v: Vehicle) => unknown;
  /**
   * Fixed choices: the cell shows the option label (e.g. "AUTO" for
   * `automatic`) and edits with a dropdown. CSV exports the label too.
   */
  options?: { value: string; label: string }[];
  /** Free-text cell with type-ahead suggestions (no fixed list). */
  suggestions?: string[];
  /**
   * Turn the edited value into the fields to write, when one cell maps onto
   * more than its own field (vehicle type → type + body, log book → V5 flag).
   */
  toPatch?: (value: unknown, v: Vehicle) => Partial<Vehicle>;
  /** Explicit edit switch; overrides the sheet's `editableKeys`. */
  editable?: boolean;
  /** Per-row edit gate, on top of the column's own switch. */
  editableFor?: (v: Vehicle) => boolean;
  /** Tooltip on a read-only cell of an otherwise editable column. */
  readOnlyHint?: string;
  /** Section this column belongs to; `"common"` shows in every section. */
  section?: string;
  /** Custom cell renderer. When present the column is read-only and the
   *  null-dash placeholder is skipped (the renderer owns empty states). */
  render?: (v: Vehicle) => ReactNode;
  /** Render without thousands separators. Years and other identifier-like
   *  numbers read as quantities otherwise — "2,019" instead of "2019". */
  plain?: boolean;
  /**
   * Droppable on small screens (GEN-93). Only honoured while the user has
   * left the column picker alone: an explicit choice in the picker is the
   * user telling us what they want to see, and a breakpoint should not
   * overrule it. Touch the picker once and every chosen column stays
   * visible at every width, scrolling as before.
   */
  mobileHide?: boolean;
  sticky?: boolean;
}

/** Unique React key per column. ColDef.key is keyed by data field, so two
 *  columns can share the same data source (e.g. the stockId column shows the
 *  raw value, and the "Vehicle" column also reads from stockId). The label is
 *  always unique, so use it as the React identity. */
function colKey(c: ColDef): string {
  return `${String(c.key)}__${c.label}`;
}

const PAGE_SIZE = 25;

/** Compact Shopify-style field for the filter builder row. */
const FIELD_CLASS =
  "h-8 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground";

// Column-resize bounds (GEN-20). Columns never shrink below MIN so a header
// stays clickable, nor grow past MAX so one column can't run off the screen.
const MIN_COL_W = 48;
const MAX_COL_W = 640;
/** localStorage key for a sheet's per-column width overrides. */
const colWidthsKey = (csvName: string): string =>
  `cc.vehicle-sheet.col-widths.${csvName}`;

/**
 * localStorage key for the columns a user has chosen to hide on a sheet.
 *
 * Stored as the HIDDEN keys rather than the visible ones on purpose: columns
 * get added to these sheets over time, and a saved "visible" list would freeze
 * a user's grid at the columns that existed the day they last touched it, with
 * every new column silently absent. Saving what they turned off means anything
 * added later shows up (GEN-116).
 */
const colHiddenKey = (csvName: string): string =>
  `cc.vehicle-sheet.col-hidden.${csvName}`;

/* ---- Filtering (Master Sheet "Variation C" filter-chip bar) -------------- */

export type FilterKind = "text" | "num";
export interface FilterField {
  /** A Vehicle field, or — with `get` — any id unique among the fields. */
  key: keyof Vehicle | (string & {});
  label: string;
  kind: FilterKind;
  /** Read a derived value instead of `v[key]` (e.g. "Sold month"). */
  get?: (v: Vehicle) => unknown;
  /** Stored value → the words the user types (e.g. `automatic` → "AUTO"). */
  options?: { value: string; label: string }[];
}

interface FilterCond {
  id: number;
  key: FilterField["key"];
  label: string;
  kind: FilterKind;
  op: string;
  value: string;
  get?: (v: Vehicle) => unknown;
  options?: { value: string; label: string }[];
}

const TEXT_OPS = [
  { v: "is", l: "is" },
  { v: "not", l: "is not" },
  { v: "contains", l: "contains" },
];
const NUM_OPS = [
  { v: "gte", l: "≥" },
  { v: "lte", l: "≤" },
  { v: "eq", l: "=" },
];
function opsFor(kind: FilterKind) {
  return kind === "num" ? NUM_OPS : TEXT_OPS;
}
function opLabel(op: string): string {
  return [...TEXT_OPS, ...NUM_OPS].find((o) => o.v === op)?.l ?? op;
}
function kindOf(fields: FilterField[], key: FilterField["key"]): FilterKind {
  return fields.find((f) => f.key === key)?.kind ?? "text";
}
function matchCond(c: FilterCond, v: Vehicle): boolean {
  const stored = c.get ? c.get(v) : v[c.key as keyof Vehicle];
  // Match on what the user sees ("AUTO"), not the stored value ("automatic").
  const raw = c.options ? (optionLabel(c.options, stored) ?? stored) : stored;
  if (c.kind === "num") {
    const n = typeof raw === "number" ? raw : Number(raw);
    const fv = Number(c.value);
    // An unparseable filter value can't constrain anything — keep the row.
    if (Number.isNaN(fv)) return true;
    // A null/NaN row value can't satisfy a numeric comparison — exclude it.
    if (raw === null || raw === undefined || Number.isNaN(n)) return false;
    if (c.op === "gte") return n >= fv;
    if (c.op === "lte") return n <= fv;
    return n === fv;
  }
  const s = String(raw ?? "").toLowerCase();
  const fv = c.value.toLowerCase();
  if (c.op === "contains") return s.includes(fv);
  if (c.op === "not") return s !== fv;
  return s === fv;
}

const STATUS_TONE: Record<VehicleStatus, string> = {
  received: "bg-(--bg-fill-info-secondary) text-(--text-info)",
  inspection_pending: "bg-(--bg-fill-caution-secondary) text-(--text-caution)",
  being_prepared: "bg-(--bg-fill-warning-secondary) text-(--text-warning)",
  photos_pending: "bg-(--bg-fill-caution-secondary) text-(--text-caution)",
  photos_ready: "bg-(--bg-fill-success-secondary) text-(--text-success)",
  ready: "bg-(--bg-fill-success-secondary) text-(--text-success)",
  listed: "bg-(--bg-surface-emphasis) text-(--text-emphasis)",
  reserved: "bg-(--bg-fill-warning-secondary) text-(--text-warning)",
  sold: "bg-(--bg-fill-transparent-secondary) text-(--text-secondary)",
  returned: "bg-(--bg-fill-critical-secondary) text-(--text-critical)",
};

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rawValue(col: ColDef, v: Vehicle): unknown {
  if (col.value) return col.value(v);
  if (col.format) return col.format(v);
  if (col.key === "daysInStock") {
    // The stored column is unreliable (quick-add inserts 0 and it's never
    // recomputed). For vehicles still in stock, derive it live from the
    // received date; once sold, trust the stored (frozen) value.
    const sold = v.status === "sold";
    if (!sold && v.receivedDate) {
      const received = new Date(v.receivedDate).getTime();
      if (!Number.isNaN(received)) {
        const days = Math.floor((Date.now() - received) / 86_400_000);
        return Math.max(0, days);
      }
    }
    return v.daysInStock;
  }
  if (col.key === "profit") {
    // For sold vehicles the realized selling price is the true top line;
    // unsold vehicles fall back to the asking (listing) price.
    const topLine = v.sellingPrice ?? v.listingPrice;
    return topLine !== null ? Math.round(topLine - v.baseCost) : null;
  }
  return v[col.key as keyof Vehicle];
}

/**
 * Comparable value for a column (GEN-92). Reuses `rawValue` so sorting sees
 * exactly what export and inline-edit see, then coerces by column type —
 * money and mileage numerically, dates chronologically, everything else as
 * text. Without the per-type coercion, "£9,000" would sort above "£10,000".
 */
/**
 * What the cell reads as: the option label for a fixed-choice column ("AUTO",
 * not `automatic`), the raw value otherwise. Export, sort and search all use
 * this so they agree with the screen.
 */
function displayValue(col: ColDef, v: Vehicle): unknown {
  const raw = rawValue(col, v);
  return col.options ? optionLabel(col.options, raw) : raw;
}

function sortValueFor(col: ColDef, v: Vehicle): string | number | null {
  const raw = displayValue(col, v);
  switch (col.type) {
    case "number":
    case "currency":
      return toSortableNumber(raw);
    case "date":
      return toSortableDate(raw);
    default:
      return toSortableText(raw);
  }
}

function cellCsv(col: ColDef, v: Vehicle): string {
  const raw = displayValue(col, v);
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "Y" : "N";
  return String(raw);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

// Direct, non-computed Vehicle attributes that are safe to inline-edit.
// Deliberately excludes the cost-chain inputs (buyingPrice, fees) and all
// computed/derived totals (totalBuyingPrice, landedCost, baseCost,
// grossEarning, profit, daysInStock) plus stockId / status / the vehicle
// composite — editing those would persist an inconsistent sheet or bypass
// the status-change service. Leaf prices (listing/min/sold) are allowed.
const DEFAULT_EDITABLE_KEYS = new Set<string>([
  "make",
  "model",
  // GEN-91: the editable variant field is the readable name; the opaque
  // AutoTrader code is never edited by hand.
  "derivative",
  "year",
  "colour",
  "mileage",
  "vehicleType",
  "bodyType",
  "fuelType",
  "transmission",
  "engineSizeCC",
  "receivedDate",
  "sellerName",
  "sellerPhone",
  "purchaseSource",
  "auctionHouse",
  "v5Received",
  "serviceHistory",
  "numKeys",
  "lockNut",
  "motExpiry",
  "minimumSalePrice",
  "listingPrice",
  "sellingPrice",
  "dateSold",
  "sellingAgent",
]);

function isEditableCol(c: ColDef, editableKeys: Set<string>): boolean {
  // A custom display is read-only unless the column opts back in (the reg
  // column shows a thumbnail + plate but is still typed into).
  if ((c.render || c.value) && c.editable !== true) return false;
  if (c.key === "profit") return false;
  if (c.type === "vehicle" || c.type === "stockId" || c.type === "status")
    return false;
  if (c.editable !== undefined) return c.editable;
  return editableKeys.has(String(c.key));
}

/** Coerce a raw string editor value into the typed Vehicle field value. */
function coerceCellValue(c: ColDef, draft: string): unknown {
  const t = draft.trim();
  if (c.type === "number" || c.type === "currency") {
    if (t === "") return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  }
  if (c.type === "date") return t === "" ? null : t;
  return t === "" ? null : t;
}

/** The fields one committed cell writes. */
function cellPatch(c: ColDef, value: unknown, v: Vehicle): Partial<Vehicle> {
  if (c.toPatch) return c.toPatch(value, v);
  return { [c.key]: value } as Partial<Vehicle>;
}

function CellContent({ col, v }: { col: ColDef; v: Vehicle }) {
  if (col.render) return <>{col.render(v)}</>;

  const raw = displayValue(col, v);

  if (raw === null || raw === undefined || raw === "") {
    return <span className="text-muted-foreground/40">—</span>;
  }

  switch (col.type) {
    case "stockId":
      return (
        <span className="font-mono text-xs font-medium">{v.stockId}</span>
      );
    case "vehicle":
      return (
        <div className="flex items-center gap-2">
          <VehicleImage
            vehicle={v}
            variant="thumb"
            className="size-10 shrink-0 rounded-lg border border-(--border)"
          />
          <RegPlate registration={v.registration} size="sm" />
        </div>
      );
    case "currency":
      return (
        <span className="font-medium tabular-nums">
          {formatCurrency(typeof raw === "number" ? raw : null)}
        </span>
      );
    case "date":
      return <span className="tabular-nums">{formatDate(String(raw))}</span>;
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(n)) return <span>{String(raw)}</span>;
      return (
        <span className="tabular-nums">
          {col.plain ? String(n) : formatNumber(n)}
        </span>
      );
    }
    case "boolean":
      return raw ? (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--bg-fill-success-secondary) text-(--text-success)">
          <Check className="h-2.5 w-2.5" />
        </span>
      ) : (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="h-2.5 w-2.5" />
        </span>
      );
    case "select":
      return (
        <span className="inline-flex max-w-full items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-foreground/80">
          <span className="truncate">{String(raw)}</span>
        </span>
      );
    case "status": {
      const status = String(raw) as VehicleStatus;
      const def = VEHICLE_STATUSES.find((s) => s.value === status);
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_TONE[status],
          )}
        >
          {def?.label ?? status}
        </span>
      );
    }
    case "location":
      // Spec v3.0 · Module A — renders the location label + off-site /
      // test-drive affordances. Workshop / staff name tooltips need the
      // related-entity lookup, which the master-sheet cell doesn't carry;
      // the badge falls back to a generic tooltip in that case.
      return (
        <LocationBadge
          location={v.currentLocation}
          outForTestDrive={v.outForTestDrive}
          testDriveExpectedBackAt={v.testDriveExpectedBackAt}
        />
      );
    case "text":
    default:
      return <span className="truncate">{String(raw)}</span>;
  }
}

interface QuickAdd {
  registration: string;
  make: string;
  model: string;
  year: string;
  colour: string;
  mileage: string;
  supplierId: string;
}

const EMPTY_QUICK_ADD: QuickAdd = {
  registration: "",
  make: "",
  model: "",
  year: "",
  colour: "",
  mileage: "",
  supplierId: "",
};

interface VehicleSheetProps {
  /** Page title shown in the header. Omit when the route renders its own
   *  Polaris `Page` header (title + actions) around the sheet. */
  title?: string;
  /** Optional clarifier line (PageHelper) rendered under the title. */
  helper?: ReactNode;
  /** Row-count summary line; receives the filtered count + selected count. */
  summary: (count: number | null, selected: number) => ReactNode;
  /** Column definitions for this sheet. */
  cols: ColDef[];
  /** Fields offered in the "Add filter" condition builder. */
  filterFields: FilterField[];
  /** Filename prefix for the CSV export (date is appended). */
  csvName: string;
  /** Keys allowed to inline-edit. Defaults to the Master Sheet set. */
  editableKeys?: Set<string>;
  /** Show the quick-add footer row. Defaults to true. */
  enableQuickAdd?: boolean;
  /** Hide the Export CSV button. Defaults to false. */
  hideExport?: boolean;
  /** Extra header actions rendered after the Columns button (in the
   *  trailing CTA slot, where Export CSV otherwise sits). */
  headerActions?: ReactNode;
  /** Optional footer rendered after the table (e.g. an add-vehicle modal). */
  children?: ReactNode;
  /** Replaces the built-in "No vehicles" empty state (e.g. a Polaris
   *  EmptyState whose action opens the Add vehicle dialog). */
  emptyState?: ReactNode;
  /** Extra classes on the sheet's outer column, e.g. a shorter viewport
   *  height when a Page header sits above it. */
  className?: string;
  /**
   * Column groups offered as a switcher next to "Add filter" (Master Sheet:
   * Buying / Receiving / Value Addition / Sales Data). Columns tagged
   * `section: "common"` show in every group. Omit for no switcher.
   */
  sections?: { value: string; label: string }[];
}

/** localStorage key for the section a user last picked on a sheet. */
const sectionKey = (csvName: string): string =>
  `cc.vehicle-sheet.section.${csvName}`;

/**
 * Header-band tint per section, echoing the colour coding of the client's
 * Excel sheet so a wide "All" view still reads as blocks.
 */
const SECTION_TONE: Record<string, string> = {
  common: "bg-muted text-muted-foreground",
  buying: "bg-(--bg-surface-info) text-(--text-info)",
  receiving: "bg-(--bg-surface-caution) text-(--text-caution)",
  value_addition: "bg-(--bg-surface-emphasis) text-(--text-emphasis)",
  sales: "bg-(--bg-surface-success) text-(--text-success)",
};

export function VehicleSheet({
  title,
  helper,
  summary,
  cols: allCols,
  filterFields,
  csvName,
  editableKeys = DEFAULT_EDITABLE_KEYS,
  enableQuickAdd = true,
  hideExport = false,
  headerActions,
  children,
  sections,
  emptyState,
  className,
}: VehicleSheetProps) {
  const { company, user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  // Same gate as the Financials ledger: a cost edit re-derives the totals.
  const canEditCosts = isSuperUser || can("inventory:edit_costs");
  /** Active section, or null for every column ("All"). */
  const [section, setSection] = useState<string | null>(null);
  useEffect(() => {
    if (!sections) return;
    try {
      const saved = localStorage.getItem(sectionKey(csvName));
      if (saved && sections.some((s) => s.value === saved)) {
        // Post-mount restore, same reason as the hidden-columns effect below.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSection(saved);
      }
    } catch {
      // Blocked storage: start on "All".
    }
  }, [csvName, sections]);
  /** The grid's scroll container (set by `attachGridScroll`). */
  const gridRef = useRef<HTMLDivElement | null>(null);
  function pickSection(next: string | null) {
    setSection(next);
    // A new section starts at its first column, not wherever the last one
    // had been scrolled to.
    gridRef.current?.scrollTo({ left: 0 });
    try {
      if (next) localStorage.setItem(sectionKey(csvName), next);
      else localStorage.removeItem(sectionKey(csvName));
    } catch {
      // The in-memory choice still applies for this session.
    }
  }
  const router = useRouter();
  const pathname = usePathname();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [visible, setVisible] = useState<Set<string>>(
    new Set(allCols.map((c) => colKey(c))),
  );
  /** True once the user has curated columns themselves (GEN-93). */
  const [userPickedColumns, setUserPickedColumns] = useState(false);

  // Restore the user's hidden columns after mount rather than in the state
  // initializer: localStorage does not exist on the server, and seeding from it
  // during render makes the first client paint disagree with the SSR markup.
  // Same post-mount shape the sidebar uses for its collapsed groups (GEN-29).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(colHiddenKey(csvName));
      if (!raw) return;
      const hidden = new Set(JSON.parse(raw) as string[]);
      if (hidden.size === 0) return;
      // Deliberate post-mount setState, same as the sidebar's collapsed groups:
      // reading localStorage in the initializer would diverge from the server
      // render and cause a hydration mismatch. Runs once per sheet.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(
        new Set(allCols.map((c) => colKey(c)).filter((k) => !hidden.has(k))),
      );
      // A restored choice is still the user's choice, so it outranks the
      // responsive hiding exactly as a fresh click would.
      setUserPickedColumns(true);
    } catch {
      // Unreadable or corrupt entry: fall back to showing everything.
    }
    // Keyed by the sheet, not the column list -- allCols is a new array each
    // render and would re-run this on every one, stamping over live edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvName]);
  const isNarrow = useIsNarrow();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  // Inline-edit: which cell is open + the in-progress draft string.
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  // Quick-add row state.
  const [partners, setPartners] = useState<DealerPartner[]>([]);
  const [quick, setQuick] = useState<QuickAdd>({ ...EMPTY_QUICK_ADD });
  const [adding, setAdding] = useState(false);
  // Filter-chip bar (Variation C) state.
  const [filters, setFilters] = useState<FilterCond[]>([]);
  const [search, setSearch] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [bField, setBField] = useState<FilterField["key"]>(
    filterFields[0]?.key ?? "make",
  );
  const [bOp, setBOp] = useState(
    (filterFields[0]?.kind ?? "text") === "num" ? "gte" : "is",
  );
  const [bValue, setBValue] = useState("");
  const filterId = useRef(1);

  // Per-column width overrides (GEN-20), keyed by colKey → px. Missing keys fall
  // back to the ColDef's default width. Persisted per sheet so a user's resize
  // survives reloads; hydrated post-mount to avoid an SSR hydration mismatch.
  // Which edges of the grid have more content beyond them. Drives the scroll
  // shadows (GEN-69) — recomputed on scroll and whenever the container or its
  // content resizes (column show/hide, window resize, sidebar collapse).
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = (el: HTMLElement) => {
    const left = el.scrollLeft > 4;
    const right = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 4;
    setEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  };

  /**
   * Attach on mount via a ref callback rather than an effect: the table only
   * renders once the data has loaded, so an effect with `[]` deps runs while
   * this node is still null and the hint never seeds — you'd see no "more to
   * the right" shadow until after you'd already scrolled, which defeats it.
   *
   * ResizeObserver fires once on observe, so it also covers column show/hide,
   * window resize and the sidebar collapsing.
   */
  const attachGridScroll = useCallback((el: HTMLDivElement | null) => {
    gridRef.current = el;
    if (!el) return;
    const ro = new ResizeObserver(() => updateEdges(el));
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{
    key: string;
    startX: number;
    startW: number;
    colEl: HTMLElement | null;
    width: number;
    tableEl: HTMLElement | null;
    startTableW: number;
  } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(colWidthsKey(csvName));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setColWidths(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* corrupt/blocked storage → keep default widths */
    }
  }, [csvName]);

  const widthFor = (c: ColDef): number => colWidths[colKey(c)] ?? c.width;

  function persistWidths(next: Record<string, number>): void {
    try {
      localStorage.setItem(colWidthsKey(csvName), JSON.stringify(next));
    } catch {
      /* ignore storage failures — in-memory widths still apply */
    }
  }

  function onResizeStart(e: ReactPointerEvent, c: ColDef): void {
    // Keep the drag off the header (no sort/select side-effects) and capture the
    // pointer so move/up keep firing even once it leaves the thin handle.
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    // Grab the matching <col> so the drag can resize it imperatively — updating
    // React state on every pointermove would re-render the whole grid (43 cols ×
    // 25 rows) each frame and stutter. We commit to state only on release.
    const th = handle.closest("th");
    const tableEl = handle.closest("table") as HTMLElement | null;
    const colgroup = tableEl?.querySelector("colgroup");
    const colEl =
      th && colgroup
        ? (colgroup.children[th.cellIndex] as HTMLElement | undefined)
        : undefined;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort — the drag still tracks via move/up */
    }
    const startW = widthFor(c);
    resizeRef.current = {
      key: colKey(c),
      startX: e.clientX,
      startW,
      colEl: colEl ?? null,
      width: startW,
      tableEl,
      startTableW: tableEl?.offsetWidth ?? 0,
    };
  }
  function onResizeMove(e: ReactPointerEvent): void {
    const r = resizeRef.current;
    if (!r) return;
    r.width = Math.min(
      Math.max(r.startW + (e.clientX - r.startX), MIN_COL_W),
      MAX_COL_W,
    );
    // Imperative width update — no setState, so no re-render mid-drag. Under
    // table-fixed the table width must track the summed columns too, else a
    // shrink just redistributes the freed space back into the column.
    const delta = r.width - r.startW;
    if (r.colEl) r.colEl.style.width = `${r.width}px`;
    if (r.tableEl) r.tableEl.style.width = `${r.startTableW + delta}px`;
  }
  function onResizeEnd(e: ReactPointerEvent): void {
    const r = resizeRef.current;
    if (!r) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* no-op if capture was never acquired */
    }
    resizeRef.current = null;
    // A click with no drag (width unchanged) shouldn't pin/persist a width.
    if (r.width === r.startW) return;
    // Commit the final width to state (keeps React in sync) + persist once.
    setColWidths((prev) => {
      const next = { ...prev, [r.key]: r.width };
      persistWidths(next);
      return next;
    });
  }
  function resetWidth(c: ColDef): void {
    // Double-click a handle → drop the override, back to the ColDef default.
    setColWidths((prev) => {
      const next = { ...prev };
      delete next[colKey(c)];
      persistWidths(next);
      return next;
    });
  }

  useEffect(() => {
    if (!company) return;
    void vehicleService.getAll(company.id).then(setVehicles);
    if (enableQuickAdd) {
      void dealerPartnerService.getAll(company.id).then(setPartners);
    }
  }, [company, enableQuickAdd]);

  function startEdit(v: Vehicle, c: ColDef) {
    const raw = rawValue(c, v);
    setEditing({ id: v.id, key: colKey(c) });
    setDraft(raw === null || raw === undefined ? "" : String(raw));
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  async function commitEdit(v: Vehicle, c: ColDef, valueOverride?: unknown) {
    if (!user || !company) return;
    const value =
      valueOverride !== undefined ? valueOverride : coerceCellValue(c, draft);
    const patch = cellPatch(c, value, v);
    const changed = (Object.keys(patch) as (keyof Vehicle)[]).filter(
      (k) => v[k] !== patch[k],
    );
    if (changed.length === 0) {
      cancelEdit();
      return;
    }
    // A cost edit moves the stored totals (TOTAL BUYING PRICE, base cost,
    // profit), so it needs the same permission as the Financials ledger and
    // must write the re-derived figures in the same update.
    if (affectsCostTotals(patch) && !canEditCosts) {
      toast.error("You don't have permission to edit costs");
      cancelEdit();
      return;
    }
    const full = withDerivedCosts(v, patch);
    setSavingCell(true);
    const snapshot = vehicles;
    // Optimistic: patch the local row immediately.
    setVehicles((prev) =>
      prev
        ? prev.map((row) => (row.id === v.id ? { ...row, ...full } : row))
        : prev,
    );
    try {
      const updated = await vehicleService.update(v.id, full, user.id, {
        description: `${v.registration}: ${c.label} updated`,
        changes: changed.map((k) => ({
          key: String(k),
          label: c.label,
          from: v[k],
          to: patch[k],
        })),
      });
      // Replace with the authoritative row (also refreshes any derived
      // values the server recomputed).
      setVehicles((prev) =>
        prev ? prev.map((row) => (row.id === v.id ? updated : row)) : prev,
      );
      toast.success(`${updated.registration}: ${c.label} updated`);
    } catch (e) {
      console.warn("[vehicle-sheet] cell update failed", e);
      setVehicles(snapshot); // revert
      toast.error(`Couldn't save ${c.label}, reverted`);
    } finally {
      setSavingCell(false);
      cancelEdit();
    }
  }

  async function handleQuickAdd() {
    if (!user || !company) return;
    const reg = quick.registration.trim().toUpperCase();
    if (!reg || !quick.make.trim()) {
      toast.error("Registration and make are required");
      return;
    }
    setAdding(true);
    try {
      const yearNum = Number(quick.year);
      const mileageNum = Number(quick.mileage);
      const today = new Date().toISOString().slice(0, 10);
      const created = await vehicleService.create(
        {
          companyId: company.id,
          registration: reg,
          tagNumber: null,
          make: quick.make.trim(),
          model: quick.model.trim(),
          variantName: null,
          variantCode: null,
          year:
            Number.isFinite(yearNum) && yearNum > 0
              ? yearNum
              : new Date().getFullYear(),
          colour: quick.colour.trim() || "Unknown",
          mileage: Number.isFinite(mileageNum) ? mileageNum : 0,
          vehicleType: "car",
          bodyType: "hatchback",
          fuelType: "petrol",
          transmission: "manual",
          engineSizeCC: null,
          receivedDate: today,
          receivedBy: user.id,
          sellerName: "—",
          sellerPhone: "",
          purchaseSource: "dealer",
          purchaseChannel: null,
          supplierId: null,
          customFields: {},
          localOrImport: "local",
          auctionHouse: null,
          ownedBy: null,
          managedBy: null,
          invoiceDate: null,
          v5Received: false,
          serviceHistory: "none",
          numKeys: 1,
          lockNut: false,
          motExpiry: null,
          vin: null,
          firstRegisteredDate: null,
          buyingPrice: 0,
          vatOnBuyingPrice: 0,
          buyersFee: null,
          inspectionCharge: null,
          collectionFee: null,
          deliveryFee: null,
          lateStorageFee: null,
          otherCharges: null,
          totalBuyingPrice: 0,
          financeProvider: "none",
          loadingFee: null,
          dailyChargeRate: null,
          unloadingFee: null,
          stockingCharges: 0,
          valueAddition: 0,
          warrantyCost: null,
          landedCost: 0,
          baseCost: 0,
          minimumSalePrice: null,
          listingPrice: null,
          sellingPrice: null,
          dateSold: null,
          sellingAgent: null,
          grossEarning: null,
          status: "received",
          removedFromWebsiteAt: null,
          daysInStock: 0,
          imagesCount: 0,
          heroImageUrl: null,
          // Module-F (migration 0017) — quick-add doesn't run the DVLA lookup,
          // so compliance fields land as null. Edit later via the vehicle
          // detail page to populate them.
          co2Emissions: null,
          euroStatus: null,
          taxStatus: null,
          taxDueDate: null,
          motStatus: null,
          wheelplan: null,
          automatedVehicle: null,
          dateOfLastV5CIssued: null,
          // AutoTrader (migration 0018) — quick-add skips the lookup.
          derivative: null,
          generation: null,
          trim: null,
          atDerivativeId: null,
          atRetailValuation: null,
          atTradeValuation: null,
          atPartExchangeValuation: null,
          atPrivateValuation: null,
          atPriceIndicator: null,
          atValuationAt: null,
        },
        user.id,
      );
      if (quick.supplierId) {
        await dealerPartnerService.assignSupplier(created.id, quick.supplierId);
      }
      setVehicles(await vehicleService.getAll(company.id));
      toast.success(`${created.stockId} · ${reg} added`);
      setQuick({ ...EMPTY_QUICK_ADD });
    } catch (e) {
      console.warn("[vehicle-sheet] quick-add failed", e);
      toast.error("Couldn't add vehicle");
    } finally {
      setAdding(false);
    }
  }

  /**
   * Columns actually rendered (GEN-93).
   *
   * Low-priority columns drop out below `lg` so the grid is not 1740px of
   * horizontal drag on a phone — but only while the user has left the picker
   * alone. Once they have curated their own set, that is an explicit
   * statement of what they want to see and the breakpoint stops overruling
   * it; the grid scrolls instead, exactly as before.
   *
   * This filters the array rather than applying `display: none`, because
   * hiding a cell does not collapse its column: the matching `<col>` in the
   * colgroup keeps reserving its width, leaving the table just as wide with
   * blank gaps where the columns were.
   */
  const cols = useMemo(() => {
    const chosen = allCols.filter(
      (c) =>
        visible.has(colKey(c)) &&
        // The section switcher narrows, never hides identifiers.
        (!section || !c.section || c.section === "common" || c.section === section),
    );
    if (userPickedColumns || !isNarrow) return chosen;
    return chosen.filter((c) => !c.mobileHide);
  }, [allCols, visible, userPickedColumns, isNarrow, section]);

  /**
   * Left offset of a sticky column: the row-counter (40px) plus every sticky
   * column rendered before it, so several leading columns can pin side by side.
   */
  const stickyLeft = (c: ColDef): number => {
    let left = 40;
    for (const other of cols) {
      if (colKey(other) === colKey(c)) break;
      if (other.sticky) left += widthFor(other);
    }
    return left;
  };

  /** Right edge of the pinned columns — where scrolled content starts. */
  const stickyEdge = cols.reduce(
    (edge, c) => (c.sticky ? edge + widthFor(c) : edge),
    40,
  );

  /**
   * Row-2 band of the Excel sheet: contiguous runs of columns in the same
   * section, each labelled once. Only drawn when the sheet has sections.
   */
  const bands = useMemo(() => {
    if (!sections) return [];
    const out: { section: string; label: string; span: number }[] = [];
    for (const c of cols) {
      const s = c.section ?? "common";
      const last = out[out.length - 1];
      if (last && last.section === s) last.span += 1;
      else
        out.push({
          section: s,
          label:
            sections.find((x) => x.value === s)?.label ??
            (s === "common" ? "Common" : ""),
          span: 1,
        });
    }
    return out;
  }, [cols, sections]);

  /** Active column sort, or null for the grid's natural order (GEN-92). */
  const [sort, setSort] = useState<SortState | null>(null);

  const filtered = useMemo(() => {
    if (!vehicles) return null;
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (q) {
        const hay =
          `${v.registration} ${v.stockId} ${v.make} ${v.model}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return filters.every((c) => matchCond(c, v));
    });
  }, [vehicles, search, filters]);

  /**
   * Sorted view of `filtered` (GEN-92). Sorting sits between filtering and
   * paging so it orders the whole result set, not just the visible page —
   * clicking "Web price" must surface the cheapest car in the filter, not the
   * cheapest of the 25 currently on screen.
   */
  const sorted = useMemo(() => {
    if (!filtered) return null;
    if (!sort) return filtered;
    const col = allCols.find((c) => colKey(c) === sort.column);
    if (!col) return filtered;
    return sortRows(filtered, (v) => sortValueFor(col, v), sort.direction);
  }, [filtered, sort, allCols]);

  // Keep the selection confined to currently-visible rows. Without this,
  // "select all" + a later filter/search change would keep counting (and
  // acting on) rows that are no longer on screen.
  useEffect(() => {
    if (!filtered) return;
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(filtered.map((v) => v.id));
      const next = new Set<string>();
      for (const id of prev) if (visibleIds.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  function addFilter() {
    const fld = filterFields.find((f) => f.key === bField);
    if (!fld || !bValue.trim()) return;
    setFilters((prev) => [
      ...prev,
      {
        id: filterId.current++,
        key: fld.key,
        label: fld.label,
        kind: fld.kind,
        get: fld.get,
        options: fld.options,
        op: bOp,
        value: bValue.trim(),
      },
    ]);
    setBValue("");
    setBuilderOpen(false);
    setPage(1);
  }

  function removeFilter(id: number) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    setPage(1);
  }

  const totalPages = sorted
    ? Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
    : 1;
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    if (!sorted) return null;
    const start = (safePage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, safePage]);

  function toggle(k: string) {
    // Once the user has curated their own column set, responsive hiding stops
    // applying — their choice outranks our breakpoint heuristic (GEN-93).
    setUserPickedColumns(true);
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      try {
        const hidden = allCols
          .map((c) => colKey(c))
          .filter((key) => !next.has(key));
        localStorage.setItem(colHiddenKey(csvName), JSON.stringify(hidden));
      } catch {
        // Storage full or blocked — the in-memory choice still applies for
        // this session, which is the behaviour before it persisted at all.
      }
      return next;
    });
  }

  /** Open a vehicle's detail page, stamping the originating list path as
   *  `?from=` so the detail Back button returns here (not always Inventory). */
  function openVehicle(id: string) {
    router.push(vehicleDetailHref(id, pathname));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!filtered) return;
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((v) => v.id)),
    );
  }

  function exportCsv() {
    // Export follows the on-screen order, so a sorted grid exports sorted.
    if (!sorted) return;
    // Export every defined column (not just the visible ones) so hidden
    // columns aren't silently dropped from the data file. cellCsv reads the
    // raw value, so number/currency columns export bare numerics, not the
    // formatted display strings.
    const head = allCols.map((c) => csvEscape(c.label)).join(",");
    const body = sorted
      .map((v) => allCols.map((c) => csvEscape(cellCsv(c, v))).join(","))
      .join("\n");
    const csv = `${head}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    // No padding here — the dashboard shell (AdminShell) already pads a route
    // without a Polaris Page, and adding more doubled it (GEN-61).
    <>
      {/* Bounded viewport height so the table's own container scrolls (and the
          sticky <thead> sticks) instead of the whole page scrolling. */}
      <div className={cn("flex h-[calc(100dvh-8rem)] flex-col gap-3", className)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title ? (
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            ) : null}
            {helper}
            <p className="text-sm text-muted-foreground">
              {summary(filtered?.length ?? null, selected.size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* The page's existing column visibility popover stays — it uses
                a 2-column grid layout that the generic DataGridColumnsButton
                doesn't replicate. Migrate in a follow-up if we want parity. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                  Columns ({cols.length}/{allCols.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <ScrollArea className="max-h-[60vh] p-3">
                  {/* Says out loud what the responsive rule does, and that
                      choosing columns turns it off (GEN-93). */}
                  {!userPickedColumns && allCols.some((c) => c.mobileHide) && (
                    <p className="mb-3 text-2xs leading-relaxed text-muted-foreground">
                      On a narrow screen some columns are hidden to keep the
                      grid readable. Choose your own columns here and every one
                      you pick stays visible at any width.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {allCols.map((c) => {
                      const k = colKey(c);
                      return (
                        <Label
                          key={k}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Checkbox
                            checked={visible.has(k)}
                            onCheckedChange={() => toggle(k)}
                          />
                          {c.label}
                        </Label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            {!hideExport && (
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered}>
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
            )}
            {headerActions}
          </div>
        </div>

        {/* Variation C — filter-chip bar: applied chips + add-condition builder */}
        <div className="flex flex-col gap-2 rounded-xl border border-(--border) bg-card px-3 py-2 shadow-(--shadow-100)">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-(--text-secondary)">
              Filters
            </span>
            {filters.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No filters applied
              </span>
            )}
            {filters.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--bg-fill-transparent-secondary) px-2 py-0.5 text-xs font-medium text-(--text)"
              >
                <span className="text-muted-foreground">{f.label}</span>
                <span className="text-muted-foreground">{opLabel(f.op)}</span>
                <span className="font-medium">{f.value}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(f.id)}
                  aria-label={`Remove ${f.label} filter`}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {/* Plain search input — no "Search" label above it (GEN-40); the
                  placeholder describes it and aria-label keeps it accessible. */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search"
                  placeholder="Search reg, stock, make…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-56 rounded-lg pl-7 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setBuilderOpen((o) => !o)}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-(--text) hover:bg-(--bg-fill-transparent-hover)"
              >
                <Plus className="h-3.5 w-3.5" /> Add filter
              </button>
              {sections && (
                // Section switcher (client ask: one grid, a column-group picker
                // beside Add filter instead of more tabs).
                <div
                  role="radiogroup"
                  aria-label="Section"
                  className="inline-flex shrink-0 items-center gap-0.5"
                >
                  {[{ value: null, label: "All" }, ...sections].map((s) => {
                    const on = section === s.value;
                    return (
                      <button
                        key={s.value ?? "all"}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          pickSection(s.value);
                          setPage(1);
                        }}
                        className={cn(
                          "h-7 rounded-lg px-3 text-sm transition-colors",
                          on
                            ? "bg-(--bg-fill-transparent-selected) font-medium text-(--text)"
                            : "text-(--text-secondary) hover:bg-(--bg-fill-transparent-hover)",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {builderOpen && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-(--bg-surface-secondary) p-2">
              <span className="text-sm font-medium text-(--text-secondary)">
                Add condition
              </span>
              <select
                aria-label="Field"
                value={String(bField)}
                onChange={(e) => {
                  const key = e.target.value as FilterField["key"];
                  setBField(key);
                  setBOp(kindOf(filterFields, key) === "num" ? "gte" : "is");
                }}
                className={cn(FIELD_CLASS, "w-44")}
              >
                {filterFields.map((f) => (
                  <option key={String(f.key)} value={String(f.key)}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Operator"
                value={bOp}
                onChange={(e) => setBOp(e.target.value)}
                className={cn(FIELD_CLASS, "w-28")}
              >
                {opsFor(kindOf(filterFields, bField)).map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
              <input
                aria-label="Value"
                placeholder="Value…"
                value={bValue}
                onChange={(e) => setBValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addFilter();
                }}
                className={cn(FIELD_CLASS, "w-48")}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBuilderOpen(false);
                  setBValue("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={addFilter}>
                Add filter
              </Button>
            </div>
          )}
        </div>

        {!filtered ? (
          <Skeleton className="h-72" />
        ) : filtered.length === 0 && emptyState ? (
          emptyState
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No vehicles"
            description="Add a vehicle or adjust your filters."
          />
        ) : (
          <Card className="relative flex min-h-0 flex-1 flex-col p-0">
            {/* Edge shadows: the only thing telling you the grid continues
                sideways. Scrolling always worked here, but with 13 columns in
                a ~700px window and macOS hiding its overlay scrollbar until
                you move it, there was nothing on screen to say so — which
                reads as "it can't scroll" (GEN-69). */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-40 w-6 bg-gradient-to-r from-(--bg-fill-transparent-secondary-active) to-transparent transition-opacity",
                edges.left ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-40 w-6 bg-gradient-to-l from-(--bg-fill-transparent-secondary-active) to-transparent transition-opacity",
                edges.right ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              ref={attachGridScroll}
              onScroll={(e) => updateEdges(e.currentTarget)}
              className="relative min-h-0 flex-1 overflow-auto">
              {/* table-fixed makes the colgroup widths authoritative so a
                  resize actually sticks — under auto layout a wide-content
                  column (e.g. Variant) ignored its <col> width and couldn't be
                  shrunk (GEN-20). The explicit width tracks the summed columns
                  so the container scrolls horizontally as before. */}
              <table
                className="table-fixed border-separate text-xs"
                style={{
                  width: 80 + cols.reduce((sum, c) => sum + widthFor(c), 0),
                  borderSpacing: 0,
                }}
              >
                <colgroup>
                  <col style={{ width: 40 }} />
                  {cols.map((c) => (
                    <col
                      key={colKey(c)}
                      style={{ width: widthFor(c) }}
                    />
                  ))}
                  <col style={{ width: 40 }} />
                </colgroup>
                {/* Surfaces are card-white (GEN-62). The sticky header/column
                    still need an OPAQUE fill so rows don't show through while
                    scrolling — bg-card is opaque, and the header keeps its
                    borders + font-medium to read as a band without a tint. */}
                <thead className="sticky top-0 z-20 bg-card">
                  {bands.length > 0 && (
                    <tr aria-hidden>
                      <th className="sticky left-0 z-30 border-b bg-(--bg-surface-secondary)" />
                      {bands.map((b, i) => (
                        <th
                          key={`${b.section}-${i}`}
                          colSpan={b.span}
                          className={cn(
                            "h-5 border-b px-2 text-left text-2xs font-semibold uppercase tracking-wide",
                            SECTION_TONE[b.section] ?? SECTION_TONE.common,
                          )}
                        >
                          {/* Sticks beside the pinned columns so the name of a
                              wide section stays readable while scrolling it. */}
                          <span
                            className="sticky block w-max"
                            // The pinned band sits under the pinned columns;
                            // every other band sticks just to their right.
                            style={{ left: b.section === "common" ? 48 : stickyEdge + 8 }}
                          >
                            {b.label}
                          </span>
                        </th>
                      ))}
                      <th className="border-b" />
                    </tr>
                  )}
                  <tr>
                    <th className="sticky left-0 z-30 border-b bg-(--bg-surface-secondary) shadow-[1px_0_0_var(--border)]">
                      <div className="flex h-8 items-center justify-center">
                        <Checkbox
                          checked={
                            filtered.length > 0 &&
                            selected.size === filtered.length
                          }
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </div>
                    </th>
                    {cols.map((c) => (
                      <th
                        key={colKey(c)}
                        className={cn(
                          "relative border-b bg-(--bg-surface-secondary) px-2 text-left font-medium",
                          c.sticky &&
                            "sticky z-30 bg-(--bg-surface-secondary) shadow-[1px_0_0_var(--border)]",
                        )}
                        style={c.sticky ? { left: stickyLeft(c) } : undefined}
                        aria-sort={
                          sort?.column === colKey(c)
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        {/* Click to sort: asc → desc → unsorted (GEN-92). */}
                        <button
                          type="button"
                          onClick={() =>
                            setSort((prev) => cycleSort(prev, colKey(c)))
                          }
                          aria-label={`Sort by ${c.label}`}
                          title={c.label}
                          className={cn(
                            "flex w-full min-w-0 cursor-pointer items-center gap-1 pr-1 text-left text-xs hover:text-foreground",
                            // Sheets with sections carry the client's long Excel
                            // headers ("BCA ESSENTIAL CHECK / BCA ASSURED
                            // CHARGE"): let them wrap to two lines, not clip.
                            sections ? "min-h-10 py-1" : "h-8",
                          )}
                        >
                          <span
                            className={cn(
                              "min-w-0 font-medium text-foreground",
                              sections ? "line-clamp-2 leading-tight" : "truncate",
                            )}
                          >
                            {c.label}
                          </span>
                          {sort?.column === colKey(c) ? (
                            sort.direction === "asc" ? (
                              <ArrowUp className="size-3 shrink-0 text-primary" />
                            ) : (
                              <ArrowDown className="size-3 shrink-0 text-primary" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground/40" />
                          )}
                        </button>
                        {/* Resize handle: a wide, easy-to-grab hit area (GEN-20)
                            straddling the right border, with a thin accent line
                            shown on hover. Drag to resize, double-click resets. */}
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${c.label} column`}
                          onPointerDown={(e) => onResizeStart(e, c)}
                          onPointerMove={onResizeMove}
                          onPointerUp={onResizeEnd}
                          onDoubleClick={() => resetWidth(c)}
                          className="group/resize absolute -right-1.5 top-0 z-40 flex h-full w-3 cursor-col-resize touch-none select-none justify-center"
                          title="Drag to resize · double-click to reset"
                        >
                          <span className="h-full w-0.5 bg-transparent transition-colors group-hover/resize:bg-primary/60 group-active/resize:bg-primary" />
                        </div>
                      </th>
                    ))}
                    <th className="border-b">
                      <div className="flex h-8 items-center justify-center text-muted-foreground">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </th>
                  </tr>
                </thead>
                {/* bg-card, not bg-background: this element paints the whole
                    body, so page-grey here hid the white Card behind the grid
                    and made every row read grey (GEN-62). */}
                <tbody className="bg-card">
                  {(pagedRows ?? []).map((v, idxOnPage) => {
                    const isSelected = selected.has(v.id);
                    const idx = (safePage - 1) * PAGE_SIZE + idxOnPage;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => openVehicle(v.id)}
                        className={cn(
                          "group/row cursor-pointer",
                          isSelected && "bg-(--bg-surface-selected)",
                        )}
                      >
                        <td
                          className={cn(
                            // SOLID backgrounds on sticky cells — a
                            // translucent sticky cell lets scrolled-out
                            // content bleed through and corrupts cell
                            // text (date columns sliding under stock IDs
                            // produced "CC400072026"-style artifacts).
                            // bg-card is opaque AND matches the white grid
                            // surface (GEN-62). Drop shadow marks the
                            // sticky boundary.
                            "sticky left-0 z-10 border-b bg-card text-center",
                            "shadow-[1px_0_0_var(--border)]",
                            // Sticky cells can't use the row's translucent
                            // tints (they'd bleed), so mix the SAME tints
                            // into --card to get an opaque colour identical
                            // to what the normal cells composite to.
                            isSelected &&
                              "bg-(--bg-surface-selected)",
                            "group-hover/row:bg-(--bg-surface-hover)",
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex h-11 items-center justify-center">
                                                        <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(v.id)}
                              aria-label={`Select row ${idx + 1}`}
                              
                            />
                          </div>
                        </td>
                        {cols.map((c) => {
                          const columnEditable = isEditableCol(c, editableKeys);
                          const editable =
                            columnEditable && (c.editableFor?.(v) ?? true);
                          const lockedHint =
                            columnEditable && !editable
                              ? c.readOnlyHint
                              : undefined;
                          const isEditingThis =
                            editing?.id === v.id && editing?.key === colKey(c);
                          const alignEnd =
                            c.type === "currency" || c.type === "number";
                          return (
                            <td
                              key={colKey(c)}
                              className={cn(
                                "border-b px-2",
                                // Sticky data cells: SOLID bg + shadow.
                                // Inner sticky cells' shadows are occluded
                                // by the next sticky cell's solid bg via
                                // paint order; only the rightmost shadow
                                // is visually present.
                                // Sticky cells mix the row's tints into
                                // --card so they stay opaque while matching
                                // the normal cells exactly (GEN-62).
                                c.sticky &&
                                  "sticky z-10 bg-card shadow-[1px_0_0_var(--border)] group-hover/row:bg-(--bg-surface-hover)",
                                isSelected &&
                                  c.sticky &&
                                  "bg-(--bg-surface-selected)",
                                !c.sticky && "group-hover/row:bg-(--bg-surface-hover)",
                              )}
                              style={c.sticky ? { left: stickyLeft(c) } : undefined}
                            >
                              <div
                                className={cn(
                                  // min-w-0 + overflow-hidden let truncating
                                  // cell text clip cleanly inside the now
                                  // fixed-width column (GEN-20).
                                  "flex h-11 min-w-0 items-center overflow-hidden [&_span]:min-w-0",
                                  alignEnd ? "justify-end" : "justify-start",
                                )}
                              >
                                {isEditingThis && c.options ? (
                                  // Fixed choices edit with a dropdown in the
                                  // same flush style; picking commits at once.
                                  <select
                                    autoFocus
                                    value={draft}
                                    disabled={savingCell}
                                    aria-label={c.label}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      void commitEdit(v, c, e.target.value || null)
                                    }
                                    onBlur={cancelEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEdit();
                                      }
                                    }}
                                    className="-mx-1 h-7 w-full min-w-0 rounded bg-primary/10 px-1 text-xs text-foreground outline-none disabled:opacity-60"
                                  >
                                    <option value="">—</option>
                                    {c.options.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : isEditingThis ? (
                                  // Plain input, not the shadcn <Input>: that
                                  // renders a bordered wrapper whose font
                                  // (sm:text-sm) and baked-in padding can't be
                                  // matched to the read-only cell, so the value
                                  // jumped in size + position on edit (GEN-39).
                                  // Match the read-only button exactly — text-xs
                                  // and the same "-mx-1 px-1" flush inset — and
                                  // use a bg tint (not a border, which the cell's
                                  // overflow-hidden would clip) as the affordance.
                                  <input
                                    autoFocus
                                    type={
                                      c.type === "date"
                                        ? "date"
                                        : c.type === "number" ||
                                            c.type === "currency"
                                          ? "number"
                                          : "text"
                                    }
                                    value={draft}
                                    disabled={savingCell}
                                    aria-label={c.label}
                                    list={
                                      c.suggestions
                                        ? `${csvName}-${colKey(c)}-suggestions`
                                        : undefined
                                    }
                                    step={c.type === "currency" ? "0.01" : undefined}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onBlur={() => void commitEdit(v, c)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void commitEdit(v, c);
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEdit();
                                      }
                                    }}
                                    className={cn(
                                      "-mx-1 h-7 w-full min-w-0 rounded bg-primary/10 px-1 text-xs text-foreground caret-primary outline-none disabled:opacity-60",
                                      alignEnd && "text-right",
                                    )}
                                  />
                                ) : editable ? (
                                  <button
                                    type="button"
                                    title="Click to edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (c.type === "boolean") {
                                        void commitEdit(
                                          v,
                                          c,
                                          !v[c.key as keyof Vehicle],
                                        );
                                      } else {
                                        startEdit(v, c);
                                      }
                                    }}
                                    className="-mx-1 flex w-full min-w-0 cursor-pointer items-center rounded px-1 text-left hover:bg-primary/5 focus-visible:outline-1"
                                    style={
                                      alignEnd
                                        ? { justifyContent: "flex-end" }
                                        : undefined
                                    }
                                  >
                                    <CellContent col={c} v={v} />
                                  </button>
                                ) : lockedHint ? (
                                  <span
                                    title={lockedHint}
                                    className="flex w-full min-w-0 cursor-help items-center"
                                    style={
                                      alignEnd
                                        ? { justifyContent: "flex-end" }
                                        : undefined
                                    }
                                  >
                                    <CellContent col={c} v={v} />
                                  </span>
                                ) : (
                                  <CellContent col={c} v={v} />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="border-b group-hover/row:bg-(--bg-surface-hover)" />
                      </tr>
                    );
                  })}
                  {/* Quick-add row — minimal create with auto stock ID */}
                  {enableQuickAdd && (
                    <tr className="bg-(--bg-surface-secondary)">
                      <td
                        colSpan={cols.length + 2}
                        className="border-b px-2 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Plus className="h-3.5 w-3.5" /> Quick add
                          </span>
                          <Input
                            value={quick.registration}
                            onChange={(e) =>
                              setQuick({
                                ...quick,
                                registration: e.target.value,
                              })
                            }
                            placeholder="Reg *"
                            className="h-8 w-28 text-xs uppercase"
                          />
                          <Input
                            value={quick.make}
                            onChange={(e) =>
                              setQuick({ ...quick, make: e.target.value })
                            }
                            placeholder="Make *"
                            className="h-8 w-28 text-xs"
                          />
                          <Input
                            value={quick.model}
                            onChange={(e) =>
                              setQuick({ ...quick, model: e.target.value })
                            }
                            placeholder="Model"
                            className="h-8 w-28 text-xs"
                          />
                          <Input
                            value={quick.year}
                            onChange={(e) =>
                              setQuick({ ...quick, year: e.target.value })
                            }
                            placeholder="Year"
                            type="number"
                            className="h-8 w-20 text-xs"
                          />
                          <Input
                            value={quick.colour}
                            onChange={(e) =>
                              setQuick({ ...quick, colour: e.target.value })
                            }
                            placeholder="Colour"
                            className="h-8 w-24 text-xs"
                          />
                          <Input
                            value={quick.mileage}
                            onChange={(e) =>
                              setQuick({ ...quick, mileage: e.target.value })
                            }
                            placeholder="Mileage"
                            type="number"
                            className="h-8 w-24 text-xs"
                          />
                          <select
                            value={quick.supplierId}
                            onChange={(e) =>
                              setQuick({ ...quick, supplierId: e.target.value })
                            }
                            aria-label="Dealer partner"
                            className="h-8 rounded-md border bg-background px-2 text-xs"
                          >
                            <option value="">No dealer partner</option>
                            {partners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => void handleQuickAdd()}
                            disabled={adding}
                          >
                            {adding ? "Adding…" : "Add vehicle"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filtered && filtered.length > PAGE_SIZE && (
          // Phase B — shared DataGridPagination primitive.
          <Card className="p-0">
            <DataGridPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
            />
          </Card>
        )}
      </div>
      {/* Type-ahead lists for the free-text cells that have suggestions. */}
      {allCols
        .filter((c) => c.suggestions)
        .map((c) => (
          <datalist key={colKey(c)} id={`${csvName}-${colKey(c)}-suggestions`}>
            {c.suggestions!.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ))}
      {children}
    </>
  );
}
