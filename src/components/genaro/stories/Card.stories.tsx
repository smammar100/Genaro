import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Card, Divider, Link } from "@/components/genaro";
import guidelines from "../docs/Card.md?raw";

/**
 * Card is the surface that groups one topic's content and actions, such as a
 * vehicle's details or a lead's contact. Split long forms across several
 * cards. IndexTable, DataTable, ResourceList and MediaCard are already cards.
 */
const meta = {
  title: "Components/Layout and structure/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "Customer",
    children: (
      <>
        <Link url="/sales/leads/1053">Priya Sharma</Link>
        <p className="body-md">Test drive booked for Saturday 31 October at 10:00</p>
      </>
    ),
  },
  argTypes: {
    title: { control: "text" },
    children: { control: false },
    actions: { control: false },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One topic per card, with a title that names it. Children stack 8px apart.
 * @summary one topic, with a title
 */
export const Default: Story = {};

/**
 * Actions for the card's content go in its header, usually as plain Buttons,
 * such as editing a customer's details.
 * @summary a card with header actions
 */
export const WithActions: Story = {
  args: {
    actions: (
      <Button variant="plain" url="/sales/leads/1053/edit">
        Edit customer
      </Button>
    ),
  },
};

/**
 * Secondary content, such as a summary or a tip, on the subdued surface so it
 * sits back from the main cards.
 * @summary secondary content: summaries and tips
 */
export const Subdued: Story = {
  args: {
    title: "Deal summary",
    background: "subdued",
    children: <p className="body-md">Priya’s third purchase with Car Capital; she part-exchanged a 2016 Kia Picanto.</p>,
  },
};

/**
 * Lists, tables and media run to the edges with `padding="0"`; pad each row
 * instead, and leave out the title, which would lose its padding too.
 * @summary edge-to-edge lists and media
 */
export const Flush: Story = {
  args: {
    title: undefined,
    padding: "0",
    children: (
      <>
        <p className="body-md" style={{ padding: "var(--space-400)" }}>
          OY70 TZG · 2020 Ford Fiesta 1.0 EcoBoost Titanium
        </p>
        <Divider />
        <p className="body-md" style={{ padding: "var(--space-400)" }}>
          WP14 KXM · 2014 Audi A4 2.0 TFSI Black Edition
        </p>
      </>
    ),
  },
};
