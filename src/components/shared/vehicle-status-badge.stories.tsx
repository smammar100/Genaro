import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { VehicleStatusBadge } from "./status-badge";

/**
 * A vehicle's stock status, from Received to Sold, as a Badge whose tone is
 * fixed per status so it reads the same on every page. Use it wherever a
 * vehicle's status shows; in a data grid use `VehicleStatusCell`. For a deal's
 * stage use `SalesStageBadge`.
 */
const meta = {
  title: "App components/Shared/VehicleStatusBadge",
  component: VehicleStatusBadge,
  tags: ["autodocs"],
  args: { status: "listed" },
  argTypes: {
    status: { control: "select", options: VEHICLE_STATUSES.map((s) => s.value) },
  },
} satisfies Meta<typeof VehicleStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A car that's advertised and for sale, the status most stock spends its time
 * in.
 * @summary advertised and for sale ("Listed")
 */
export const Listed: Story = {};

/**
 * A car just bought in, before anyone has inspected it. Informational: nothing
 * is late yet.
 * @summary just bought in ("Received")
 */
export const Received: Story = {
  args: { status: "received" },
};

/**
 * A car waiting for its inspection, which someone needs to book soon.
 * @summary waiting for inspection ("Inspection pending")
 */
export const InspectionPending: Story = {
  args: { status: "inspection_pending" },
};

/**
 * A car in prep after its inspection found work to do.
 * @summary in prep after inspection ("Being prepared")
 */
export const BeingPrepared: Story = {
  args: { status: "being_prepared" },
};

/**
 * A car that's prepared and ready to list.
 * @summary prepared, ready to list ("Ready")
 */
export const Ready: Story = {
  args: { status: "ready" },
};

/**
 * A car held for a customer who's paid a deposit. The strong fill sets it
 * apart from the plain info of Received.
 * @summary held on a deposit ("Reserved")
 */
export const Reserved: Story = {
  args: { status: "reserved" },
};

/**
 * A car that's been sold and handed over. Neutral: it needs nothing more.
 * @summary sold and handed over ("Sold")
 */
export const Sold: Story = {
  args: { status: "sold" },
};

/**
 * A car the customer brought back, which needs someone to act now.
 * @summary brought back by the customer ("Returned")
 */
export const Returned: Story = {
  args: { status: "returned" },
};

/**
 * A caret after the label says the badge opens a menu to change the status,
 * as on the vehicle page's header.
 * @summary a badge that opens a status menu
 */
export const WithChevron: Story = {
  args: { status: "ready", withChevron: true },
};
