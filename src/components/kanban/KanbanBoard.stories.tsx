import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  Ellipsis,
  Phone,
  TriangleAlert,
} from "lucide-react";
import { Link } from "@/components/genaro";
import { RowActionButton } from "@/components/ui/resource-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanBoard, KanbanSkeleton } from "./kanban-board";
import { KanbanCard, KanbanPlate, type KanbanFact } from "./kanban-card";
import type { KanbanColumn } from "./stage-icon";
import guidelines from "./README.md?raw";

/** A sales deal, as the pipeline page shapes it for a card. Dates are fixed words: the story is static. */
interface Deal {
  id: string;
  stage: string;
  customer: string;
  phone?: string;
  vehicle: string;
  registration: string;
  stockId: string;
  agent?: string;
  price?: { amount: number; kind: "offer" | "agreed" };
  /** The deal's date line: collection, completion or loss. */
  when?: { state: "upcoming" | "today" | "overdue" | "completed" | "lost"; text: string; detail?: string };
  appointment?: { text: string; today?: boolean };
  deposit?: { amount: number; paid: string };
  daysInStage: number;
  lostReason?: string;
}

const pipeline: KanbanColumn[] = [
  { id: "new_lead", label: "New lead", tone: "neutral", kind: "open" },
  { id: "contacted", label: "Contacted", tone: "info", kind: "open" },
  { id: "test_drive", label: "Test drive", tone: "magic", kind: "open" },
  { id: "collection", label: "Collection", tone: "emphasis", kind: "open" },
  { id: "completed_sale", label: "Completed sale", tone: "success", kind: "done" },
];

const lost: KanbanColumn = { id: "lost", label: "Lost", tone: "critical", kind: "exception", glyph: "cross" };

const deals: Deal[] = [
  {
    id: "deal-1",
    stage: "new_lead",
    customer: "Priya Shah",
    phone: "07700 900123",
    vehicle: "Ford Fiesta ST-Line",
    registration: "OY70 TZG",
    stockId: "L-927",
    daysInStage: 1,
  },
  {
    id: "deal-2",
    stage: "new_lead",
    customer: "Daniel Okafor",
    vehicle: "Volkswagen Golf Match",
    registration: "KM19 XRT",
    stockId: "L-905",
    agent: "Tom Bradley",
    appointment: { text: "Appointment Tue 27 Oct, 10:30" },
    daysInStage: 3,
  },
  {
    id: "deal-3",
    stage: "contacted",
    customer: "Hannah Morris",
    phone: "07700 900456",
    vehicle: "Toyota Yaris Hybrid",
    registration: "YA21 KPC",
    stockId: "L-944",
    agent: "Amira Hussain",
    price: { amount: 15200, kind: "offer" },
    daysInStage: 5,
  },
  {
    id: "deal-4",
    stage: "contacted",
    customer: "Callum Reid",
    vehicle: "BMW 320d M Sport",
    registration: "BD18 HVN",
    stockId: "L-871",
    agent: "Chloe Evans",
    price: { amount: 17950, kind: "offer" },
    daysInStage: 18,
  },
  {
    id: "deal-5",
    stage: "test_drive",
    customer: "Sofia Bianchi",
    vehicle: "Kia Sportage GT-Line",
    registration: "WR22 FNM",
    stockId: "L-958",
    agent: "Amira Hussain",
    appointment: { text: "Appointment today, 14:00", today: true },
    price: { amount: 24500, kind: "offer" },
    daysInStage: 2,
  },
  {
    id: "deal-6",
    stage: "test_drive",
    customer: "George Patel",
    vehicle: "Audi A3 Sportback",
    registration: "LN20 UJE",
    stockId: "L-919",
    agent: "Tom Bradley",
    price: { amount: 18750, kind: "offer" },
    daysInStage: 9,
  },
  {
    id: "deal-7",
    stage: "collection",
    customer: "Emma Clarke",
    vehicle: "Nissan Qashqai N-Connecta",
    registration: "SF19 OPA",
    stockId: "L-886",
    agent: "Chloe Evans",
    when: { state: "overdue", text: "Collection overdue", detail: "Wed 21 Oct" },
    deposit: { amount: 500, paid: "14 Oct" },
    price: { amount: 14995, kind: "agreed" },
    daysInStage: 11,
  },
  {
    id: "deal-8",
    stage: "collection",
    customer: "Ryan Hughes",
    vehicle: "Mazda MX-5 Sport",
    registration: "MX21 ROD",
    stockId: "L-932",
    agent: "Amira Hussain",
    when: { state: "upcoming", text: "Collection Thu 29 Oct" },
    deposit: { amount: 1000, paid: "22 Oct" },
    price: { amount: 19250, kind: "agreed" },
    daysInStage: 4,
  },
  {
    id: "deal-9",
    stage: "completed_sale",
    customer: "Olivia Grant",
    vehicle: "Honda Jazz EX",
    registration: "HJ17 WEB",
    stockId: "L-842",
    agent: "Tom Bradley",
    when: { state: "completed", text: "Completed 20 Oct" },
    price: { amount: 9495, kind: "agreed" },
    daysInStage: 5,
  },
];

