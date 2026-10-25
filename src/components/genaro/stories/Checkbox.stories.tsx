import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Checkbox, type CheckboxProps } from "@/components/genaro";
import guidelines from "../docs/Checkbox.md?raw";

/**
 * Turns one independent option on or off in a form, such as showing a vehicle
 * on the website. For a titled group of options use ChoiceList; for a setting
 * that takes effect straight away use SettingToggle.
 */
const meta = {
  title: "Components/Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { label: "Show on the website", checked: false, onChange: fn() },
  argTypes: {
    label: { control: "text" },
    helpText: { control: "text" },
    error: { control: "text" },
    checked: { control: "inline-radio", options: [false, true, "indeterminate"] },
  },
  // Keeps the ticked state in args, so the box and Controls stay in step.
  render: function Render(args) {
    const [, updateArgs] = useArgs<CheckboxProps>();
    return (
      <Checkbox
        {...args}
        onChange={(checked, id) => {
          updateArgs({ checked });
          args.onChange?.(checked, id);
        }}
      />
    );
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One option people turn on or off. Write the label as a positive statement.
 * @summary an independent on/off option
 */
export const Default: Story = {};

/**
 * An option that is on, such as a vehicle already shown on the website.
 * @summary an option that is on
 */
export const Checked: Story = {
  args: { checked: true },
};

/**
 * Help text says what turning the option on does.
 * @summary what the option does, under the label
 */
export const WithHelpText: Story = {
  args: {
    label: "Send appointment reminders",
    helpText: "Texts the customer the day before their test drive.",
    checked: true,
  },
};

/**
 * A parent box whose items are partly selected, such as "Select all" when some
 * vehicles are ticked. Clicking it reports `true`.
 * @summary "select all" when only some items are selected
 */
export const Indeterminate: Story = {
  args: { label: "Select all vehicles", checked: "indeterminate" },
};

/**
 * A box that must be ticked before the form can be saved. The message says
 * what to do.
 * @summary a required box left unticked, with an inline error
 */
export const WithError: Story = {
  args: {
    label: "I've checked the V5C matches the vehicle",
    error: "Check the V5C before you list the vehicle",
  },
};

/**
 * An option that doesn't apply to this record. Say why in the help text.
 * @summary options that don't apply here
 */
export const Disabled: Story = {
  args: {
    label: "Price includes VAT",
    disabled: true,
    helpText: "Margin scheme vehicles don't show VAT.",
  },
};
