import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { RadioButton, type RadioButtonProps } from "@/components/genaro";
import guidelines from "../docs/RadioButton.md?raw";

/**
 * One option in a set where only one can be chosen; radios with the same
 * `name` form a group. Use it for custom radio layouts. For an ordinary titled
 * list of options, use ChoiceList, which renders the group and its legend.
 */
const meta = {
  title: "Components/Forms/RadioButton",
  component: RadioButton,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    name: "handover",
    value: "delivery",
    label: "Deliver to customer",
    checked: false,
    onChange: fn(),
  },
  argTypes: {
    label: { control: "text" },
    helpText: { control: "text" },
  },
  // The radio from args, after "Customer collects", in a fieldset with a
  // legend. Choosing either keeps `checked` in args.
  render: function Render(args) {
    const [, updateArgs] = useArgs<RadioButtonProps>();
    return (
      <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <legend className="body-md" style={{ paddingBottom: "var(--space-100)" }}>
          Handover
        </legend>
        <RadioButton
          name={args.name}
          value="collection"
          label="Customer collects"
          checked={!args.checked}
          onChange={() => updateArgs({ checked: false })}
        />
        <RadioButton
          {...args}
          onChange={(checked, id) => {
            updateArgs({ checked });
            args.onChange?.(checked, id);
          }}
        />
      </fieldset>
    );
  },
} satisfies Meta<typeof RadioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An option in a group, not chosen. Give every radio in a group the same
 * `name`, and start with one chosen.
 * @summary an option in a group, not chosen
 */
export const Default: Story = {};

/**
 * The chosen option. Choosing another radio in the group clears it.
 * @summary the chosen option in its group
 */
export const Checked: Story = {
  args: { checked: true },
};

/**
 * Help text spells out what choosing the option means, such as a fee.
 * @summary the consequence of a choice, under its label
 */
export const WithHelpText: Story = {
  args: { helpText: "We add a £95 delivery fee to the invoice." },
};

/**
 * An option that isn't available this time. Say why in the help text.
 * @summary options that aren't available this time
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    helpText: "No driver is free on the handover date.",
  },
};