const lostDeal: Deal = {
  id: "deal-10",
  stage: "lost",
  customer: "Liam Foster",
  vehicle: "Ford Focus Titanium",
  registration: "FT16 KLE",
  stockId: "L-801",
  agent: "Chloe Evans",
  when: { state: "lost", text: "Lost 16 Oct" },
  daysInStage: 9,
  lostReason: "Bought elsewhere on cheaper finance",
};

const pounds = (amount: number) => `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

/** The pipeline's columns with each one's total value under its name, as the page shows them. */
const withTotals: KanbanColumn[] = pipeline.map((column) => {
  const total = deals
    .filter((d) => d.stage === column.id)
    .reduce((sum, d) => sum + (d.price?.amount ?? 0), 0);
  return total ? { ...column, summary: `£${total.toLocaleString("en-GB")}` } : column;
});

const WHEN: Record<NonNullable<Deal["when"]>["state"], Pick<KanbanFact, "icon" | "tone">> = {
  upcoming: { icon: CalendarDays },
  today: { icon: Clock, tone: "caution" },
  overdue: { icon: TriangleAlert, tone: "critical" },
  completed: { icon: CircleCheck, tone: "success" },
  lost: { icon: CircleX, tone: "muted" },
};

/** Fine for a fortnight, then caution, then critical past a month. */
const ageTone = (days: number) => (days <= 14 ? "muted" : days <= 30 ? "caution" : "critical");

const openDeal = fn().mockName("openDeal");

function renderDeal(d: Deal): React.ReactNode {
  const facts: KanbanFact[] = [];
  if (d.when) facts.push({ ...WHEN[d.when.state], text: d.when.text, detail: d.when.detail });
  if (d.appointment) {
    facts.push({ icon: CalendarClock, tone: d.appointment.today ? "caution" : undefined, text: d.appointment.text });
  }
  if (d.phone) {
    facts.push({
      icon: Phone,
      text: (
        <a href={`tel:${d.phone.replace(/\s+/g, "")}`} draggable={false} className="hover:underline">
          {d.phone}
        </a>
      ),
    });
  }
  if (d.deposit) {
    facts.push({ icon: Banknote, text: `${pounds(d.deposit.amount)} deposit`, detail: `paid ${d.deposit.paid}` });
  }
  facts.push({ icon: Clock, tone: ageTone(d.daysInStage), text: `${d.daysInStage}d in stage` });

  return (
    <KanbanCard
      onOpen={() => openDeal(d.id)}
      identity={<KanbanPlate registration={d.registration} href={`/vehicles/${d.stockId}`} title="Open vehicle" />}
      reference={d.stockId}
      vehicle={d.vehicle}
      title={
        <Link monochrome removeUnderline className="text-left hover:underline" onClick={() => openDeal(d.id)}>
          {d.customer}
        </Link>
      }
      titleText={d.customer}
      facts={facts}
      note={d.lostReason ? { icon: CircleX, tone: "critical", text: `Lost: ${d.lostReason}` } : undefined}
      person={{ name: d.agent, empty: "No agent" }}
      money={d.price ? { value: pounds(d.price.amount), kind: d.price.kind } : undefined}
      menu={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <RowActionButton aria-label="Deal actions" className="size-6">
              <Ellipsis />
            </RowActionButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDeal(d.id)}>View deal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDeal(d.id)}>Book appointment</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

type BoardArgs = React.ComponentProps<typeof KanbanBoard<Deal>>;

/**
 * The app's Kanban board, used for the sales pipeline, maintenance jobs and
 * prep: lanes side by side, cards dragged between them. Pages own the data
 * and the saving; the board owns layout, drag and motion. For a list people
 * scan or sort rather than move through stages, use an `IndexTable`.
 */
const meta = {
  title: "Patterns/Kanban board",
  component: KanbanBoard,
  subcomponents: { KanbanCard, KanbanPlate, KanbanSkeleton },
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    id: "story-sales-pipeline",
    columns: pipeline,
    items: deals,
    getId: (d) => d.id,
    getColumnId: (d) => d.stage,
    // Freshest first; also places the drop slot where the card will land.
    compare: (a, b) => a.daysInStage - b.daysInStage,
    moved: (d, stage) => ({ ...d, stage, daysInStage: 0 }),
    onMove: fn(),
    renderCard: renderDeal,
    noun: { one: "deal", many: "deals" },
  },
  argTypes: {
    renderCard: { control: false },
    getId: { control: false },
    getColumnId: { control: false },
    compare: { control: false },
    moved: { control: false },
  },
  // The page moves the card optimistically in `onMove`; here the items live in the args.
  render: function KanbanBoardStory(args) {
    const [, updateArgs] = useArgs<BoardArgs>();
    return (
      <KanbanBoard
        {...args}
        onMove={(id, stage) => {
          args.onMove(id, stage);
          updateArgs({ items: args.items.map((d) => (d.id === id ? { ...d, stage, daysInStage: 0 } : d)) });
        }}
      />
    );
  },
} satisfies Meta<typeof KanbanBoard<Deal>>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The sales pipeline, from new lead to completed sale. Drag a card to another
 * column to move the deal; urgency shows in a line's tone, never a red card.
 * @summary the sales pipeline; drag deals between stages
 */
export const SalesPipeline: Story = {};

/**
 * A line under each column's name, such as the value of the deals in it. Every
 * lane keeps the line's space, so card tops stay level.
 * @summary each column's total under its name
 */
export const ColumnTotals: Story = {
  args: { id: "story-column-totals", columns: withTotals },
};

/**
 * Boards that create cards get a "+" in each column header, and in empty
 * columns. Label it with a verb and a noun ("Add deal").
 * @summary a "+" per column for boards that create cards
 */
export const AddButtons: Story = {
  args: { id: "story-add-buttons", onAdd: fn(), addLabel: "Add deal" },
};

/**
 * Columns people rarely work in, such as Lost, start in a rail on the right.
 * Drop a card on a row to move it there; each viewer's choice is remembered.
 * @summary rarely used columns, folded into a rail
 */
export const HiddenColumns: Story = {
  args: {
    id: "story-hidden-columns",
    columns: [...pipeline, lost],
    items: [...deals, lostDeal],
    defaultHidden: ["lost"],
  },
};

/**
 * A column with nothing in it says so in a dashed box, and keeps its place so
 * cards can be dropped there.
 * @summary an empty column, still a drop target
 */
export const EmptyColumn: Story = {
  args: { id: "story-empty-column", items: deals.filter((d) => d.stage !== "completed_sale") },
};

/**
 * While the board's data loads, show `KanbanSkeleton` with the same number of
 * columns, rather than a card of skeleton text.
 * @summary the board while its data loads
 */
export const Loading: Story = {
  render: () => <KanbanSkeleton columns={5} />,
};
