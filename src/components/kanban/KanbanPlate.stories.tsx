import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KanbanPlate } from "./kanban-card";
import guidelines from "./README.md?raw";

/**
 * The reg plate at the top of a Kanban card, passed as the card's `identity`.
 * Give it an `href` and it links to the vehicle; it never pushes the card
 * wider. Outside a Kanban card use `RegPlate`.
 */
const meta = {
  title: "App components/Kanban/KanbanPlate",
  component: KanbanPlate,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { registration: "OY70 TZG" },
} satisfies Meta<typeof KanbanPlate>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A plate that only names the vehicle, for a card whose record has no vehicle
 * page to open.
 * @summary names the vehicle without linking
 */
export const Default: Story = {};

/**
 * The usual plate: it opens the vehicle's page, and says so on hover. It
 * can't be dragged on its own, so a press on it still drags the card.
 * @summary opens the vehicle; the usual plate
 */
export const Linked: Story = {
  args: { href: "/vehicles/L-927", title: "Open vehicle" },
};

/**
 * In a slot narrower than the plate, it ellipses instead of widening the card.
 * @summary ellipses in a narrow slot
 */
export const Narrow: Story = {
  args: { registration: "WR22 FNM", href: "/vehicles/L-958", title: "Open vehicle" },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", width: "3.5rem" }}>
        <Story />
      </div>
    ),
  ],
};
