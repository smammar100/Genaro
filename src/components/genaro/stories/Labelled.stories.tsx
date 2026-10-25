import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Labelled } from "@/components/genaro";
import guidelines from "../docs/Labelled.md?raw";

/**
 * The label, help text and error around a field, as TextField and Select use
 * it. Wrap a custom control in it, such as a native date input, so it matches
 * the other fields. For ordinary text or choices, use TextField or Select.
 */
const meta = {
  title: "Components/Forms/Labelled",
  component: Labelled,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    id: "first-registered",
    label: "Date first registered",
    helpText: "As shown on the V5C.",
  },
  argTypes: {
    label: { control: "text" },
    helpText: { control: "text" },
    error: { control: "text" },
    children: { control: false },
  },
  // A native date input with the TextField look. Its id matches Labelled's,
  // and it points aria-describedby at the error or the help text.
  render: (args) => (
    <Labelled {...args}>
      <div className={args.error ? "p-field p-field--error" : "p-field"}>
        <input
          id={args.id}
          name="firstRegistered"
          type="date"
          className="p-field__input"
          defaultValue={args.error ? "" : "2020-09-14"}
          aria-invalid={args.error ? true : undefined}
          aria-describedby={args.error ? `${args.id}-error` : args.helpText ? `${args.id}-help` : undefined}
        />
      </div>
    </Labelled>
  ),
} satisfies Meta<typeof Labelled>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A custom control with the standard label and help text, such as a native
 * date input. Give the control the same `id`.
 * @summary wraps a custom control; ids must match
 */
export const Default: Story = {};

/**
 * An inline error above the help text. Mark your control invalid yourself,
 * and point its aria-describedby at `${id}-error`.
 * @summary an inline error; you mark the control invalid
 */
export const WithError: Story = {
  args: { error: "Enter the date the vehicle was first registered" },
};

/**
 * Mark a control a form can't be saved without with an asterisk after the
 * label.
 * @summary required controls, marked with an asterisk
 */
export const RequiredIndicator: Story = {
  args: { requiredIndicator: true },
};

/**
 * A plain action on the right of the label row that works on the control,
 * such as clearing it.
 * @summary an action beside the label
 */
export const WithLabelAction: Story = {
  args: { labelAction: { content: "Clear date", onAction: fn() } },
};

/**
 * Hide the label when the context already names the control. Screen readers
 * still read it.
 * @summary label kept for screen readers only
 */
export const LabelHidden: Story = {
  args: { labelHidden: true, helpText: undefined },
};
