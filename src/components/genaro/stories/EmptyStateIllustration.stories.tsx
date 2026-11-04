import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Card, EmptyState, EmptyStateIllustration } from "@/components/genaro";
import guidelines from "../docs/EmptyStateIllustration.md?raw";

/**
 * A ghosted miniature of the screen once it has content, with the first item
 * landing where it will appear. It goes in EmptyState's `illustration` slot and
 * tells people what the page will look like and where to start.
 */
const meta = {
  title: "Components/Feedback and status/EmptyStateIllustration",
  component: EmptyStateIllustration,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { variant: "list", size: "medium", plates: false },
  argTypes: {
    variant: {
      control: "select",
      options: ["list", "kanban", "calendar", "gallery", "checklist", "timeline", "search", "lock", "notFound", "error", "chart", "detail"],
    },
    size: { control: "inline-radio", options: ["medium", "small"] },
  },
} satisfies Meta<typeof EmptyStateIllustration>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The first car of an empty stock list. `plates` leads each row with a reg
 * plate, as every vehicle list does.
 * @summary an empty vehicle list, rows led by reg plates
 */
export const VehicleList: Story = {
  args: { plates: true },
  render: (args) => (
    <EmptyState
      illustration={<EmptyStateIllustration {...args} />}
      heading="No vehicles in stock"
      action={{ content: "Add vehicle", onAction: fn() }}
    >
      Add a vehicle by its registration to start tracking it.
    </EmptyState>
  ),
};

/**
 * A board with no cards: the first deal glides into New lead.
 * @summary an empty kanban board
 */
export const Board: Story = {
  args: { variant: "kanban" },
  render: (args) => (
    <EmptyState illustration={<EmptyStateIllustration {...args} />} heading="No deals yet">
      Create a lead and its deal appears here in New lead.
    </EmptyState>
  ),
};

/**
 * A search or filter that found nothing: the rows dim as the lens passes.
 * @summary no results after a search or filter
 */
export const NoResults: Story = {
  args: { variant: "search", plates: true },
  render: (args) => (
    <EmptyState
      illustration={<EmptyStateIllustration {...args} />}
      heading="No cars match these filters"
      action={{ content: "Clear filters", onAction: fn() }}
    >
      Remove a filter or change the search to see more cars.
    </EmptyState>
  ),
};

/**
 * A page the person can't open: the screen behind is frosted and locked.
 * @summary no access to a page
 */
export const NoAccess: Story = {
  args: { variant: "lock" },
  render: (args) => (
    <EmptyState illustration={<EmptyStateIllustration {...args} />} heading="You don't have access">
      Managing team permissions requires the Manage permissions capability.
    </EmptyState>
  ),
};

/**
 * Inside a dashboard card: `size="small"` with a compact EmptyState.
 * @summary small, inside a card
 */
export const InACard: Story = {
  args: { variant: "calendar", size: "small" },
  render: (args) => (
    <div style={{ maxWidth: 380 }}>
      <Card title="Appointments">
        <EmptyState compact illustration={<EmptyStateIllustration {...args} />} heading="No upcoming appointments" />
      </Card>
    </div>
  ),
};

/**
 * Every variant, one per kind of screen.
 * @summary all twelve variants
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {(["list", "kanban", "calendar", "gallery", "checklist", "timeline", "search", "lock", "notFound", "error", "chart", "detail"] as const).map((v) => (
        <div key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <EmptyStateIllustration variant={v} size="small" plates={v === "list"} />
          <span className="body-sm" style={{ color: "var(--text-secondary)" }}>{v}</span>
        </div>
      ))}
    </div>
  ),
};
