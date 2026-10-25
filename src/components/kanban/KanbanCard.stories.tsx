import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import {
  Banknote,
  CalendarClock,
  CalendarPlus,
  CirclePause,
  CircleX,
  Clock,
  Ellipsis,
  Phone,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { Button, Link } from "@/components/genaro";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { RowActionButton } from "@/components/ui/resource-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const openRecord = fn().mockName("openRecord");

/** The card's title: a link-styled button that opens the record, so keyboard users can open it. */
const opens = (text: string) => (
  <Link monochrome removeUnderline className="text-left hover:underline" onClick={() => openRecord(text)}>
    {text}
  </Link>
);

const dealMenu = (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <RowActionButton aria-label="Deal actions" className="size-6">
        <Ellipsis />
      </RowActionButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => openRecord("view")}>View deal</DropdownMenuItem>
      <DropdownMenuItem onClick={() => openRecord("book")}>Book appointment</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

/** A card sits on the board's surface, in a lane about 272px wide. */
const onBoard: Decorator = (Story) => (
  <div style={{ width: "18.5rem", padding: "var(--space-400)", background: "var(--kanban-board)" }}>
    <Story />
  </div>
);

/** On a board, `KanbanBoard` tells each card its column; this does the same for one card. */
const inColumn = (column: KanbanColumn): Decorator =>
  function InColumn(Story) {
    return (
      <KanbanCardContext.Provider value={{ column, columns: pipeline }}>
        <Story />
      </KanbanCardContext.Provider>
    );
  };

/**
 * The card on every Kanban board: the plate up top, the title that opens the
 * record, a quiet line with the vehicle and reference, fact lines, and a
 * footer of chips for who owns it and what it's worth. Pages build it in
 * `KanbanBoard`'s `renderCard`. Urgency goes in a fact's tone, never a red
 * card. For a list people scan or sort, use an `IndexTable` row instead.
 */
const meta = {
  title: "App components/Kanban/KanbanCard",
  component: KanbanCard,
  tags: ["autodocs"],
  parameters: { guidelines },
  decorators: [onBoard],
  args: {
    onOpen: openRecord,
    identity: <KanbanPlate registration="OY70 TZG" href="/vehicles/L-927" title="Open vehicle" />,
    reference: "L-927",
    vehicle: "Ford Fiesta ST-Line",
    title: opens("Priya Shah"),
    titleText: "Priya Shah",
    facts: [
      {
        icon: Phone,
        text: (
          <a href="tel:07700900123" draggable={false} className="hover:underline">
            07700 900123
          </a>
        ),
      },
      { icon: Clock, tone: "muted", text: "3d in stage" },
    ],
    person: { name: "Amira Hussain", empty: "No agent" },
    money: { value: "£15,200.00", kind: "offer" },
  },
  argTypes: {
    identity: { control: false },
    title: { control: false },
    thumbnail: { control: false },
    facts: { control: false },
    menu: { control: false },
    action: { control: false },
    quickAction: { control: false },
  },
} satisfies Meta<typeof KanbanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A deal on the sales pipeline: the customer as the title, how to reach them,
 * how long it's sat in this stage, the agent and the offer.
 * @summary a sales deal on the pipeline board
 */
export const Default: Story = {};

/**
 * On a board, the column's status glyph leads the title: here a ring two
 * stages full. `KanbanBoard` provides it; a board that doesn't drag wraps
 * each card in `KanbanCardContext` itself.
 * @summary the column's glyph beside the title, on a board
 */
export const InColumn: Story = {
  decorators: [inColumn(pipeline[2])],
};

/**
 * The most urgent fact comes first and carries the urgency in its tone and
 * words: critical for overdue, caution for today. The card itself stays
 * white.
 * @summary an overdue date, in critical, first
 */
export const Overdue: Story = {
  args: {
    identity: <KanbanPlate registration="SF19 OPA" href="/vehicles/L-886" title="Open vehicle" />,
    reference: "L-886",
    vehicle: "Nissan Qashqai N-Connecta",
    title: opens("Emma Clarke"),
    titleText: "Emma Clarke",
    facts: [
      { icon: TriangleAlert, tone: "critical", text: "Collection overdue", detail: "Wed 21 Oct" },
      { icon: Banknote, text: "£500.00 deposit", detail: "paid 14 Oct" },
      { icon: Clock, tone: "muted", text: "11d in stage" },
    ],
    person: { name: "Chloe Evans", empty: "No agent" },
    money: { value: "£14,995.00", kind: "agreed" },
  },
};

/**
 * Why a card is stuck, as a tinted note under the facts: caution for a
 * stalled job, critical for a lost deal. It clamps at three lines with the
 * full text on hover.
 * @summary why the card is stuck: stalled or lost
 */
export const WithNote: Story = {
  args: {
    identity: <KanbanPlate registration="BD18 HVN" href="/vehicles/L-871" title="Open vehicle" />,
    reference: "#4F2A",
    vehicle: "BMW 320d M Sport",
    title: opens("Replace front brake pads and discs"),
    titleText: "Replace front brake pads and discs",
    facts: [
      { icon: CalendarClock, text: "Due Fri 30 Oct" },
      { icon: Wrench, text: "Kwik Fit Leicester", title: "Garage" },
    ],
    note: { icon: CirclePause, tone: "caution", text: "Stalled: waiting for discs from the BMW dealer" },
    person: { name: "Tom Bradley", empty: "Unassigned" },
    money: { value: "£386.00", kind: "estimate" },
  },
};

/**
 * Nobody owns the card yet: the owner chip says so in words ("Unassigned"),
 * without an avatar, so it's easy to spot.
 * @summary nobody owns the card yet
 */
export const Unassigned: Story = {
  args: {
    person: { name: null, empty: "No agent" },
  },
};

/**
 * The record's own actions (view, book, edit, delete) sit in a menu in the
 * top-right corner. With a mouse it appears on hover or focus; on touch it's
 * always there.
 * @summary the record's actions in a corner menu
 */
export const WithMenu: Story = {
  args: { menu: dealMenu },
};

/**
 * One action people take often, such as booking a job in, as an icon button at
 * the footer's right end, always visible, unlike the menu. Name the record in
 * its label.
 * @summary an always-visible one-tap action
 */
export const WithQuickAction: Story = {
  args: {
    identity: <KanbanPlate registration="YA21 KPC" href="/vehicles/L-944" title="Open vehicle" />,
    reference: "#7C10",
    vehicle: "Toyota Yaris Hybrid",
    title: opens("MOT and interim service"),
    titleText: "MOT and interim service",
    facts: [
      { icon: CalendarClock, tone: "caution", text: "Due today" },
      { icon: Wrench, tone: "muted", text: "No garage" },
    ],
    person: { name: null, empty: "Unassigned" },
    money: { value: "£149.00", kind: "estimate" },
    quickAction: (
      <Button
        variant="tertiary"
        size="micro"
        icon={<CalendarPlus />}
        accessibilityLabel="Book appointment for MOT and interim service"
        onClick={fn().mockName("bookAppointment")}
      />
    ),
  },
};

/**
 * A full-width button as the footer's last row, for the step that ends the
 * card's work, such as invoicing a finished job.
 * @summary the step that ends the card's work
 */
export const WithAction: Story = {
  args: {
    identity: <KanbanPlate registration="MX21 ROD" href="/vehicles/L-932" title="Open vehicle" />,
    reference: "#91BE",
    vehicle: "Mazda MX-5 Sport",
    title: opens("Repair kerbed alloy, front left"),
    titleText: "Repair kerbed alloy, front left",
    facts: [{ icon: Wrench, text: "Leicester Alloy Repairs", title: "Garage" }],
    person: { name: "Amira Hussain", empty: "Unassigned" },
    money: { value: "£95.00", kind: "actual" },
    action: (
      <Button fullWidth onClick={fn().mockName("generateInvoice")}>
        Generate invoice
      </Button>
    ),
  },
};

/**
 * A photo beside the plate, when photos are on (`PHOTOS_ENABLED`). Cards must
 * read as complete without it, since Phase 1 ships with photos off.
 * @summary a vehicle photo beside the plate
 */
export const WithThumbnail: Story = {
  args: {
    thumbnail: (
      <VehicleImage
        vehicle={{ id: "veh-0927", registration: "OY70 TZG", heroImageUrl: "/cars/seed/vehicle-1.png" }}
        variant="thumb"
        sizes="48px"
        className="w-12 rounded-(--radius-200)"
      />
    ),
  },
};

/**
 * Long content holds at the narrowest lane: the vehicle's name and the facts
 * wrap rather than cut, the title clamps at two lines (full text on hover),
 * and a long owner's name ellipses before the amount does.
 * @summary long names and facts at the narrowest lane
 */
export const LongContent: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "15.5rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    identity: <KanbanPlate registration="LN20 UJE" href="/vehicles/L-919" title="Open vehicle" />,
    reference: "L-919",
    vehicle: "Audi A3 Sportback 35 TFSI S line Competition S tronic",
    title: opens("Alexandra Montgomery-Fairweather and Christopher Montgomery-Fairweather"),
    titleText: "Alexandra Montgomery-Fairweather and Christopher Montgomery-Fairweather",
    facts: [
      {
        icon: CalendarClock,
        text: "Appointment Tue 27 Oct, 10:30",
        detail: "test drive with part exchange valuation",
      },
      { icon: Clock, tone: "caution", text: "18d in stage" },
    ],
    note: {
      icon: CircleX,
      tone: "critical",
      text: "Lost: bought a similar car from a dealer in Nottingham on cheaper finance after the part exchange valuation came in under what they hoped",
    },
    person: { name: "Bartholomew Kowalczyk-Henderson", empty: "No agent" },
    money: { value: "£18,750.00", kind: "offer" },
  },
};
