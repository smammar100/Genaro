import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ActionMenu, Button, Card } from "@/components/genaro";
import guidelines from "../docs/ActionMenu.md?raw";

/**
 * A button that opens a menu of actions: a record's "More actions", or the
 * three-dot menu at the end of a row or a card. It closes on a choice,
 * Escape or a click outside. For one action, use a `Button`; to pick a
 * value, a `Select`; for a main action with alternatives, a `SplitButton`.
 */
const meta = {
  title: "Components/Overlays/ActionMenu",
  component: ActionMenu,
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "520px" } },
  },
  args: {
    defaultOpen: true,
    label: "More actions",
    items: [
      { content: "View deal", onAction: fn() },
      { content: "Book appointment", onAction: fn() },
      { content: "Change vehicle", onAction: fn() },
      { content: "Generate invoice", onAction: fn() },
    ],
  },
  argTypes: {
    items: { control: false },
    sections: { control: false },
    renderActivator: { control: false },
  },
} satisfies Meta<typeof ActionMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A record's other actions behind one "More actions" button, such as a
 * deal's, so the page keeps one primary button.
 * @summary a record's other actions, behind one button
 */
export const Default: Story = {};

/**
 * The three-dot menu at the end of a row or a card, such as a pipeline
 * deal's. Icon-only, so its label names the record, and lined up with the
 * row's right edge.
 * @summary the three-dot menu at the end of a row
 */
export const IconOnly: Story = {
  args: {
    label: undefined,
    accessibilityLabel: "Deal actions for Priya Shah",
    size: "micro",
    preferredAlignment: "right",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "22rem", marginLeft: "auto" }}>
        <Card
          title="Priya Shah"
          actions={<Story />}
        >
          <p className="body-md">
            <span className="font-code">OY70 TZG</span> · Ford Fiesta · £16,419.00
          </p>
        </Card>
      </div>
    ),
  ],
};

/**
 * Icons help people find an action in a longer menu; use them on every
 * item or none.
 * @summary leading icons for quicker scanning
 */
export const WithIcons: Story = {
  args: {
    items: [
      { content: "View deal", icon: "ViewMinor", onAction: fn() },
      { content: "Book appointment", icon: "ClockMinor", onAction: fn() },
      { content: "Change vehicle", icon: "EditMinor", onAction: fn() },
      { content: "Generate invoice", icon: "OrdersMinor", onAction: fn() },
    ],
  },
};

/**
 * Titled groups for a longer menu, divided by a rule, such as a deal's
 * actions and its vehicle's.
 * @summary a longer menu, in titled groups
 */
export const WithSections: Story = {
  args: {
    items: undefined,
    sections: [
      {
        title: "Deal",
        items: [
          { content: "View deal", onAction: fn() },
          { content: "Book appointment", onAction: fn() },
        ],
      },
      {
        title: "Vehicle",
        items: [
          { content: "View vehicle", onAction: fn() },
          { content: "Change vehicle", onAction: fn() },
        ],
      },
    ],
  },
};

/**
 * An action that deletes goes last, in a group of its own and in red, such
 * as deleting a maintenance job. Confirm it with `useConfirm` before it runs.
 * @summary a destructive action, last and in red
 */
export const Destructive: Story = {
  args: {
    label: undefined,
    accessibilityLabel: "Job actions for OY70 TZG",
    size: "micro",
    items: undefined,
    sections: [
      {
        items: [
          { content: "Book appointment", icon: "ClockMinor", onAction: fn() },
          { content: "Edit job", icon: "EditMinor", onAction: fn() },
        ],
      },
      { items: [{ content: "Delete job", icon: "DeleteMinor", destructive: true, onAction: fn() }] },
    ],
  },
};

/**
 * An action that isn't available yet stays in the menu, with help text
 * saying why, such as invoicing before a deposit is taken.
 * @summary unavailable for now, and says why
 */
export const DisabledItem: Story = {
  args: {
    items: [
      { content: "View deal", onAction: fn() },
      { content: "Generate invoice", disabled: true, helpText: "Take a deposit first" },
    ],
  },
};

/**
 * Items with a `url` are links: they navigate client-side, open in a new
 * tab on a middle-click, and need no handler, so the menu also renders
 * from a Server Component.
 * @summary items that go to another page
 */
export const Links: Story = {
  args: {
    items: [
      { content: "View vehicle", icon: "ViewMinor", url: "/vehicles/L-927" },
      { content: "View master sheet", icon: "OrdersMinor", url: "/admin/master-sheet" },
    ],
  },
};

/**
 * Opens upwards, for buttons near the bottom of the screen or a card, such
 * as a bulk-actions bar.
 * @summary opens upwards, near the bottom of the screen
 */
export const OpensAbove: Story = {
  args: { preferredPosition: "above" },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", alignItems: "flex-end", minHeight: "28rem" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Your own activator when the menu opens from something other than the
 * standard button, such as a customer's name. Spread the props it gets onto
 * a focusable element.
 * @summary opens from an element of your own
 */
export const CustomActivator: Story = {
  args: {
    label: undefined,
    renderActivator: ({ onClick, open, id, menuId }) => (
      <Button id={id} variant="plain" disclosure ariaExpanded={open} ariaControls={menuId} onClick={onClick}>
        Priya Shah
      </Button>
    ),
    items: [
      { content: "Call customer", onAction: fn() },
      { content: "Email customer", onAction: fn() },
      { content: "View lead", url: "/leads/priya-shah" },
    ],
  },
};
