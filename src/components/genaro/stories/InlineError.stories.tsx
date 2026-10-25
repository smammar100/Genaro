import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, ButtonGroup, InlineError } from "@/components/genaro";
import guidelines from "../docs/InlineError.md?raw";

/**
 * InlineError is a one-line validation message that says what's wrong and how
 * to fix it. TextField, Select, Checkbox, ChoiceList and DropZone render it
 * from their `error` prop; use it directly only under custom controls.
 */
const meta = {
  title: "Components/Forms/InlineError",
  component: InlineError,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { message: "Enter a registration, such as OY70 TZG" },
  argTypes: {
    message: { control: "text" },
  },
} satisfies Meta<typeof InlineError>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A field's error after someone has had a chance to act (on blur or submit):
 * what's wrong and how to fix it, without blame.
 * @summary what's wrong with a field and how to fix it
 */
export const Default: Story = {};

/**
 * Under a custom control with no `error` prop, such as a row of time slots.
 * Give it an `id` and point the group's `aria-describedby` at it.
 * @summary under custom controls, linked by aria-describedby
 */
export const UnderCustomControl: Story = {
  args: {
    id: "appointment-time-error",
    message: "Choose a time between 09:00 and 17:00 on Saturday 31 October",
  },
  render: (args) => (
    <div
      role="group"
      aria-label="Appointment time"
      aria-describedby={args.id}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-100)" }}
    >
      <ButtonGroup variant="segmented">
        <Button>08:30</Button>
        <Button>10:00</Button>
        <Button>11:30</Button>
      </ButtonGroup>
      <InlineError {...args} />
    </div>
  ),
};

/**
 * Long messages wrap beside the icon rather than truncate, so the whole fix
 * stays readable in narrow forms.
 * @summary long messages wrap in narrow forms
 */
export const LongMessage: Story = {
  args: {
    message: "Enter the mileage from the odometer. It can't be lower than the 28,412 miles recorded at the last MOT.",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "320px" }}>
        <Story />
      </div>
    ),
  ],
};
