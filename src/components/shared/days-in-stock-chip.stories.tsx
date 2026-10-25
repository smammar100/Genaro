import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DaysInStockChip } from "./days-in-stock-chip";

/**
 * How long a vehicle has been in stock, as a short chip ("45d") with the full
 * meaning on hover. Its tone ages with the car: green under 30 days, amber
 * under 60, red after, so stale stock stands out in a list. For a deal's days
 * in its stage on a Kanban card, use a toned fact line instead.
 */
const meta = {
  title: "App components/Shared/DaysInStockChip",
  component: DaysInStockChip,
  tags: ["autodocs"],
  args: { days: 12 },
  argTypes: {
    days: { control: { type: "number", min: 0, step: 1 } },
  },
} satisfies Meta<typeof DaysInStockChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Fresh stock, under 30 days, needs nothing.
 * @summary under 30 days: fresh stock
 */
export const Fresh: Story = {};

/**
 * Stock between 30 and 59 days old, worth a look at its price or advert.
 * @summary 30 to 59 days: worth a look
 */
export const Ageing: Story = {
  args: { days: 45 },
};

/**
 * Stock 60 days old or more, costing money every day it stays.
 * @summary 60 days or more: stale stock
 */
export const Stale: Story = {
  args: { days: 96 },
};
