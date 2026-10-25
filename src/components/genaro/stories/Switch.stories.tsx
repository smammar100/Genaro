import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Switch, type SwitchProps } from "@/components/genaro";
import guidelines from "../docs/Switch.md?raw";

/**
 * An on/off toggle for a setting that applies the moment it flips, such as
 * publishing a vehicle to AutoTrader. For an option saved with a form's
 * submit button use Checkbox; for one important setting with an
 * explanation, SettingToggle.
 */
const meta = {
  title: "Components/Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { label: "Publish to AutoTrader", checked: true, onChange: fn() },
  argTypes: {
    label: { control: "text" },
    helpText: { control: "text" },
    error: { control: "text" },
  },
  // Keeps the state in args, so the switch and Controls stay in step.
  render: function Render(args) {
    const [, updateArgs] = useArgs<SwitchProps>();
    return (
      <Switch
        {...args}
        onChange={(checked, id) => {
          updateArgs({ checked });
          args.onChange?.(checked, id);
        }}
      />
    );
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A setting that applies at once, with no save button. The label says what's
 * on when the switch is on.
 * @summary a setting that applies at once
 */
export const Default: Story = {};

/**
 * Help text says what turning it on does, under the label.
 * @summary what the setting does, under the label
 */
export const WithHelpText: Story = {
  args: {
    label: "Background processing",
    checked: false,
    helpText: "Removes the background from new photos and adds the forecourt backdrop.",
  },
};

/**
 * A settings row: the label and help text on the left, the switch at the far
 * right, so a column of settings lines up.
 * @summary a settings row with the switch on the right
 */
export const SettingsRow: Story = {
  args: {
    label: "Flag as customer complaint",
    checked: false,
    labelPosition: "start",
    helpText: "Escalates the SLA and marks the claim red in the claims list.",
  },
};

/**
 * In a table cell or a row that already names the setting, hide the label but
 * keep it specific for screen readers.
 * @summary a switch in a table cell, named by a hidden label
 */
export const LabelHidden: Story = {
  args: { label: "Publish OY70 TZG to AutoTrader", labelHidden: true },
};

/**
 * The setting can't apply as it stands. The message says how to fix it.
 * @summary a setting that can't apply, with an inline error
 */
export const WithError: Story = {
  args: {
    label: "Publish to AutoTrader",
    checked: false,
    error: "Add at least 10 photos before publishing to AutoTrader",
  },
};

/**
 * A setting that isn't available yet. Say in the help text what unlocks it.
 * @summary settings that aren't available yet
 */
export const Disabled: Story = {
  args: {
    label: "Publish to eBay Motors",
    checked: false,
    disabled: true,
    helpText: "Connect your eBay account in Settings first.",
  },
};
