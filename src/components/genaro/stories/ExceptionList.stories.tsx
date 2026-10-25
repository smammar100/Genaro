import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, ExceptionList, Link } from "@/components/genaro";
import guidelines from "../docs/ExceptionList.md?raw";

/**
 * Exception lists call out what's notable about a vehicle, lead or invoice,
 * in short rows inside cards and list items: outstanding finance, an MOT due,
 * a customer's preferences. For one message that needs a fix, use a `Banner`.
 */
const meta = {
  title: "Components/Feedback and status/ExceptionList",
  component: ExceptionList,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    items: [
      { icon: "NotesMinor", description: "Prefers a call after 5 pm." },
      { icon: "ClockMinor", description: "Test drive booked for Saturday at 10:30." },
    ],
  },
} satisfies Meta<typeof ExceptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Neutral facts worth noticing, such as a lead's preferences. Without a
 * status, rows are secondary text.
 * @summary neutral facts worth noticing
 */
export const Default: Story = {};

/**
 * Something that blocks the work, such as outstanding finance on a car you're
 * about to sell. The whole row turns critical.
 * @summary blocking problems, in critical
 */
export const Critical: Story = {
  args: {
    items: [
      {
        status: "critical",
        icon: "AlertMinor",
        title: "Outstanding finance.",
        description: "£4,210.00 is owed on OY70 TZG. Settle it before you sell the car.",
      },
    ],
  },
};

/**
 * Something to deal with soon, such as an MOT about to run out. The whole row
 * turns warning.
 * @summary things to deal with soon, in warning
 */
export const Warning: Story = {
  args: {
    items: [
      {
        status: "warning",
        icon: "RiskMinor",
        title: "MOT due soon.",
        description: "It expires on 3 November 2026.",
      },
    ],
  },
};

/**
 * Rows without an icon show a small dot, for plain lists of facts where an
 * icon would add nothing.
 * @summary plain facts, with a dot instead of an icon
 */
export const WithoutIcons: Story = {
  args: {
    items: [
      { description: "HPI check passed on 21 October 2026." },
      { description: "2 previous owners." },
      { description: "Full service history." },
    ],
  },
};

/**
 * Descriptions can hold links, such as to the invoice a note refers to.
 * @summary descriptions with links
 */
export const WithLink: Story = {
  args: {
    items: [
      {
        icon: "ClockMinor",
        description: (
          <>
            Deposit paid on <Link url="/invoices/INV-2041">INV-2041</Link> 3 days ago
          </>
        ),
      },
    ],
  },
};

/**
 * Where it usually sits: in a card on the vehicle's page, critical first, then
 * warnings, then neutral facts.
 * @summary a vehicle's checks in a card
 */
export const InCard: Story = {
  args: {
    items: [
      {
        status: "critical",
        icon: "AlertMinor",
        title: "Outstanding finance.",
        description: "£4,210.00 is owed. Settle it before you sell the car.",
      },
      { status: "warning", icon: "RiskMinor", title: "MOT due soon.", description: "It expires on 3 November 2026." },
      { icon: "TickMinor", description: "HPI check passed on 21 October 2026." },
    ],
  },
  render: (args) => (
    <Card title="Vehicle checks">
      <ExceptionList {...args} />
    </Card>
  ),
};
