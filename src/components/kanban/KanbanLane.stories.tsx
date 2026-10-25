import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CalendarClock, Clock, Ellipsis, EyeOff } from "lucide-react";
import { Button, Link } from "@/components/genaro";
import { RowActionButton } from "@/components/ui/resource-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanEmpty, KanbanFrame, KanbanLane } from "./kanban-board";
import { KanbanCard, KanbanCardContext, KanbanPlate } from "./kanban-card";
import type { KanbanColumn } from "./stage-icon";
import guidelines from "./README.md?raw";

const pipeline: KanbanColumn[] = [
  { id: "new_lead", label: "New lead", tone: "neutral", kind: "open" },
  { id: "contacted", label: "Contacted", tone: "info", kind: "open" },
  { id: "test_drive", label: "Test drive", tone: "magic", kind: "open" },
  { id: "collection", label: "Collection", tone: "emphasis", kind: "open" },
  { id: "completed_sale", label: "Completed sale", tone: "success", kind: "done" },
];
const testDrive = pipeline[2];

const openDeal = fn().mockName("openDeal");

/** Two deals in the Test drive column, as `KanbanBoard` would render them. */
const cards = [
  { customer: "Sofia Bianchi", reg: "WR22 FNM", stockId: "L-958", vehicle: "Kia Sportage GT-Line", when: "Appointment today, 14:00", today: true, days: 2, agent: "Amira Hussain", offer: "£24,500.00" },
  { customer: "George Patel", reg: "LN20 UJE", stockId: "L-919", vehicle: "Audi A3 Sportback", when: "Appointment Thu 29 Oct, 11:00", today: false, days: 9, agent: "Tom Bradley", offer: "£18,750.00" },
].map((d) => (
  <KanbanCardContext.Provider key={d.stockId} value={{ column: testDrive, columns: pipeline }}>
    <KanbanCard
      onOpen={() => openDeal(d.customer)}
      identity={<KanbanPlate registration={d.reg} href={`/vehicles/${d.stockId}`} title="Open vehicle" />}
      reference={d.stockId}
      vehicle={d.vehicle}
      title={
        <Link monochrome removeUnderline className="text-left hover:underline" onClick={() => openDeal(d.customer)}>
          {d.customer}
        </Link>
      }
      titleText={d.customer}
      facts={[
        { icon: CalendarClock, tone: d.today ? "caution" : undefined, text: d.when },
        { icon: Clock, tone: "muted", text: `${d.days}d in stage` },
      ]}
      person={{ name: d.agent, empty: "No agent" }}
      money={{ value: d.offer, kind: "offer" }}
    />
  </KanbanCardContext.Provider>
));

/**
 * One column of a Kanban board: its status badge, name and count in a header
 * that stays put while the cards scroll beneath it. `KanbanBoard` builds its
 * lanes itself; use `KanbanLane` directly, inside a `KanbanFrame`, only for a
 * board that doesn't drag, such as prep, so every board shares the anatomy.
 */
const meta = {
  title: "App components/Kanban/KanbanLane",
  component: KanbanLane,
  tags: ["autodocs"],
  parameters: { guidelines },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "20rem" }}>
        <KanbanFrame>
          <Story />
        </KanbanFrame>
      </div>
    ),
  ],
  args: {
    column: testDrive,
    columns: pipeline,
    count: cards.length,
    children: cards,
  },
  argTypes: {
    column: { control: false },
    columns: { control: false },
    children: { control: false },
    actions: { control: false },
  },
} satisfies Meta<typeof KanbanLane>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A column of deals: the stage's badge, its name and how many cards it holds,
 * then the cards.
 * @summary a column of cards under its name and count
 */
export const Default: Story = {};

/**
 * A second line under the name, such as the column's total value. When any
 * column has one, pass `reserveSummary` to the rest so card tops line up.
 * @summary the column's total under its name
 */
export const WithSummary: Story = {
  args: { summary: "£43,250" },
};

/**
 * Header buttons on the right: a "+" to add a card to this column, and a "…"
 * menu with the column's own actions, such as hiding it.
 * @summary add and column-menu buttons in the header
 */
export const WithActions: Story = {
  args: {
    actions: (
      <>
        <Button variant="tertiary" size="micro" icon="PlusMinor" accessibilityLabel="Add deal to Test drive" onClick={fn().mockName("addDeal")} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <RowActionButton aria-label="Test drive column actions" className="size-6">
              <Ellipsis />
            </RowActionButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Add deal</DropdownMenuItem>
            <DropdownMenuItem>
              <EyeOff className="mr-2 size-3.5" />
              Hide column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    ),
  },
};

/**
 * While a card is dragged over it, the column takes a tint, header and all,
 * so it's clear where the card will land.
 * @summary tinted while a card is dragged over it
 */
export const DropTarget: Story = {
  args: { target: true },
};

/**
 * A column with no cards keeps its place and shows a dashed `KanbanEmpty`
 * box, with an add button when the board creates cards.
 * @summary an empty column, still a drop target
 */
export const Empty: Story = {
  args: {
    count: 0,
    children: (
      <KanbanEmpty
        action={
          <Button variant="tertiary" icon="PlusMinor" onClick={fn().mockName("addDeal")}>
            Add deal
          </Button>
        }
      >
        No deals here yet
      </KanbanEmpty>
    ),
  },
};
