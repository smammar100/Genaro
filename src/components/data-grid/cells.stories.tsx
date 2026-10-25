import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { makeVehicle } from "@/test/factories";
import {
  AppointmentOutcomeCell,
  AppointmentStatusCell,
  AtIndicatorCell,
  BooleanCell,
  ChannelsCell,
  CurrencyCell,
  DateCell,
  DateRangeCell,
  EmptyCell,
  InvoiceStatusCell,
  LeadStatusCell,
  NumberCell,
  PhoneCell,
  ReturnResolutionCell,
  ReturnStatusCell,
  SalesStageCell,
  SelectCell,
  TextCell,
  UserCell,
  VehicleCell,
  VehicleStatusCell,
  WarrantyStatusCell,
} from "./cells";
import { DataGridHeaderRow, DataGridRow, DataGridShell, DataGridTable } from "./data-grid";
import type { ColType, ColumnDef } from "./types";

/** The column a story's cell sits in: its header, and the type that sets its alignment. */
interface GridColumn {
  label: string;
  type?: ColType;
}

/**
 * Renders the story's cell as the one cell of a one-row data grid, under its
 * column header, so it looks as it does on a page. Set the header with
 * `parameters.column`.
 */
const inGridRow: Decorator = (Story, context) => {
  const column = (context.parameters.column as GridColumn | undefined) ?? { label: "Value" };
  const cols: ColumnDef<null>[] = [{ key: "cell", label: column.label, type: column.type ?? "custom", render: () => <Story /> }];
  return (
    <div style={{ maxWidth: "20rem" }}>
      <DataGridShell>
        <DataGridTable cols={cols}>
          <DataGridHeaderRow cols={cols} />
          <tbody>
            <DataGridRow row={null} cols={cols} index={0} />
          </tbody>
        </DataGridTable>
      </DataGridShell>
    </div>
  );
};

/**
 * The cells of the app's data grids: one per kind of value, from text and
 * money to a vehicle or a status pill. A column's `type` picks its cell, so
 * most pages never render one directly; use a cell yourself in a column's
 * `render`, or in a table that isn't a data grid. Every cell shows a dash
 * when it has no value.
 */
const meta = {
  title: "App components/Data grid/Cells",
  component: EmptyCell,
  subcomponents: {
    TextCell,
    PhoneCell,
    NumberCell,
    CurrencyCell,
    DateCell,
    DateRangeCell,
    BooleanCell,
    SelectCell,
    VehicleCell,
    UserCell,
    ChannelsCell,
    VehicleStatusCell,
    SalesStageCell,
    LeadStatusCell,
    AppointmentStatusCell,
    AppointmentOutcomeCell,
    WarrantyStatusCell,
    InvoiceStatusCell,
    ReturnStatusCell,
    ReturnResolutionCell,
    AtIndicatorCell,
  },
  tags: ["autodocs"],
  decorators: [inGridRow],
} satisfies Meta<typeof EmptyCell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A cell with no value shows a dash, so a blank never reads as something still
 * loading. Every cell falls back to it.
 * @summary no value: a dash
 */
export const Empty: Story = {
  parameters: { column: { label: "Selling agent" } },
};

/**
 * Any value as plain text, the default for a column without a type, such as a
 * note.
 * @summary plain text, the default cell (type "text")
 */
export const Text: StoryObj<typeof TextCell> = {
  args: { value: "Part exchange: 2015 Ford Focus" },
  argTypes: { value: { control: "text" } },
  parameters: { column: { label: "Notes", type: "text" } },
  render: (args) => <TextCell {...args} />,
};

/**
 * A phone number that dials when tapped on a phone. The tap doesn't open the
 * row.
 * @summary a tap-to-call number (type "phone")
 */
export const Phone: StoryObj<typeof PhoneCell> = {
  args: { value: "07700 900123" },
  parameters: { column: { label: "Phone", type: "phone" } },
  render: (args) => <PhoneCell {...args} />,
};

/**
 * Counts and measures, such as mileage, with thousands separators, right
 * aligned so the digits line up down the column.
 * @summary counts and measures, right-aligned (type "number")
 */
export const NumberValue: StoryObj<typeof NumberCell> = {
  args: { value: 42350 },
  parameters: { column: { label: "Mileage", type: "number" } },
  render: (args) => <NumberCell {...args} />,
};

