import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from "@/components/genaro";
import { KanbanEmpty } from "./kanban-board";
import guidelines from "./README.md?raw";

/**
 * What a Kanban column shows when it has no cards: a dashed box that says so
 * ("No jobs here yet") and stays a place to drop a card. `KanbanBoard` adds it
 * for you; use it yourself only in a `KanbanLane` you build by hand. For an
 * empty page or list, use `EmptyState`.
 */
const meta = {
  title: "App components/Kanban/KanbanEmpty",
  component: KanbanEmpty,
  tags: ["autodocs"],
  parameters: { guidelines },
  decorators: [
    (Story) => (
      <div style={{ width: "17rem", padding: "var(--space-400)", background: "var(--kanban-board)" }}>
        <Story />
      </div>
    ),
  ],
  args: { children: "No jobs here yet" },
  argTypes: {
    children: { control: "text" },
    action: { control: false },
  },
} satisfies Meta<typeof KanbanEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An empty column on a board that doesn't create cards, such as Completed:
 * it says what isn't there, by the board's noun.
 * @summary an empty column, named by the board's noun
 */
export const Default: Story = {};

/**
 * On a board that creates cards, the empty box carries the add button too,
 * labelled with a verb and a noun.
 * @summary with the board's add button
 */
export const WithAddButton: Story = {
  args: {
    action: (
      <Button variant="tertiary" icon="PlusMinor" onClick={fn().mockName("addJob")}>
        Add job
      </Button>
    ),
  },
};
