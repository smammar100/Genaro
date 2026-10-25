import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ActionList } from "@/components/genaro";
import guidelines from "../docs/ActionList.md?raw";

/**
 * A menu of actions, such as a record's "More actions", shown inside a
 * `Popover`. Labels are a verb and a noun. To pick a value rather than run an
 * action, use an `OptionList`.
 */
const meta = {
  title: "Components/Overlays/ActionList",
  component: ActionList,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    onActionAnyItem: fn(),
    items: [
      { content: "View deal", onAction: fn() },
      { content: "Book appointment", onAction: fn() },
      { content: "Change vehicle", onAction: fn() },
    ],
  },
  // ActionList has no surface of its own; in the app the Popover supplies it.
  decorators: [
    (Story) => (
      <div
        style={{
          width: "16rem",
          background: "var(--bg-surface)",
          borderRadius: "var(--border-radius-popover)",
          boxShadow: "var(--shadow-300)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A record's actions as a plain list. Close the popover from
 * `onActionAnyItem`, which runs after any item.
 * @summary a record's actions, as a plain list
 */
export const Default: Story = {};

/**
 * Icons help people find an action in a longer menu; use them on every item
 * or none.
 * @summary leading icons for quicker scanning
 */
export const WithIcons: Story = {
  args: {
    items: [
      { content: "View deal", icon: "ViewMinor", onAction: fn() },
      { content: "Book appointment", icon: "ClockMinor", onAction: fn() },
      { content: "Change vehicle", icon: "EditMinor", onAction: fn() },
      { content: "Print invoice", icon: "PrintMajor", onAction: fn() },
    ],
  },
};

/**
 * Titled groups for longer menus, divided by a rule, such as the deal's
 * actions and the vehicle's. `sections` wins over `items`.
 * @summary longer menus, in titled groups
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
 * Actions that delete or can't be undone are red. Put them last, and confirm
 * them in a `Modal`.
 * @summary destructive actions, last and in red
 */
export const Destructive: Story = {
  args: {
    items: [
      { content: "View lead", icon: "ViewMinor", onAction: fn() },
      { content: "Edit lead", icon: "EditMinor", onAction: fn() },
      { content: "Delete lead", icon: "DeleteMinor", destructive: true, onAction: fn() },
    ],
  },
};

/**
 * A second line says what an action will do before anyone picks it.
 * @summary a second line that explains the action
 */
export const WithHelpText: Story = {
  args: {
    items: [
      { content: "Generate invoice", helpText: "Uses the agreed price, £16,419.00", onAction: fn() },
      { content: "Book appointment", helpText: "Test drive or collection", onAction: fn() },
    ],
  },
};

/**
 * Marks the current choice when the menu moves something between states,
 * such as where a vehicle is parked.
 * @summary marks the current choice
 */
export const ActiveItem: Story = {
  args: {
    items: [
      { content: "Forecourt", active: true, suffix: "TickMinor", onAction: fn() },
      { content: "Yard", onAction: fn() },
      { content: "Garage", onAction: fn() },
    ],
  },
};

/**
 * An action that isn't available yet, with help text saying why, such as
 * invoicing before a deposit is taken.
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
 * Items with a `url` are links, so they navigate client-side and open in a
 * new tab on a middle-click.
 * @summary items that go to another page
 */
export const Links: Story = {
  args: {
    items: [
      { content: "View vehicle", url: "/vehicles/L-927" },
      { content: "View master sheet", url: "/admin/master-sheet" },
    ],
  },
};