/**
 * Money in pounds and pence, right aligned, such as a listing price.
 * @summary money in pounds, right-aligned (type "currency")
 */
export const Currency: StoryObj<typeof CurrencyCell> = {
  args: { value: 16419 },
  parameters: { column: { label: "Listing price", type: "currency" } },
  render: (args) => <CurrencyCell {...args} />,
};

/**
 * A date, such as when a car was received, as day, short month and year.
 * @summary a date: "21 Oct 2026" (type "date")
 */
export const DateValue: StoryObj<typeof DateCell> = {
  args: { value: "2026-10-21" },
  parameters: { column: { label: "Received", type: "date" } },
  render: (args) => <DateCell {...args} />,
};

/**
 * A span of time, such as a warranty's cover, as its start and end dates.
 * @summary a start and end date (type "dateRange")
 */
export const DateRange: StoryObj<typeof DateRangeCell> = {
  args: { start: "2026-10-23", end: "2027-10-22" },
  parameters: { column: { label: "Cover", type: "dateRange" } },
  render: (args) => <DateRangeCell {...args} />,
};

/**
 * A yes, such as a car whose V5C has come in: a small green tick.
 * @summary yes: a green tick (type "boolean")
 */
export const BooleanYes: StoryObj<typeof BooleanCell> = {
  args: { value: true },
  parameters: { column: { label: "V5C received", type: "boolean" } },
  render: (args) => <BooleanCell {...args} />,
};

/**
 * A no, or no answer yet: a grey cross.
 * @summary no, or not yet: a grey cross
 */
export const BooleanNo: StoryObj<typeof BooleanCell> = {
  args: { value: false },
  parameters: { column: { label: "V5C received", type: "boolean" } },
  render: (args) => <BooleanCell {...args} />,
};

/**
 * A value picked from a fixed list, such as where a car was bought, as a grey
 * chip; its slug's underscores read as spaces.
 * @summary a value from a fixed list (type "select")
 */
export const SelectValue: StoryObj<typeof SelectCell> = {
  args: { value: "trade_in" },
  argTypes: { value: { control: "text" } },
  parameters: { column: { label: "Purchase source", type: "select" } },
  render: (args) => <SelectCell {...args} />,
};

/**
 * The vehicle a row is about: its plate over its stock ID, with a thumbnail
 * when photos are on. Usually the first, sticky column.
 * @summary the row's vehicle: plate and stock ID (type "vehicle")
 */
export const Vehicle: StoryObj<typeof VehicleCell> = {
  args: { vehicle: makeVehicle({ registration: "OY70TZG", stockId: "L-927", heroImageUrl: "/cars/seed/vehicle-1.png" }) },
  argTypes: { vehicle: { control: false } },
  parameters: { column: { label: "Vehicle", type: "vehicle" } },
  render: (args) => <VehicleCell {...args} />,
};

/**
 * A person, such as the selling agent, as their initials and name.
 * @summary a person: initials and name (type "user")
 */
export const User: StoryObj<typeof UserCell> = {
  args: { name: "Amira Hussain" },
  parameters: { column: { label: "Selling agent", type: "user" } },
  render: (args) => <UserCell {...args} />,
};

/**
 * Where a listing is advertised: each channel filled when it's on, grey when
 * it's off.
 * @summary advert channels, on and off (type "channels")
 */
export const Channels: StoryObj<typeof ChannelsCell> = {
  args: { channels: { autotrader: true, website: true, ebay: false, facebook: false } },
  parameters: { column: { label: "Channels", type: "channels" } },
  render: (args) => <ChannelsCell {...args} />,
};

/**
 * A vehicle's stock status, as its `VehicleStatusBadge`.
 * @summary a vehicle's status (type "vehicleStatus")
 */
export const VehicleStatus: StoryObj<typeof VehicleStatusCell> = {
  args: { status: "reserved" },
  argTypes: { status: { control: "select", options: VEHICLE_STATUSES.map((s) => s.value) } },
  parameters: { column: { label: "Status", type: "vehicleStatus" } },
  render: (args) => <VehicleStatusCell {...args} />,
};

/**
 * A deal's pipeline stage, as its `SalesStageBadge`.
 * @summary a deal's stage (type "salesStage")
 */
