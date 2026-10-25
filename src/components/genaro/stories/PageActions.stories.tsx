import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PageActions } from "@/components/genaro";
import guidelines from "../docs/PageActions.md?raw";

/**
 * PageActions is the row at the bottom of a detail page: the primary action on
 * the right, a destructive one on the left. Use it to repeat Save at the end
 * of long forms; for buttons inside a card or a form footer use ButtonGroup.
 */
const meta = {
  title: "Components/Actions/PageActions",
  component: PageActions,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    primaryAction: { content: "Save vehicle", onAction: fn() },
    secondaryActions: [{ content: "Delete vehicle", destructive: true, onAction: fn() }],
  },
} satisfies Meta<typeof PageActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The end of a long detail form: Save on the right, and the one destructive
 * action, confirmed in a Modal, on the left.
 * @summary Save on the right, Delete on the left
 */
export const Default: Story = {};

/**
 * Settings and forms with nothing to delete only repeat the primary action,
 * which sits on the right on its own.
 * @summary just the primary action, on the right
 */
export const PrimaryOnly: Story = {
  args: { primaryAction: { content: "Save settings", onAction: fn() }, secondaryActions: undefined },
};

/**
 * While the save runs, the primary button shows a spinner and ignores clicks,
 * so the form can't be sent twice.
 * @summary a save in progress
 */
export const Saving: Story = {
  args: { primaryAction: { content: "Save vehicle", loading: true, onAction: fn() } },
};

/**
 * Save stays off until something changes, and Delete while the vehicle is on
 * an open deal.
 * @summary actions that aren't available yet
 */
export const Disabled: Story = {
  args: {
    primaryAction: { content: "Save vehicle", disabled: true, onAction: fn() },
    secondaryActions: [{ content: "Delete vehicle", destructive: true, disabled: true, onAction: fn() }],
  },
};

/**
 * Actions that move to another page, such as taking payment for an invoice.
 * `url` actions work from a Server Component.
 * @summary actions that navigate, from Server Components
 */
export const Navigation: Story = {
  args: {
    primaryAction: { content: "Record payment", url: "/invoices/INV-2041/payment" },
    secondaryActions: [{ content: "Email invoice", url: "/invoices/INV-2041/email" }],
  },
};
