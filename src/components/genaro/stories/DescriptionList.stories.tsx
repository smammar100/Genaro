import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, Card, DescriptionList, Link } from "@/components/genaro";
import guidelines from "../docs/DescriptionList.md?raw";

/**
 * DescriptionList shows read-only term and description pairs in two equal
 * columns, such as a vehicle's details inside a card. For right-aligned
 * amounts, such as an invoice's totals, use a DataTable.
 */
const meta = {
  title: "Components/Layout and structure/DescriptionList",
  component: DescriptionList,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    items: [
      { term: "Registration", description: "OY70 TZG" },
      { term: "Stock ID", description: "L-927" },
      { term: "Make and model", description: "Ford Fiesta 1.0 EcoBoost Titanium" },
      { term: "Mileage", description: "28,412 miles" },
      { term: "First registered", description: "4 September 2020" },
    ],
  },
} satisfies Meta<typeof DescriptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Read-only facts about one thing, such as a vehicle, as label and value rows.
 * @summary read-only label and value rows
 */
export const Default: Story = {};

/**
 * Descriptions take any node: a Link to a related record or a Badge for its
 * status.
 * @summary links and badges as values
 */
export const RichDescriptions: Story = {
  args: {
    items: [
      { term: "Customer", description: <Link url="/sales/leads/1053">Priya Sharma</Link> },
      { term: "Vehicle", description: <Link url="/vehicles/L-927">OY70 TZG</Link> },
      { term: "Deposit", description: "£500.00" },
      { term: "Status", description: <Badge tone="attention">Reserved</Badge> },
    ],
  },
};

/**
 * Tighter rows for longer descriptions, such as what a warranty covers.
 * @summary tighter rows for longer descriptions
 */
export const Tight: Story = {
  args: {
    gap: "tight",
    items: [
      { term: "Engine and gearbox", description: "Internal mechanical and electrical failure, parts and labour." },
      { term: "Claim limit", description: "£1,000.00 per claim, up to the vehicle's purchase price." },
      { term: "Excluded", description: "Wear and tear items such as tyres, brake pads and wiper blades." },
    ],
  },
};

/**
 * Inside a card, the list sits under the card's title with no rule above its
 * first row.
 * @summary under a card title
 */
export const InCard: Story = {
  render: (args) => (
    <Card title="Vehicle details">
      <DescriptionList {...args} />
    </Card>
  ),
};
