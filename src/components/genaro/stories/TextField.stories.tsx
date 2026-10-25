import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button, TextField, type TextFieldProps } from "@/components/genaro";
import guidelines from "../docs/TextField.md?raw";

/**
 * A single- or multi-line text input with a label, help text and an inline
 * error. Use it for every free-text value, from a registration to advert
 * copy. To pick from a fixed list use Select or ChoiceList instead.
 */
const meta = {
  title: "Components/Forms/TextField",
  component: TextField,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { label: "Registration", value: "OY70 TZG", onChange: fn() },
  argTypes: {
    label: { control: "text" },
    helpText: { control: "text" },
    error: { control: "text" },
    prefix: { control: "text" },
    suffix: { control: "text" },
    connectedLeft: { control: false },
    connectedRight: { control: false },
  },
  // Keeps the typed value in args, so the field and Controls stay in step.
  render: function Render(args) {
    const [, updateArgs] = useArgs<TextFieldProps>();
    return (
      <TextField
        {...args}
        onChange={(value, id) => {
          updateArgs({ value });
          args.onChange?.(value, id);
        }}
        onClearButtonClick={(id) => {
          updateArgs({ value: "" });
          args.onClearButtonClick?.(id);
        }}
      />
    );
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Any free-text value. Always give it a label, even when it is hidden.
 * @summary a labelled text input
 */
export const Default: Story = {};

/**
 * Help text says what the value is for or what format it takes, under the
 * field.
 * @summary guidance under the field
 */
export const WithHelpText: Story = {
  args: {
    label: "Customer email",
    type: "email",
    autoComplete: "email",
    value: "james.walker@example.com",
    helpText: "We send the invoice and appointment reminders here.",
  },
};

/**
 * Prices take a "£" prefix and a decimal keyboard rather than a stepper.
 * @summary currency: a "£" prefix and decimal input
 */
export const WithPrefix: Story = {
  args: { label: "Asking price", prefix: "£", inputMode: "decimal", value: "16,419.00" },
};

/**
 * A suffix names the unit, such as miles, so people don't type it.
 * @summary units after the value ("miles")
 */
export const WithSuffix: Story = {
  args: { label: "Mileage", suffix: "miles", inputMode: "numeric", value: "48,210" },
};

/**
 * Small whole numbers people nudge up or down, such as the number of keys.
 * `type="number"` adds a stepper.
 * @summary small counts, with up and down steppers
 */
export const NumberWithStepper: Story = {
  args: { label: "Number of keys", type: "number", value: "2" },
};

/**
 * Longer text over several lines, such as notes on a vehicle's condition.
 * Pass a row count to size it to the content people usually write.
 * @summary several lines of text (notes, descriptions)
 */
export const Multiline: Story = {
  args: {
    label: "Condition notes",
    multiline: 4,
    value: "Small scuff on the rear bumper. Two keys. Full service history, last service at 45,000 miles.",
  },
};

/**
 * An invalid value. The message says what's wrong and how to fix it, with no
 * blame and no exclamation marks.
 * @summary an invalid value with an inline error
 */
export const WithError: Story = {
  args: {
    label: "Customer email",
    type: "email",
    value: "james.walker@",
    error: "Enter a valid email address",
  },
};

/**
 * A search box: a hidden label, a search icon and a clear button. The clear
 * button calls `onClearButtonClick`, not `onChange`.
 * @summary search with an icon and a clear button
 */
export const Search: Story = {
  args: {
    label: "Search vehicles",
    labelHidden: true,
    prefix: "SearchMinor",
    placeholder: "Search by reg, stock ID or make",
    clearButton: true,
    onClearButtonClick: fn(),
    value: "BMW",
  },
};

/**
 * Mark fields a form can't be saved without. The asterisk doesn't set
 * `required`; pass that too.
 * @summary required fields, marked with an asterisk
 */
export const Required: Story = {
  args: { label: "Customer name", requiredIndicator: true, required: true, value: "" },
};

/**
 * An action beside the label that works on the field, such as writing an
 * advert description for you.
 * @summary a plain action beside the label
 */
export const WithLabelAction: Story = {
  args: {
    label: "Advert description",
    multiline: 3,
    labelAction: { content: "Write description", onAction: fn() },
    value: "",
  },
};

/**
 * A button on the same row that acts on the value, such as looking up a car
 * from its registration.
 * @summary a button joined to the field
 */
export const WithConnectedButton: Story = {
  args: {
    connectedRight: <Button onClick={fn()}>Look up vehicle</Button>,
  },
};

/**
 * A value people can read and copy but not change, such as a stock ID the
 * system assigns.
 * @summary values people can copy but not change
 */
export const ReadOnly: Story = {
  args: {
    label: "Stock ID",
    value: "L-927",
    readOnly: true,
    helpText: "Assigned when the vehicle arrives.",
  },
};

/**
 * A field that doesn't apply yet. Say in the help text when it will.
 * @summary fields that don't apply yet
 */
export const Disabled: Story = {
  args: {
    label: "Deposit",
    prefix: "£",
    value: "",
    disabled: true,
    helpText: "Available once the customer has reserved the vehicle.",
  },
};
