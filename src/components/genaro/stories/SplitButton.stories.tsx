import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SplitButton } from "@/components/genaro";
import guidelines from "../docs/SplitButton.md?raw";

/**
 * SplitButton pairs one obvious default action with a chevron menu of 1–4
 * variations, such as Save vehicle / Save as draft. For a menu of unrelated
 * actions use a Button with `disclosure` and a Popover with an ActionList.
 */
const meta = {
  title: "Components/Actions/SplitButton",
  component: SplitButton,
  tags: ["autodocs"],
  parameters: { guidelines },
  // Page headers put it top right, and its menu opens below, aligned right.
  decorators: [
    (Story) => (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          minHeight: "calc(var(--space-3200) + var(--space-400))",
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    children: "Save vehicle",
    onAction: fn(),
    actions: [
      { content: "Save as draft", icon: "NotesMinor", onAction: fn() },
      { content: "Save and add another", icon: "PlusMinor", onAction: fn() },
    ],
  },
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The view's main action with its variations behind the chevron. Primary by
 * default, so use it as the one primary action in a view.
 * @summary the main action plus its variations
 */
export const Default: Story = {};

/**
 * The chevron opens the menu below, aligned right. Escape, a click outside or
 * choosing an item closes it.
 * @summary the menu of variations, open
 */
export const MenuOpen: Story = {
  // Its own frame on the docs page, so opening another story's menu doesn't close this one.
  parameters: { docs: { story: { inline: false, height: "200px" } } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More actions" }));
  },
};

/**
 * Anywhere that isn't the view's main action, such as printing an invoice
 * with other documents in the menu.
 * @summary a split action that isn't the view's main one
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Print invoice",
    actions: [
      { content: "Print vehicle check sheet", url: "/vehicles/L-927/check-sheet" },
      { content: "Download invoice PDF", url: "/invoices/INV-2041.pdf" },
    ],
  },
};

/**
 * A destructive variation, such as discarding a draft advert, shows in the
 * critical tone in the menu.
 * @summary a destructive item in the menu
 */
export const DestructiveItem: Story = {
  args: {
    children: "Publish advert",
    actions: [
      { content: "Schedule advert", icon: "ClockMinor", onAction: fn() },
      { content: "Discard draft", icon: "DeleteMinor", destructive: true, onAction: fn() },
    ],
  },
  // Its own frame on the docs page, so opening another story's menu doesn't close this one.
  parameters: { docs: { story: { inline: false, height: "200px" } } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More actions" }));
  },
};

/**
 * Both halves are off while the action can't run, such as before a required
 * field is filled or while a save is in progress.
 * @summary both halves off while the action can't run
 */
export const Disabled: Story = {
  args: { disabled: true },
};
