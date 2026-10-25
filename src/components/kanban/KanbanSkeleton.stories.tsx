import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KanbanSkeleton } from "./kanban-board";
import guidelines from "./README.md?raw";

/**
 * A Kanban board while its data loads: the frame and lanes, with pulsing card
 * shapes. Use it on every board, with the board's number of columns, rather
 * than a `Card` of `SkeletonBodyText`.
 */
const meta = {
  title: "App components/Kanban/KanbanSkeleton",
  component: KanbanSkeleton,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { columns: 4 },
  argTypes: {
    columns: { control: { type: "number", min: 1, max: 8, step: 1 } },
  },
} satisfies Meta<typeof KanbanSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The maintenance board loading: four columns, from pending to stalled.
 * @summary a four-column board loading
 */
export const Default: Story = {};

/**
 * Pass the board's real column count, here the sales pipeline's five, so
 * nothing shifts when the cards arrive.
 * @summary match the board's column count
 */
export const SalesPipeline: Story = {
  args: { columns: 5 },
};
