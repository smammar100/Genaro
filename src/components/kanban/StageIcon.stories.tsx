import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StageIcon, type KanbanColumn } from "./stage-icon";
import guidelines from "./README.md?raw";

const pipeline: KanbanColumn[] = [
  { id: "new_lead", label: "New lead", tone: "neutral", kind: "open" },
  { id: "contacted", label: "Contacted", tone: "info", kind: "open" },
  { id: "test_drive", label: "Test drive", tone: "magic", kind: "open" },
  { id: "collection", label: "Collection", tone: "emphasis", kind: "open" },
  { id: "completed_sale", label: "Completed sale", tone: "success", kind: "done" },
];
const stalled: KanbanColumn = { id: "stalled", label: "Stalled", tone: "caution", kind: "exception", glyph: "pause" };
const lost: KanbanColumn = { id: "lost", label: "Lost", tone: "critical", kind: "exception", glyph: "cross" };
const board = [...pipeline, stalled, lost];

/**
 * A Kanban column's status mark, worked out from where the column sits on the
 * board, so any set of stages gets one without drawing icons: a ring that
 * fills as a card walks the open columns, a tick when done, a pause or a
 * cross off the path. Cards and the hidden-columns rail use the bare glyph;
 * lane headers use the `badge`. It's decorative: the column's name says the
 * same in words.
 */
const meta = {
  title: "App components/Kanban/StageIcon",
  component: StageIcon,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { column: pipeline[0], columns: board },
  argTypes: {
    column: { control: false },
    columns: { control: false },
    variant: { control: "inline-radio", options: ["glyph", "badge"] },
  },
} satisfies Meta<typeof StageIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The first stage on the path, such as New lead: a dashed, empty ring, since
 * nothing has happened yet.
 * @summary the first stage: a dashed, empty ring
 */
export const FirstStage: Story = {};

/**
 * The ring fills as the stages go on, so a glance says how far along a card
 * is. Here: New lead, Contacted, Test drive, Collection.
 * @summary the ring fills stage by stage
 */
export const Progress: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-300)" }}>
      {pipeline
        .filter((c) => c.kind === "open")
        .map((c) => (
          <StageIcon key={c.id} {...args} column={c} />
        ))}
    </div>
  ),
};

/**
 * The column that ends the path, such as Completed sale: a filled disc with a
 * tick.
 * @summary the end of the path: a tick
 */
export const Done: Story = {
  args: { column: pipeline[4] },
};

/**
 * A column off the path where work waits, such as Stalled: a pause.
 * @summary off the path, waiting: a pause
 */
export const Stalled: Story = {
  args: { column: stalled },
};

/**
 * A column off the path where a card ends badly, such as Lost: a cross.
 * @summary off the path, given up: a cross
 */
export const Lost: Story = {
  args: { column: lost },
};

/**
 * The same marks set in a small tile of the column's tone, for the lane
 * header beside the column's name.
 * @summary a filled tile, for lane headers
 */
export const Badge: Story = {
  args: { variant: "badge" },
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-300)" }}>
      {board.map((c) => (
        <StageIcon key={c.id} {...args} column={c} />
      ))}
    </div>
  ),
};
