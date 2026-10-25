import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, Divider } from "@/components/genaro";
import guidelines from "../docs/Divider.md?raw";

/**
 * Divider is a 1px rule that separates sections inside a card, such as an
 * invoice's lines from its total. Don't put it between cards; their gap
 * already separates them.
 */
const meta = {
  title: "Components/Layout and structure/Divider",
  component: Divider,
  tags: ["autodocs"],
  parameters: { guidelines },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Separates sections of a card, such as an invoice's lines from the amount
 * paid. The card's 8px gap spaces it from its neighbours.
 * @summary sections inside a card
 */
export const Default: Story = {
  render: (args) => (
    <Card title="Invoice INV-2041">
      <p className="body-md">2020 Ford Fiesta 1.0 EcoBoost Titanium: £12,495.00</p>
      <p className="body-md">12-month warranty: £299.00</p>
      <p className="body-md">Total: £12,794.00</p>
      <Divider {...args} />
      <p className="body-md">Paid by bank transfer: £12,794.00</p>
    </Card>
  ),
};

/**
 * A stronger line, such as between the rows of a flush card that runs edge to
 * edge.
 * @summary a stronger line between flush rows
 */
export const Strong: Story = {
  args: { borderColor: "border" },
  render: (args) => (
    <Card padding="0">
      <p className="body-md" style={{ padding: "var(--space-400)" }}>
        OY70 TZG · 2020 Ford Fiesta 1.0 EcoBoost Titanium
      </p>
      <Divider {...args} />
      <p className="body-md" style={{ padding: "var(--space-400)" }}>
        WP14 KXM · 2014 Audi A4 2.0 TFSI Black Edition
      </p>
    </Card>
  ),
};

/**
 * The inverse colour, for rules on dark surfaces.
 * @summary rules on dark surfaces
 */
export const Inverse: Story = {
  args: { borderColor: "border-inverse" },
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-200)",
        padding: "var(--space-400)",
        borderRadius: "var(--radius-300)",
        background: "var(--bg-surface-inverse)",
        color: "var(--text-inverse)",
      }}
    >
      <p className="body-md">3 vehicles selected</p>
      <Divider {...args} />
      <p className="body-md">£35,740.00 at list price</p>
    </div>
  ),
};
