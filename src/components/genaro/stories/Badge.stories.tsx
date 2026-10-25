import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, iconNames } from "@/components/genaro";
import guidelines from "../docs/Badge.md?raw";

/**
 * Badges show the system status of a vehicle, invoice or appointment in one or
 * two words ("Received", "Paid"). Pick the tone by urgency, the same tone for
 * the same status everywhere. Labels people type themselves are `Tag`s.
 */
const meta = {
  title: "Components/Feedback and status/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { children: "Sold" },
  argTypes: {
    icon: { control: "select", options: [undefined, ...iconNames] },
    children: { control: "text" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Finished or inactive states that need nothing from anyone, such as a sold
 * car. Neutral is the default tone.
 * @summary finished or inactive states ("Sold")
 */
export const Neutral: Story = {};

/**
 * Informational states that need no action yet, such as a car that has just
 * been received into stock.
 * @summary informational states ("Received")
 */
export const Info: Story = {
  args: { tone: "info", children: "Received" },
};

/**
 * Done and healthy states, such as a car that's prepared and ready to sell.
 * @summary done or healthy states ("Ready")
 */
export const Success: Story = {
  args: { tone: "success", children: "Ready" },
};

/**
 * States that need action soon, such as a car waiting for its inspection.
 * @summary needs action soon ("Inspection pending")
 */
export const Attention: Story = {
  args: { tone: "attention", children: "Inspection pending" },
};

/**
 * States that mark a problem, such as a car being prepared after its
 * inspection found faults.
 * @summary a problem in progress ("Being prepared")
 */
export const Warning: Story = {
  args: { tone: "warning", children: "Being prepared" },
};

/**
 * States that need someone to act now, such as a car the customer has
 * returned.
 * @summary needs immediate action ("Returned")
 */
export const Critical: Story = {
  args: { tone: "critical", children: "Returned" },
};

/**
 * Payment progress on an invoice: the pip fills from unpaid, through a deposit
 * paid, to paid. The words still carry the status; the pip only adds to them.
 * @summary payment progress pips on invoices
 */
export const Progress: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-100)" }}>
      <Badge {...args} tone="attention" progress="incomplete">
        Unpaid
      </Badge>
      <Badge {...args} tone="warning" progress="partiallyComplete">
        Deposit paid
      </Badge>
      <Badge {...args} tone="success" progress="complete">
        Paid
      </Badge>
    </div>
  ),
};

/**
 * The rare status that must stand out in a busy list, such as an overdue
 * invoice. A solid fill; use it sparingly or nothing stands out.
 * @summary rare statuses that must stand out ("Overdue")
 */
export const Strong: Story = {
  args: { tone: "critical", strong: true, children: "Overdue" },
};

/**
 * An icon before the words when it helps people scan, such as a clock on an
 * upcoming appointment.
 * @summary a leading icon that helps scanning
 */
export const WithIcon: Story = {
  args: { tone: "info", icon: "ClockMinor", children: "Upcoming" },
};

/**
 * Next to a page title, such as a vehicle's status in its header, where the
 * medium badge looks too small beside display type.
 * @summary beside page titles
 */
export const Large: Story = {
  args: { tone: "warning", size: "large", children: "Reserved" },
};

/**
 * Labels a feature that has just shipped, such as a new report. Not for
 * statuses.
 * @summary new-feature labels only
 */
export const New: Story = {
  args: { tone: "new", children: "New" },
};
