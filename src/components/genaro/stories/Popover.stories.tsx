import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { ActionList, Button, OptionList, Popover, TextField, type PopoverProps } from "@/components/genaro";
import guidelines from "../docs/Popover.md?raw";

const dealActions = (
  <ActionList
    onActionAnyItem={fn()}
    items={[
      { content: "View deal", icon: "ViewMinor", onAction: fn() },
      { content: "Book appointment", icon: "ClockMinor", onAction: fn() },
      { content: "Change vehicle", icon: "EditMinor", onAction: fn() },
      { content: "Print invoice", icon: "PrintMajor", onAction: fn() },
    ]}
  />
);

/**
 * A small panel that opens from a button: a menu of actions, a picker or a
 * one-field form. It closes on Escape and on a click outside. For anything
 * that needs the person's full attention, use a `Modal`.
 */
const meta = {
  title: "Components/Overlays/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "480px" } },
  },
  args: {
    active: true,
    activator: "More actions",
    onClose: fn(),
    children: dealActions,
  },
  argTypes: {
    activator: { control: "text" },
    children: { control: false },
  },
  // Controlled: `active` lives in the args, as it would in state. Here the
  // `activator` arg is the label of the disclosure Button that toggles it.
  render: function PopoverStory(args) {
    const [, updateArgs] = useArgs<PopoverProps>();
    return (
      <Popover
        {...args}
        onClose={() => {
          args.onClose?.();
          updateArgs({ active: false });
        }}
        activator={
          <Button disclosure ariaExpanded={args.active} onClick={() => updateArgs({ active: !args.active })}>
            {args.activator}
          </Button>
        }
      />
    );
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A "More actions" menu for a record. Put an `ActionList` inside and close the
 * popover from its `onActionAnyItem`.
 * @summary a "More actions" menu
 */
export const Default: Story = {};

/**
 * A picker: the button shows the current choice and the panel lists the
 * others. Close it from the `OptionList`'s `onChange`.
 * @summary pick one value, such as a location
 */
export const WithOptionList: Story = {
  args: {
    activator: "Forecourt",
    children: (
      <OptionList
        title="Location"
        options={[
          { value: "forecourt", label: "Forecourt" },
          { value: "yard", label: "Yard" },
          { value: "garage", label: "Garage" },
          { value: "courtesy-car", label: "Courtesy car" },
        ]}
        defaultSelected={["forecourt"]}
        onChange={fn()}
      />
    ),
  },
};

/**
 * A one-field form, such as a quick note, in a padded panel. Anything longer
 * belongs in a `Modal`.
 * @summary a one-field form in a padded panel
 */
export const Sectioned: Story = {
  args: {
    activator: "Add note",
    sectioned: true,
    children: <TextField label="Note" placeholder="Wants to collect after 5pm" />,
  },
};

/**
 * Lines the panel up with the button's right edge, for actions at the end of
 * a row or a page header.
 * @summary actions at the end of a row or header
 */
export const AlignedRight: Story = {
  args: { preferredAlignment: "right" },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Opens upwards, for buttons near the bottom of the screen or a card, such as
 * a bulk-actions bar.
 * @summary opens upwards, near the bottom of the screen
 */
export const OpensAbove: Story = {
  args: { preferredPosition: "above" },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", alignItems: "flex-end", minHeight: "26rem" }}>
        <Story />
      </div>
    ),
  ],
};