export const SalesStage: StoryObj<typeof SalesStageCell> = {
  args: { stage: "deposit_taken" },
  parameters: { column: { label: "Stage", type: "salesStage" } },
  render: (args) => <SalesStageCell {...args} />,
};

/**
 * A lead's status, from New to an appointment booked or lost.
 * @summary a lead's status (type "leadStatus")
 */
export const LeadStatus: StoryObj<typeof LeadStatusCell> = {
  args: { status: "appointment_booked" },
  argTypes: { status: { control: "select", options: ["new", "contacted", "appointment_booked", "lost"] } },
  parameters: { column: { label: "Lead status", type: "leadStatus" } },
  render: (args) => <LeadStatusCell {...args} />,
};

/**
 * An appointment's status: upcoming, completed, cancelled or a no-show.
 * @summary an appointment's status (type "appointmentStatus")
 */
export const AppointmentStatus: StoryObj<typeof AppointmentStatusCell> = {
  args: { status: "upcoming" },
  argTypes: { status: { control: "select", options: ["upcoming", "completed", "cancelled", "no_show"] } },
  parameters: { column: { label: "Status", type: "appointmentStatus" } },
  render: (args) => <AppointmentStatusCell {...args} />,
};

/**
 * What came of an appointment, from a test drive to a sale.
 * @summary what came of an appointment (type "appointmentOutcome")
 */
export const AppointmentOutcome: StoryObj<typeof AppointmentOutcomeCell> = {
  args: { outcome: "offer_made" },
  argTypes: {
    outcome: { control: "select", options: ["pending", "test_drive", "offer_made", "deposit_taken", "sold", "lost"] },
  },
  parameters: { column: { label: "Outcome", type: "appointmentOutcome" } },
  render: (args) => <AppointmentOutcomeCell {...args} />,
};

/**
 * A warranty's status: active, expired or cancelled.
 * @summary a warranty's status (type "warrantyStatus")
 */
export const WarrantyStatus: StoryObj<typeof WarrantyStatusCell> = {
  args: { status: "active" },
  argTypes: { status: { control: "select", options: ["active", "expired", "cancelled"] } },
  parameters: { column: { label: "Warranty", type: "warrantyStatus" } },
  render: (args) => <WarrantyStatusCell {...args} />,
};

/**
 * An invoice's status, from draft to paid or overdue.
 * @summary an invoice's status (type "invoiceStatus")
 */
export const InvoiceStatus: StoryObj<typeof InvoiceStatusCell> = {
  args: { status: "overdue" },
  argTypes: {
    status: { control: "select", options: ["draft", "sent", "issued", "paid", "overdue", "cancelled"] },
  },
  parameters: { column: { label: "Invoice", type: "invoiceStatus" } },
  render: (args) => <InvoiceStatusCell {...args} />,
};

/**
 * A vehicle return's status, from pending to resolved or rejected.
 * @summary a vehicle return's status (type "returnStatus")
 */
export const ReturnStatus: StoryObj<typeof ReturnStatusCell> = {
  args: { status: "in_review" },
  argTypes: { status: { control: "select", options: ["pending", "in_review", "resolved", "rejected"] } },
  parameters: { column: { label: "Return", type: "returnStatus" } },
  render: (args) => <ReturnStatusCell {...args} />,
};

/**
 * Who a vehicle return is settled through: the vendor, a supplier, G-Trader
 * or someone else.
 * @summary how a return is settled (type "returnResolution")
 */
export const ReturnResolution: StoryObj<typeof ReturnResolutionCell> = {
  args: { resolution: "g_trader" },
  argTypes: { resolution: { control: "select", options: ["vendor", "supplier", "g_trader", "other"] } },
  parameters: { column: { label: "Resolution", type: "returnResolution" } },
  render: (args) => <ReturnResolutionCell {...args} />,
};

/**
 * AutoTrader's verdict on a car's price, from a great price to overpriced.
 * @summary AutoTrader's price indicator (type "atIndicator")
 */
export const AtIndicator: StoryObj<typeof AtIndicatorCell> = {
  args: { indicator: "great" },
  argTypes: {
    indicator: { control: "select", options: ["great", "good", "above_average", "high", "unrated"] },
  },
  parameters: { column: { label: "Price indicator", type: "atIndicator" } },
  render: (args) => <AtIndicatorCell {...args} />,
};
