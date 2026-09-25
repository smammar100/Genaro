"use client";

/**
 * Prototype page (see .claude/skills/prototype). Current feature: Prep &
 * repair — five variations grounded in Mobbin references, built with the
 * Polaris kit. Presentational only; every case the real page handles is
 * represented in the sample data or the states strip at the foot.
 */
import * as React from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, FileDown, Timer, Wrench } from "lucide-react";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  IndexTable,
  Page,
  ProgressBar,
  Select,
  SkeletonBodyText,
  Tabs,
  Thumbnail,
  type BadgeTone,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=320&h=240&q=70`;

type Stage = "unassigned" | "in_progress" | "ready";
type Todo = { title: string; status: "pending" | "in_progress" | "done" | "cancelled"; cost: number; vendor?: string };
type Car = {
  id: string;
  reg: string;
  stock: string;
  name: string;
  days: number;
  stage: Stage;
  assignee: string | null;
  photo: string;
  todos: Todo[];
  exporting?: boolean;
};

const PEOPLE = ["Raza Jaffery", "Sam Ammar", "Tom Hughes"];

const CARS: Car[] = [
  { id: "1", reg: "LT67 VJD", stock: "D-0033", name: "Ford Fiesta", days: 107, stage: "unassigned", assignee: null, photo: img("photo-1551206820-1a2050e76dd7"),
    todos: [{ title: "Full service", status: "pending", cost: 180, vendor: "Southall Motors" }, { title: "MOT", status: "pending", cost: 55 }, { title: "Replace front tyres", status: "pending", cost: 115 }] },
  { id: "2", reg: "RK70 FJD", stock: "D-0031", name: "Mercedes-Benz C Class", days: 12, stage: "unassigned", assignee: null, photo: img("photo-1591230740238-e9a71182b67c"),
    todos: [{ title: "Valet", status: "pending", cost: 40 }] },
  { id: "3", reg: "PK70 RPL", stock: "D-0017", name: "Nissan Serena", days: 110, stage: "in_progress", assignee: "Raza Jaffery", photo: img("photo-1558101847-e017d5e414a4"), exporting: true,
    todos: [{ title: "Bodywork: rear bumper", status: "in_progress", cost: 220, vendor: "Ace Bodyshop" }, { title: "Fuel", status: "done", cost: 30 }, { title: "Diagnostic check", status: "cancelled", cost: 0 }] },
  { id: "4", reg: "WF66 NYU", stock: "D-0013", name: "Audi A3", days: 50, stage: "in_progress", assignee: "Sam Ammar", photo: img("photo-1717711081688-985a7a3e6a9f"),
    todos: [{ title: "Valet", status: "pending", cost: 55 }, { title: "Alloy refurb", status: "in_progress", cost: 160 }] },
  { id: "5", reg: "GK66 ERT", stock: "D-0004", name: "BMW X1", days: 111, stage: "ready", assignee: null, photo: img("photo-1677517859847-0e750bfd13a9"),
    todos: [{ title: "Full service", status: "done", cost: 180 }, { title: "MOT", status: "done", cost: 55 }, { title: "Valet", status: "done", cost: 55 }] },
  { id: "6", reg: "PK19 SYU", stock: "D-0018", name: "Nissan Leaf", days: 92, stage: "ready", assignee: "Tom Hughes", photo: img("photo-1557775209-f28ede453ae3"),
    todos: [{ title: "Battery health check", status: "done", cost: 220 }] },
];

const STAGES: { value: Stage; label: string; hint: string; Icon: typeof Clock }[] = [
  { value: "unassigned", label: "Unassigned", hint: "Waiting for someone to pick it up", Icon: CircleDashed },
  { value: "in_progress", label: "In progress", hint: "Prep work under way", Icon: Timer },
  { value: "ready", label: "Ready for sales", hint: "All items done", Icon: CheckCircle2 },
];

const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
const stats = (c: Car) => {
  const count = (s: Todo["status"]) => c.todos.filter((t) => t.status === s).length;
  const active = c.todos.filter((t) => t.status !== "cancelled");
  const done = count("done");
  return {
    pending: count("pending"),
    inProgress: count("in_progress"),
    done,
    cancelled: count("cancelled"),
    total: active.length,
    cost: c.todos.reduce((s, t) => s + t.cost, 0),
    pct: active.length ? Math.round((done / active.length) * 100) : 100,
  };
};
const ageTone = (d: number): BadgeTone => (d > 90 ? "critical" : d > 45 ? "warning" : "neutral");
const stageTone: Record<Stage, BadgeTone> = { unassigned: "attention", in_progress: "info", ready: "success" };
const stageLabel = (s: Stage) => STAGES.find((x) => x.value === s)!.label;

function AgeBadge({ days }: { days: number }) {
  return <Badge tone={ageTone(days)} icon={days > 90 ? <AlertTriangle className="size-3" /> : undefined}>{`${days}d in stock`}</Badge>;
}

/** Done / in progress / pending as one segmented bar (cancelled excluded). */
function SegmentBar({ car }: { car: Car }) {
  const s = stats(car);
  const seg = (n: number, cls: string) => (n > 0 ? <span className={cls} style={{ flexGrow: n }} /> : null);
  return (
    <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-(--bg-fill-tertiary)">
      {seg(s.done, "bg-(--bg-fill-success)")}
      {seg(s.inProgress, "bg-(--bg-fill-info)")}
      {seg(s.pending, "bg-(--bg-fill-tertiary)")}
    </div>
  );
}

function JobSummary({ car }: { car: Car }) {
  const s = stats(car);
  return (
    <span className="body-sm text-(--text-secondary)">
      {`${s.done} of ${s.total} done`}
      {s.inProgress ? ` · ${s.inProgress} in progress` : ""}
      {s.cancelled ? ` · ${s.cancelled} cancelled` : ""}
    </span>
  );
}

function AssigneePicker({ car }: { car: Car }) {
  return (
    <Select
      label={`Assignee for ${car.reg}`}
      labelHidden
      options={[{ label: "Unassigned", value: "" }, ...PEOPLE.map((p) => ({ label: p, value: p }))]}
      value={car.assignee ?? ""}
      onChange={() => {}}
    />
  );
}

function JobCardButton({ car }: { car: Car }) {
  return (
    <Button icon={<FileDown className="size-4" />} accessibilityLabel={`Download job card for ${car.reg}`} loading={car.exporting} />
  );
}

const PAGE = {
  title: "Prep & repair",
  subtitle: "Cars between inspection and sale. They arrive when an inspection finds work, and move to sales once every item is done.",
};

/* ── A — Refined board (Plane, Programa) ───────────────────────────── */
function VariationA() {
  return (
    <Page {...PAGE} fullWidth secondaryActions={[{ content: "Download all job cards" }]}>
      <div className="grid items-start gap-3 lg:grid-cols-3">
        {STAGES.map(({ value, label, hint, Icon }) => {
          const list = CARS.filter((c) => c.stage === value);
          return (
            <div key={value} className="flex flex-col gap-2 rounded-(--radius-300) bg-(--bg-surface-secondary) p-2">
              <div className="flex items-center gap-2 px-1.5 pt-1">
                <Icon className="size-4 text-(--icon-secondary)" />
                <h2 className="heading-sm">{label}</h2>
                <Badge>{String(list.length)}</Badge>
              </div>
              <p className="px-1.5 body-sm text-(--text-secondary)">{hint}</p>
              {list.map((c) => {
                const s = stats(c);
                return (
                  <Card key={c.id}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <RegPlate registration={c.reg} size="sm" />
                        <AgeBadge days={c.days} />
                      </div>
                      <div>
                        <p className="body-md-semibold">{c.name}</p>
                        <p className="body-sm text-(--text-secondary)">{c.stock}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <SegmentBar car={c} />
                        <div className="flex items-center justify-between">
                          <JobSummary car={c} />
                          <span className="body-md-numeric">{gbp(s.cost)}</span>
                        </div>
                      </div>
                      {value === "ready" && (
                        <Banner tone="success" title="Ready to move to sales" />
                      )}
                      <div className="flex items-center gap-2 border-t border-(--border-secondary) pt-3">
                        <div className="flex-1"><AssigneePicker car={c} /></div>
                        <JobCardButton car={c} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/* ── B — Grouped by person (Asana, Wrike) ──────────────────────────── */
function VariationB() {
  const groups = ["Unassigned", ...PEOPLE].map((p) => ({
    person: p,
    cars: CARS.filter((c) => (c.assignee ?? "Unassigned") === p && c.stage !== "ready"),
  }));
  const ready = CARS.filter((c) => c.stage === "ready");
  const Row = ({ c }: { c: Car }) => {
    const s = stats(c);
    return (
      <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-(--border-secondary) px-4 py-3 first:border-t-0 md:grid-cols-[auto_1.4fr_1fr_auto_auto_auto]">
        <RegPlate registration={c.reg} size="sm" />
        <div className="min-w-0">
          <p className="truncate body-md-semibold">{c.name}</p>
          <JobSummary car={c} />
        </div>
        <div className="hidden md:block"><ProgressBar progress={s.pct} size="small" tone={s.pct === 100 ? "success" : "highlight"} /></div>
        <span className="hidden body-md-numeric md:block">{gbp(s.cost)}</span>
        <span className="hidden md:block"><AgeBadge days={c.days} /></span>
        <div className="flex items-center gap-2"><Button size="micro">Open list</Button><JobCardButton car={c} /></div>
      </li>
    );
  };
  return (
    <Page {...PAGE} fullWidth>
      <div className="flex flex-col gap-4">
        {groups.map(({ person, cars }) => (
          <Card key={person} padding="0">
            <div className="flex items-center gap-3 border-b border-(--border-secondary) px-4 py-3">
              {person === "Unassigned" ? <CircleDashed className="size-5 text-(--icon-secondary)" /> : <Avatar size="sm" name={person} />}
              <h2 className="heading-sm">{person}</h2>
              <Badge>{`${cars.length} ${cars.length === 1 ? "car" : "cars"}`}</Badge>
              {person !== "Unassigned" && <span className="ml-auto body-sm text-(--text-secondary)">{(() => { const n = cars.reduce((m, c) => m + stats(c).pending + stats(c).inProgress, 0); return `${n} open ${n === 1 ? "item" : "items"}`; })()}</span>}
            </div>
            {cars.length ? <ul>{cars.map((c) => <Row key={c.id} c={c} />)}</ul> : <p className="px-4 py-6 text-center body-sm text-(--text-secondary)">No cars assigned</p>}
          </Card>
        ))}
        <Card padding="0">
          <div className="flex items-center gap-3 border-b border-(--border-secondary) px-4 py-3">
            <CheckCircle2 className="size-5 text-(--icon-success)" />
            <h2 className="heading-sm">Ready for sales</h2>
            <Badge tone="success">{String(ready.length)}</Badge>
          </div>
          <ul>{ready.map((c) => <Row key={c.id} c={c} />)}</ul>
        </Card>
      </div>
    </Page>
  );
}

/* ── C — Queue + checklist split view (Slack Lists, ClickUp, Plain) ── */
function VariationC() {
  const [sel, setSel] = React.useState("3");
  const car = CARS.find((c) => c.id === sel)!;
  const s = stats(car);
  const statusBadge: Record<Todo["status"], React.ReactNode> = {
    pending: <Badge progress="incomplete">Pending</Badge>,
    in_progress: <Badge tone="info" progress="partiallyComplete">In progress</Badge>,
    done: <Badge tone="success" progress="complete">Done</Badge>,
    cancelled: <Badge>Cancelled</Badge>,
  };
  return (
    <Page {...PAGE} fullWidth>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card padding="0">
          {STAGES.map(({ value, label }) => {
            const list = CARS.filter((c) => c.stage === value);
            return (
              <div key={value}>
                <div className="flex items-center gap-2 bg-(--bg-surface-secondary) px-4 py-2 body-sm text-(--text-secondary)">
                  <span className="body-md-semibold text-(--text)">{label}</span>
                  <Badge>{String(list.length)}</Badge>
                </div>
                {list.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSel(c.id)}
                    aria-current={sel === c.id}
                    className={`flex w-full items-center gap-3 border-t border-(--border-secondary) px-4 py-3 text-left hover:bg-(--bg-surface-hover) ${sel === c.id ? "bg-(--bg-surface-selected)" : ""}`}
                  >
                    <Thumbnail source={c.photo} alt="" size="small" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><RegPlate registration={c.reg} size="sm" /><span className="truncate body-md-semibold">{c.name}</span></div>
                      <div className="mt-1.5"><SegmentBar car={c} /></div>
                    </div>
                    <span className="body-sm text-(--text-secondary)">{`${c.days}d`}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-start gap-4">
              <Thumbnail source={car.photo} alt="" size="large" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RegPlate registration={car.reg} size="sm" />
                  <Badge tone={stageTone[car.stage]}>{stageLabel(car.stage)}</Badge>
                  <AgeBadge days={car.days} />
                </div>
                <h2 className="heading-md mt-2">{car.name}</h2>
                <p className="body-sm text-(--text-secondary)">{`${car.stock} · ${gbp(s.cost)} prep cost · ${s.pct}% done`}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-44"><AssigneePicker car={car} /></div>
                <Button icon={<FileDown className="size-4" />} loading={car.exporting}>Job card</Button>
              </div>
            </div>
          </Card>
          <Card title="Things to do" actions={<Button variant="plain">Add item</Button>} padding="0">
            <ul>
              {car.todos.map((t) => (
                <li key={t.title} className="flex items-center gap-3 border-t border-(--border-secondary) px-4 py-3 first:border-t-0">
                  <span className={`flex-1 body-md ${t.status === "cancelled" ? "text-(--text-secondary) line-through" : ""}`}>{t.title}</span>
                  {t.vendor && <span className="body-sm text-(--text-secondary)">{t.vendor}</span>}
                  <span className="w-16 text-right body-md-numeric">{gbp(t.cost)}</span>
                  {statusBadge[t.status]}
                </li>
              ))}
            </ul>
          </Card>
          <Button url="#" variant="plain">Open the full vehicle record</Button>
        </div>
      </div>
    </Page>
  );
}

/* ── D — Index table with stage tabs (Airtable, Jira) ──────────────── */
function VariationD() {
  const [tab, setTab] = React.useState(0);
  const views: (Stage | null)[] = [null, "unassigned", "in_progress", "ready"];
  const rows = CARS.filter((c) => !views[tab] || c.stage === views[tab]);
  return (
    <Page {...PAGE} fullWidth>
      <Tabs
        tabs={[
          { id: "all", content: "All", badge: String(CARS.length) },
          ...STAGES.map((st) => ({ id: st.value, content: st.label, badge: String(CARS.filter((c) => c.stage === st.value).length) })),
        ]}
        selected={tab}
        onSelect={setTab}
      />
      <Card padding="0">
        <IndexTable
          promotedBulkActions={[{ content: "Assign to…" }, { content: "Download job cards" }]}
          headings={[
            { title: "Photo", media: true },
            { title: "Vehicle" },
            { title: "Stage" },
            { title: "Assignee" },
            { title: "Progress" },
            { title: "Prep cost", alignment: "end" },
            { title: "In stock", alignment: "end" },
            { title: "Job card", alignment: "end" },
          ]}
          rows={rows.map((c) => {
            const s = stats(c);
            return {
              id: c.id,
              cells: [
                <Thumbnail key="t" source={c.photo} alt="" size="small" />,
                <div key="v" className="flex flex-col gap-1"><span>{c.name}</span><span className="flex items-center gap-2 body-sm text-(--text-secondary)"><RegPlate registration={c.reg} size="sm" />{c.stock}</span></div>,
                <Badge key="s" tone={stageTone[c.stage]}>{stageLabel(c.stage)}</Badge>,
                <div key="a" className="w-40"><AssigneePicker car={c} /></div>,
                <div key="p" className="flex w-56 flex-col gap-1 whitespace-normal"><SegmentBar car={c} /><JobSummary car={c} /></div>,
                <span key="c" className="body-md-numeric">{gbp(s.cost)}</span>,
                <Badge key="d" tone={ageTone(c.days)}>{`${c.days}d`}</Badge>,
                <JobCardButton key="j" car={c} />,
              ],
            };
          })}
        />
      </Card>
    </Page>
  );
}

/* ── E — Workshop overview + lanes (Todoist Insights, Bonsai) ──────── */
function VariationE() {
  const open = CARS.filter((c) => c.stage !== "ready");
  const atRisk = CARS.filter((c) => c.days > 90 && c.stage !== "ready");
  const cost = CARS.reduce((n, c) => n + stats(c).cost, 0);
  return (
    <Page {...PAGE} fullWidth primaryAction={{ content: "Assign unassigned cars" }}>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["In prep", String(open.length)],
              ["Ready for sales", String(CARS.length - open.length)],
              ["Prep cost so far", gbp(cost)],
              ["Over 90 days", String(atRisk.length)],
            ].map(([k, v]) => (
              <Card key={k}><p className="body-sm text-(--text-secondary)">{k}</p><p className="heading-lg">{v}</p></Card>
            ))}
          </div>
          {atRisk.length > 0 && (
            <Banner tone="warning" title={`${atRisk.length} cars have been in stock over 90 days and are still in prep`}>
              {atRisk.map((c) => `${c.reg} ${c.name}`).join(", ")}
            </Banner>
          )}
          {STAGES.map(({ value, label, Icon }) => {
            const list = CARS.filter((c) => c.stage === value);
            return (
              <Card key={value} padding="0">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Icon className="size-4 text-(--icon-secondary)" />
                  <h2 className="heading-sm">{label}</h2>
                  <Badge>{String(list.length)}</Badge>
                </div>
                {list.length === 0 ? (
                  <p className="border-t border-(--border-secondary) px-4 py-6 text-center body-sm text-(--text-secondary)">Nothing here</p>
                ) : (
                  <div className="grid gap-3 border-t border-(--border-secondary) p-3 md:grid-cols-2">
                    {list.map((c) => (
                      <div key={c.id} className="flex gap-3 rounded-(--radius-200) border border-(--border-secondary) p-3">
                        <Thumbnail source={c.photo} alt="" size="medium" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2"><RegPlate registration={c.reg} size="sm" /><AgeBadge days={c.days} /></div>
                          <span className="truncate body-md-semibold">{c.name}</span>
                          <SegmentBar car={c} />
                          <div className="flex items-center justify-between gap-2"><JobSummary car={c} /><span className="body-md-numeric">{gbp(stats(c).cost)}</span></div>
                          <div className="flex items-center gap-2 pt-1"><div className="flex-1"><AssigneePicker car={c} /></div><JobCardButton car={c} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Workload">
            <ul className="flex flex-col gap-3">
              {PEOPLE.map((p) => {
                const cars = CARS.filter((c) => c.assignee === p && c.stage !== "ready");
                const items = cars.reduce((n, c) => n + stats(c).pending + stats(c).inProgress, 0);
                return (
                  <li key={p} className="flex items-center gap-3">
                    <Avatar size="sm" name={p} />
                    <div className="flex-1"><p className="body-md">{p}</p><ProgressBar progress={Math.min(100, items * 25)} size="small" /></div>
                    <span className="body-sm text-(--text-secondary)">{`${cars.length} cars · ${items} items`}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Oldest in prep">
            <ul className="flex flex-col gap-2">
              {[...open].sort((a, b) => b.days - a.days).slice(0, 3).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2"><RegPlate registration={c.reg} size="sm" /><span className="flex-1 truncate body-sm">{c.name}</span><Badge tone={ageTone(c.days)}>{`${c.days}d`}</Badge></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}

/* ── States every variation needs ──────────────────────────────────── */
function States() {
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-3">
      <Card title="Loading"><SkeletonBodyText lines={5} /></Card>
      <Card padding="0">
        <EmptyState icon={<Wrench className="fill-none" />} heading="Nothing in prep">
          Cars appear here the moment an inspection is completed with outstanding items.
        </EmptyState>
      </Card>
      <div className="flex flex-col gap-3">
        <Banner tone="critical" title="Couldn't assign this car">Check your connection and try again.</Banner>
        <Banner tone="success" title="Job card downloaded" />
        <Card><div className="flex items-center gap-2 body-sm text-(--text-secondary)"><Clock className="size-4" />Exporting a job card shows a spinner on its button</div></Card>
      </div>
    </div>
  );
}

const VARIATIONS = [
  { key: "A", name: "Refined board", refs: "Plane, Programa", C: VariationA },
  { key: "B", name: "Grouped by person", refs: "Asana, Wrike", C: VariationB },
  { key: "C", name: "Queue with checklist panel", refs: "Slack Lists, ClickUp, Plain", C: VariationC },
  { key: "D", name: "Index table with stage tabs", refs: "Airtable, Jira, Shopify", C: VariationD },
  { key: "E", name: "Workshop overview + lanes", refs: "Todoist Insights, Bonsai", C: VariationE },
];

export default function PrototypePage() {
  return (
    <main className="flex flex-col gap-10 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="heading-lg">Prototype — Prep & repair</h1>
        <p className="body-md text-(--text-secondary)">
          Five directions, same data. Each covers unassigned, in-progress and ready cars, an empty column, cancelled items, ageing,
          assignment, job-card export and the Things to do list. Loading, empty and error states are at the foot. Pick one (A–E).
        </p>
      </header>
      {VARIATIONS.map(({ key, name, refs, C }) => (
        <section key={key} id={`variation-${key}`} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="heading-md">{`Variation ${key} — ${name}`}</h2>
            <span className="body-sm text-(--text-secondary)">{`Reference: ${refs}`}</span>
          </div>
          <div className="overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)">
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
