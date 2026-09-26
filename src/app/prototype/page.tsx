"use client";

/**
 * Prototype page (see .claude/skills/prototype). Current feature: the Master
 * sheet — five variations grounded in Mobbin references, built with the
 * Polaris kit. Presentational only. Each covers the pinned identity columns,
 * the four sections of the client's Excel sheet (72 columns), computed
 * columns, inline editing, filters/search, column picking, export and scale
 * (1,862 legacy rows); loading / empty / saving / error states are at the foot.
 */
import * as React from "react";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  FunctionSquare,
  Group,
  Rows3,
  Search,
  X,
} from "lucide-react";
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Page,
  Pagination,
  SkeletonBodyText,
  Tabs,
  TextField,
  Thumbnail,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";

/* ── Sample data ───────────────────────────────────────────────────── */

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=160&h=120&q=60`;

type Row = {
  stock: string;
  reg: string;
  photo: string;
  make: string;
  model: string;
  variant: string;
  auction: string;
  invoice: string;
  purchase: string;
  buying: number;
  received: string;
  logBook: string;
  keys: number;
  service: string;
  status: "Available" | "Sold";
  sold: string;
  selling: number | null;
};

const ROWS: Row[] = [
  { stock: "D-0025", reg: "GK67 ZPL", photo: img("photo-1742021923146-039f25019c0a"), make: "Honda", model: "Jazz", variant: "SE", auction: "BCA Blackbushe", invoice: "12 Sep 2026", purchase: "Sep 2026", buying: 6120, received: "13 Sep 2026", logBook: "Available", keys: 2, service: "Full", status: "Available", sold: "", selling: null },
  { stock: "D-0003", reg: "PK68 DPL", photo: img("photo-1718903502278-f81c5a754294"), make: "BMW", model: "3 Series", variant: "320d M Sport", auction: "BCA Paddock Wood", invoice: "30 Aug 2026", purchase: "Aug 2026", buying: 9141, received: "31 Aug 2026", logBook: "Available", keys: 2, service: "Partial", status: "Sold", sold: "24 Sep 2026", selling: 11800 },
  { stock: "D-0035", reg: "GK17 JJD", photo: img("photo-1734554284184-4bcf245250c5"), make: "BMW", model: "3 Series", variant: "SE", auction: "Camberley", invoice: "19 Aug 2026", purchase: "Aug 2026", buying: 12396, received: "20 Aug 2026", logBook: "Not available", keys: 1, service: "Unknown", status: "Sold", sold: "19 Sep 2026", selling: 15600 },
  { stock: "D-0019", reg: "WF69 TYU", photo: img("photo-1557775209-f28ede453ae3"), make: "Nissan", model: "Leaf", variant: "Tekna", auction: "BCA Blackbushe", invoice: "02 Aug 2026", purchase: "Aug 2026", buying: 3646, received: "04 Aug 2026", logBook: "Available", keys: 2, service: "Full", status: "Sold", sold: "02 Sep 2026", selling: 4500 },
  { stock: "D-0023", reg: "SB19 XYU", photo: img("photo-1551206820-1a2050e76dd7"), make: "Ford", model: "Focus", variant: "ST-Line", auction: "Partex", invoice: "15 Jul 2026", purchase: "Jul 2026", buying: 7480, received: "17 Jul 2026", logBook: "Available", keys: 2, service: "Partial", status: "Available", sold: "", selling: null },
  { stock: "D-0040", reg: "GK17 OPL", photo: img("photo-1684839371407-17bddcf946d0"), make: "Nissan", model: "Qashqai", variant: "N-Connecta", auction: "BCA Blackbushe", invoice: "22 Jun 2026", purchase: "Jun 2026", buying: 8523, received: "23 Jun 2026", logBook: "Available", keys: 2, service: "Full", status: "Sold", sold: "31 Aug 2026", selling: 10700 },
];

const gbp = (n: number | null) => (n === null ? "—" : `£${n.toLocaleString("en-GB")}`);
const sp = (r: Row) => (r.selling === null ? null : r.selling - r.buying);

const SECTIONS = [
  { id: "all", label: "All", count: 72 },
  { id: "buying", label: "Buying", count: 20 },
  { id: "receiving", label: "Receiving", count: 18 },
  { id: "value", label: "Value addition", count: 22 },
  { id: "sales", label: "Sales data", count: 9 },
];

type Section = "buying" | "receiving" | "value" | "sales";
type Col = { key: string; label: string; letter: string; section: Section; computed?: boolean; num?: boolean; get: (r: Row) => React.ReactNode };

const COLS: Col[] = [
  { key: "make", label: "Make", letter: "C", section: "buying", get: (r) => r.make },
  { key: "model", label: "Model", letter: "D", section: "buying", get: (r) => r.model },
  { key: "variant", label: "Variant name", letter: "E", section: "buying", get: (r) => r.variant },
  { key: "auction", label: "Auction house", letter: "L", section: "buying", get: (r) => r.auction },
  { key: "invoice", label: "Invoice date", letter: "O", section: "buying", get: (r) => r.invoice },
  { key: "purchase", label: "Purchase month", letter: "Q", section: "buying", computed: true, get: (r) => r.purchase },
  { key: "buying", label: "Total buying price", letter: "AI", section: "buying", computed: true, num: true, get: (r) => gbp(r.buying) },
  { key: "received", label: "Vehicle receiving date", letter: "AJ", section: "receiving", get: (r) => r.received },
  { key: "confirm", label: "Receiving confirmation", letter: "AK", section: "receiving", computed: true, get: () => "Received" },
  { key: "logbook", label: "Log book", letter: "AN", section: "receiving", get: (r) => r.logBook },
  { key: "keys", label: "No. of keys", letter: "AU", section: "receiving", num: true, get: (r) => r.keys },
  { key: "service", label: "Service history", letter: "AZ", section: "receiving", get: (r) => r.service },
  { key: "status", label: "Available / sold", letter: "BK", section: "sales", get: (r) => <Badge tone={r.status === "Sold" ? "success" : "info"}>{r.status}</Badge> },
  { key: "sold", label: "Date sold", letter: "BL", section: "sales", get: (r) => r.sold || "—" },
  { key: "selling", label: "Selling price", letter: "BM", section: "sales", num: true, get: (r) => gbp(r.selling) },
  {
    key: "sp", label: "S - P", letter: "BP", section: "sales", computed: true, num: true,
    get: (r) => {
      const v = sp(r);
      return v === null ? "—" : <span className={v >= 0 ? "text-(--text-success)" : "text-(--text-critical)"}>{gbp(v)}</span>;
    },
  },
];

const SECTION_TONE: Record<Section, string> = {
  buying: "bg-(--bg-surface-info)",
  receiving: "bg-(--bg-surface-success)",
  value: "bg-(--bg-surface-warning)",
  sales: "bg-(--bg-surface-magic)",
};
const SECTION_LABEL: Record<Section, string> = { buying: "Buying", receiving: "Receiving", value: "Value addition", sales: "Sales data" };

function ComputedMark() {
  return <FunctionSquare aria-label="Calculated" className="inline size-3.5 text-(--icon-secondary)" />;
}

/** Section bands over the columns (Identity over the pinned ones). */
function SectionBands({ cols, pinned, letters = false }: { cols: Col[]; pinned: number; letters?: boolean }) {
  const bands: { section: Section; span: number }[] = [];
  for (const c of cols) {
    const last = bands[bands.length - 1];
    if (last && last.section === c.section) last.span++;
    else bands.push({ section: c.section, span: 1 });
  }
  return (
    <>
      {letters && (
        <tr>
          <th className="sticky left-0 z-3 bg-(--bg-surface-tertiary)" />
          <th className="bg-(--bg-surface-tertiary) text-center body-sm">A</th>
          <th className="bg-(--bg-surface-tertiary) text-center body-sm">B</th>
          {cols.map((c) => <th key={c.key} className="bg-(--bg-surface-tertiary) text-center body-sm">{c.letter}</th>)}
        </tr>
      )}
      <tr>
        <th colSpan={pinned} className="sticky left-0 z-3 bg-(--bg-surface-secondary) body-sm">Identity</th>
        {bands.map((b, i) => (
          <th key={i} colSpan={b.span} className={`${SECTION_TONE[b.section]} body-sm`}>{SECTION_LABEL[b.section]}</th>
        ))}
      </tr>
    </>
  );
}

/* ── A — Airtable-style grid (Airtable, Retool, AirOps) ────────────── */
function VariationA() {
  const Tool = ({ icon: Icon, children, active }: { icon: typeof Filter; children: React.ReactNode; active?: boolean }) => (
    <button type="button" className={`inline-flex h-7 items-center gap-1.5 rounded-(--radius-200) px-2 body-sm hover:bg-(--bg-surface-hover) ${active ? "bg-(--bg-surface-info) text-(--text-info)" : ""}`}>
      <Icon className="size-4" />{children}
    </button>
  );
  const totalBuy = ROWS.reduce((n, r) => n + r.buying, 0);
  const totalSp = ROWS.reduce((n, r) => n + (sp(r) ?? 0), 0);
  return (
    <Page title="Master sheet" subtitle="Every car, column for column with the Excel sheet." fullWidth secondaryActions={[{ content: "Export CSV" }]} className="w-full">
      <Card padding="0">
        <div className="flex flex-wrap items-center gap-1 border-b border-(--border-secondary) px-3 py-2">
          <button type="button" className="mr-2 inline-flex h-7 items-center gap-1 rounded-(--radius-200) bg-(--bg-surface-selected) px-2 body-md-semibold">All columns <ChevronDown className="size-4" /></button>
          <Tool icon={Columns3}>21 of 72 shown</Tool>
          <Tool icon={Filter} active>1 filter</Tool>
          <Tool icon={ArrowDownUp}>Sort</Tool>
          <Tool icon={Group}>Group</Tool>
          <Tool icon={Rows3}>Row height</Tool>
          <div className="ml-auto w-64"><TextField label="Search" labelHidden prefix="SearchMinor" placeholder="Search reg, stock, make" /></div>
        </div>
        <div className="overflow-x-auto">
          <table data-slot="table" className="whitespace-nowrap border-separate border-spacing-0">
            <thead>
              <SectionBands cols={COLS} pinned={3} />
              <tr>
                <th className="sticky left-0 z-3 w-12 bg-(--bg-surface-secondary)"><Checkbox label="Select all" labelHidden /></th>
                <th className="sticky left-12 z-3 w-24 bg-(--bg-surface-secondary)">Stock ID</th>
                <th className="sticky left-36 z-3 bg-(--bg-surface-secondary) shadow-[1px_0_0_var(--border)]">Reg</th>
                {COLS.map((c) => <th key={c.key} className={c.num ? "text-right" : ""}>{c.label} {c.computed && <ComputedMark />}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.stock}>
                  <td className="sticky left-0 z-1 w-12 bg-(--bg-surface)"><Checkbox label={`Select ${r.stock}`} labelHidden /></td>
                  <td className="sticky left-12 z-1 w-24 bg-(--bg-surface) body-md-numeric">{r.stock}</td>
                  <td className="sticky left-36 z-1 bg-(--bg-surface) shadow-[1px_0_0_var(--border)]"><div className="flex items-center gap-2"><Thumbnail source={r.photo} alt="" size="small" /><RegPlate registration={r.reg} size="sm" /></div></td>
                  {COLS.map((c) => (
                    <td key={c.key} className={`${c.num ? "text-right body-md-numeric" : ""} ${c.computed ? "bg-(--bg-surface-secondary)" : ""} ${i === 1 && c.key === "selling" ? "outline-2 -outline-offset-2 outline-(--border-focus)" : ""}`}>
                      {c.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="sticky left-0 z-1 bg-(--bg-surface-secondary) body-sm">40 cars · 1 filter</td>
                {COLS.map((c) => (
                  <td key={c.key} className="bg-(--bg-surface-secondary) text-right body-sm text-(--text-secondary)">
                    {c.key === "buying" ? `Sum ${gbp(totalBuy)}` : c.key === "sp" ? `Sum ${gbp(totalSp)}` : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </Page>
  );
}

/* ── B — Excel-true sheet (Rows, Canva Sheets, Google Sheets) ──────── */
function VariationB() {
  return (
    <Page title="Master sheet" fullWidth secondaryActions={[{ content: "Columns" }, { content: "Export CSV" }]} className="w-full">
      <Card padding="0">
        <div className="flex items-center gap-2 border-b border-(--border-secondary) px-3 py-2">
          <span className="rounded-(--radius-100) border border-(--border) px-2 py-0.5 body-sm">BM3</span>
          <span className="body-md-semibold text-(--text-secondary)">fx</span>
          <span className="flex-1 truncate body-md">11800</span>
          <Badge tone="info">Editable</Badge>
        </div>
        <div className="flex items-center gap-2 border-b border-(--border-secondary) bg-(--bg-surface-secondary) px-3 py-1.5">
          <span className="body-sm text-(--text-secondary)">AI3</span>
          <span className="body-md-semibold text-(--text-secondary)">fx</span>
          <span className="body-sm text-(--text-secondary)">=SUM(S3:AH3) · Total buying price is calculated</span>
        </div>
        <div className="overflow-x-auto">
          <table data-slot="table" className="whitespace-nowrap border-separate border-spacing-0">
            <thead>
              <SectionBands cols={COLS} pinned={3} letters />
              <tr>
                <th className="sticky left-0 z-3 w-10 bg-(--bg-surface-tertiary) text-center">1</th>
                <th className="sticky left-10 z-3 w-24 bg-(--bg-surface-secondary)">STOCK ID</th>
                <th className="sticky left-34 z-3 bg-(--bg-surface-secondary) shadow-[1px_0_0_var(--border)]">REG. NUMBER</th>
                {COLS.map((c) => <th key={c.key}>{c.label.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.stock}>
                  <td className="sticky left-0 z-1 w-10 bg-(--bg-surface-tertiary) text-center body-sm text-(--text-secondary)">{i + 2}</td>
                  <td className="sticky left-10 z-1 w-24 bg-(--bg-surface) body-md-numeric">{r.stock}</td>
                  <td className="sticky left-34 z-1 bg-(--bg-surface) shadow-[1px_0_0_var(--border)]"><RegPlate registration={r.reg} size="sm" /></td>
                  {COLS.map((c) => (
                    <td key={c.key} className={`${c.num ? "text-right body-md-numeric" : ""} ${c.computed ? "italic text-(--text-secondary)" : ""} ${i === 1 && c.key === "selling" ? "outline-2 -outline-offset-2 outline-(--border-focus)" : ""} ${i >= 1 && i <= 3 && c.key === "sp" ? "bg-(--bg-surface-selected)" : ""}`}>
                      {c.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-(--border-secondary) px-2 py-1.5">
          {SECTIONS.map((s, i) => (
            <button key={s.id} type="button" className={`rounded-(--radius-200) px-3 py-1 body-sm ${i === 0 ? "bg-(--bg-surface) shadow-(--shadow-100) body-md-semibold" : "text-(--text-secondary) hover:bg-(--bg-surface-hover)"}`}>{s.label}</button>
          ))}
          <span className="ml-auto body-sm text-(--text-secondary)">Selection · Sum £6,993 · Avg £2,331 · Count 3</span>
        </div>
      </Card>
    </Page>
  );
}

/* ── C — Key columns + record panel (Braintrust, Shopify bulk editor) ─ */
function VariationC() {
  const r = ROWS[1];
  return (
    <Page title="Master sheet" fullWidth secondaryActions={[{ content: "Export CSV" }]} className="w-full">
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Card padding="0">
          <div className="flex items-center gap-2 border-b border-(--border-secondary) p-3">
            <div className="flex-1"><TextField label="Search" labelHidden prefix="SearchMinor" placeholder="Search reg, stock, make" /></div>
            <Button icon={<Filter className="size-4" />}>Filter</Button>
          </div>
          <table data-slot="table" className="whitespace-nowrap w-full">
            <thead><tr><th>Car</th><th>Bought</th><th className="text-right">Total buying</th><th>Status</th><th className="text-right">S - P</th></tr></thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.stock} aria-selected={row.stock === r.stock}>
                  <td><div className="flex items-center gap-2"><Thumbnail source={row.photo} alt="" size="small" /><div><div className="flex items-center gap-2"><RegPlate registration={row.reg} size="sm" /><span className="body-sm text-(--text-secondary)">{row.stock}</span></div><span className="body-md">{`${row.make} ${row.model}`}</span></div></div></td>
                  <td className="body-sm">{row.purchase}</td>
                  <td className="text-right body-md-numeric">{gbp(row.buying)}</td>
                  <td>{COLS.find((c) => c.key === "status")!.get(row)}</td>
                  <td className="text-right">{COLS.find((c) => c.key === "sp")!.get(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card padding="0">
          <div className="flex items-center gap-2 border-b border-(--border-secondary) px-4 py-3">
            <RegPlate registration={r.reg} size="sm" />
            <span className="flex-1 body-md-semibold">{`${r.make} ${r.model} · ${r.stock}`}</span>
            <Button variant="tertiary" icon={<ChevronLeft className="size-4" />} accessibilityLabel="Previous car" />
            <Button variant="tertiary" icon={<ChevronRight className="size-4" />} accessibilityLabel="Next car" />
            <Button variant="tertiary" icon={<X className="size-4" />} accessibilityLabel="Close" />
          </div>
          {(["buying", "receiving", "value", "sales"] as const).map((s, i) => (
            <details key={s} open={i !== 2} className="border-b border-(--border-secondary)">
              <summary className={`flex cursor-pointer items-center gap-2 px-4 py-2 body-md-semibold ${SECTION_TONE[s]}`}>
                {SECTION_LABEL[s]}
                <span className="body-sm text-(--text-secondary)">{`${SECTIONS.find((x) => x.id === s)?.count} fields`}</span>
              </summary>
              {COLS.filter((c) => c.section === s).map((c) => {
                const v = c.get(r);
                const editable = !c.computed && (typeof v === "string" || typeof v === "number");
                return (
                  <div key={c.key} className="grid grid-cols-[1fr_1.2fr] items-center gap-3 border-t border-(--border-secondary) px-4 py-2 first:border-t-0">
                    <span className="body-sm text-(--text-secondary)">{c.label} {c.computed && <ComputedMark />}</span>
                    {editable ? <TextField label={c.label} labelHidden defaultValue={String(v)} /> : <span className="body-md">{v}</span>}
                  </div>
                );
              })}
              {s === "value" && <p className="px-4 py-3 body-sm text-(--text-secondary)">Service, MOT, bodywork and the rest roll up from Things to do.</p>}
            </details>
          ))}
        </Card>
      </div>
    </Page>
  );
}

/* ── D — Section views with a per-section summary (Shopify, Vanta) ─── */
function VariationD() {
  const [tab, setTab] = React.useState(1);
  const section = (["all", "buying", "receiving", "value", "sales"] as const)[tab];
  const cols = section === "all" ? COLS : COLS.filter((c) => c.section === section);
  const kpis: Record<string, [string, string][]> = {
    all: [["Cars", "40"], ["Available", "33"], ["Sold this month", "4"], ["Total S - P", "£9,344"]],
    buying: [["Bought this month", "6"], ["Total spend", "£47,306"], ["Avg buying price", "£7,884"], ["Most used auction", "BCA Blackbushe"]],
    receiving: [["Received this month", "5"], ["Log books missing", "3"], ["Single key", "2"], ["Full service history", "58%"]],
    value: [["Value added", "£6,410"], ["Avg per car", "£160"], ["Most common", "Valet"], ["Cars with work", "28"]],
    sales: [["Sold this month", "4"], ["Revenue", "£42,600"], ["Total S - P", "£9,344"], ["Top lead source", "AutoTrader"]],
  };
  return (
    <Page title="Master sheet" fullWidth primaryAction={{ content: "Export CSV" }} secondaryActions={[{ content: "Columns" }]} className="w-full">
      <Tabs tabs={SECTIONS.map((s) => ({ id: s.id, content: s.label, badge: String(s.count) }))} selected={tab} onSelect={setTab} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis[section].map(([k, v]) => (
          <Card key={k}><p className="body-sm text-(--text-secondary)">{k}</p><p className="heading-lg">{v}</p></Card>
        ))}
      </div>
      <Card padding="0">
        <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) p-3">
          <div className="w-72"><TextField label="Search" labelHidden prefix="SearchMinor" placeholder="Search reg, stock, make" /></div>
          <Badge>Purchase month: Aug 2026</Badge>
          <Button variant="plain">Add filter</Button>
          <span className="ml-auto body-sm text-(--text-secondary)">{`${cols.length + 3} of 72 columns · Identity pinned`}</span>
        </div>
        <div className="overflow-x-auto">
          <table data-slot="table" className="whitespace-nowrap border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-3 bg-(--bg-surface-secondary)">Car</th>
                {cols.map((c) => <th key={c.key} className={c.num ? "text-right" : ""}>{c.label} {c.computed && <ComputedMark />}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.stock}>
                  <td className="sticky left-0 z-1 bg-(--bg-surface) shadow-[1px_0_0_var(--border)]"><div className="flex items-center gap-2"><Thumbnail source={r.photo} alt="" size="small" /><div><RegPlate registration={r.reg} size="sm" /><p className="body-sm text-(--text-secondary)">{`${r.stock} · ${r.make} ${r.model}`}</p></div></div></td>
                  {cols.map((c) => <td key={c.key} className={c.num ? "text-right body-md-numeric" : ""}>{c.get(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-(--border-secondary) px-3 py-2">
          <span className="body-sm text-(--text-secondary)">Showing 1–25 of 1,862</span>
          <Pagination hasNext label="Page 1 of 75" />
        </div>
      </Card>
    </Page>
  );
}

/* ── E — Grouped by month with subtotals (Causal, Airtable group) ──── */
function VariationE() {
  const groups = ["Sep 2026", "Aug 2026", "Jul 2026", "Jun 2026"].map((m) => ({ month: m, rows: ROWS.filter((r) => r.purchase === m) }));
  const cols = COLS.filter((c) => ["make", "model", "auction", "buying", "logbook", "status", "selling", "sp"].includes(c.key));
  return (
    <Page title="Master sheet" fullWidth secondaryActions={[{ content: "Columns" }, { content: "Export CSV" }]} className="w-full">
      <Card padding="0">
        <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) p-3">
          <Button icon={<Group className="size-4" />} disclosure>Group: Purchase month</Button>
          <Button icon={<Filter className="size-4" />}>Filter</Button>
          <div className="ml-auto w-64"><TextField label="Search" labelHidden prefix="SearchMinor" placeholder="Search reg, stock, make" /></div>
        </div>
        <div className="overflow-x-auto">
          <table data-slot="table" className="whitespace-nowrap w-full border-separate border-spacing-0">
            <thead><tr><th>Car</th>{cols.map((c) => <th key={c.key} className={c.num ? "text-right" : ""}>{c.label} {c.computed && <ComputedMark />}</th>)}</tr></thead>
            {groups.map((g, gi) => {
              const buy = g.rows.reduce((n, r) => n + r.buying, 0);
              const profit = g.rows.reduce((n, r) => n + (sp(r) ?? 0), 0);
              return (
                <tbody key={g.month}>
                  <tr>
                    <td colSpan={cols.length + 1} className="bg-(--bg-surface-secondary)">
                      <div className="flex items-center gap-2">
                        {gi === 3 ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                        <span className="body-md-semibold">{g.month}</span>
                        <Badge>{`${g.rows.length} ${g.rows.length === 1 ? "car" : "cars"}`}</Badge>
                        <span className="ml-auto body-sm text-(--text-secondary)">{`Bought ${gbp(buy)} · S - P ${gbp(profit)}`}</span>
                      </div>
                    </td>
                  </tr>
                  {gi !== 3 && g.rows.map((r) => (
                    <tr key={r.stock}>
                      <td><div className="flex items-center gap-2"><RegPlate registration={r.reg} size="sm" /><span className="body-sm text-(--text-secondary)">{r.stock}</span></div></td>
                      {cols.map((c) => <td key={c.key} className={c.num ? "text-right body-md-numeric" : ""}>{c.get(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              );
            })}
            <tfoot>
              <tr>
                <td className="body-md-semibold">All months · 40 cars</td>
                {cols.map((c) => <td key={c.key} className="text-right body-md-semibold">{c.key === "buying" ? gbp(ROWS.reduce((n, r) => n + r.buying, 0)) : c.key === "sp" ? gbp(ROWS.reduce((n, r) => n + (sp(r) ?? 0), 0)) : ""}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </Page>
  );
}

/* ── States every variation needs ──────────────────────────────────── */
function States() {
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-3">
      <Card title="Loading 1,862 cars"><SkeletonBodyText lines={6} /></Card>
      <Card padding="0">
        <EmptyState icon={<Search className="fill-none" />} heading="No cars match" action={{ content: "Clear filters" }}>
          Try a different search, or remove a filter.
        </EmptyState>
      </Card>
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex items-center justify-between gap-2"><span className="body-sm text-(--text-secondary)">Selling price, PK68 DPL</span><Badge tone="info">Saving…</Badge></div>
          <TextField label="Selling price" labelHidden prefix="£" defaultValue="11,800" />
        </Card>
        <Banner tone="critical" title="Couldn't save Mileage for WF69 TYU">Enter a whole number. The old value is back in the cell.</Banner>
        <Banner tone="info" title="S - P is calculated">Selling price minus total buying price. Edit those to change it.</Banner>
      </div>
    </div>
  );
}

const VARIATIONS = [
  { key: "A", name: "Airtable-style grid", refs: "Airtable, Retool, AirOps", C: VariationA },
  { key: "B", name: "Excel-true sheet", refs: "Rows, Canva Sheets, Google Sheets", C: VariationB },
  { key: "C", name: "Key columns + record panel", refs: "Braintrust, Shopify bulk editor", C: VariationC },
  { key: "D", name: "Section views with a summary", refs: "Shopify index, Vanta", C: VariationD },
  { key: "E", name: "Grouped by month with subtotals", refs: "Causal, Airtable group", C: VariationE },
];

export default function PrototypePage() {
  return (
    <main className="flex flex-col gap-10 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="heading-lg">Prototype — Master sheet</h1>
        <p className="body-md text-(--text-secondary)">
          Five directions for the 72-column sheet: pinned identity columns, the Buying / Receiving / Value addition /
          Sales data sections, calculated columns (ƒ), inline editing, filters, search, column picking, export and
          1,862 legacy rows. Loading, empty, saving and error states are at the foot. Pick one (A–E).
        </p>
      </header>
      {VARIATIONS.map(({ key, name, refs, C }) => (
        <section key={key} id={`variation-${key}`} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="heading-md">{`Variation ${key} — ${name}`}</h2>
            <span className="body-sm text-(--text-secondary)">{`Reference: ${refs}`}</span>
          </div>
          <div className="relative overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)">
            <C />
          </div>
        </section>
      ))}
      <section id="states" className="flex flex-col gap-2">
        <h2 className="heading-md">States (all variations)</h2>
        <div className="overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)"><States /></div>
      </section>
    </main>
  );
}
