import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, ButtonGroup } from "@/components/genaro";
import guidelines from "../docs/ButtonGroup.md?raw";

/**
 * ButtonGroup lays out related buttons 8px apart, or joins them into one
 * segmented control. Put the primary action last (right-most). For a page's
 * closing Save / Delete row use PageActions; for mixed content use a flex row.
 */
const meta = {
  title: "Components/Actions/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
  parameters: { guidelines },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Related actions side by side, such as a form footer: Cancel first, the
 * primary action last.
 * @summary a row of related actions, primary last
 */
export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button url="/vehicles/L-927">Cancel</Button>
      <Button variant="primary" submit>
        Save vehicle
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Mutually exclusive options, such as the calendar's day, week and month
 * views. The active option is the `pressed` Button.
 * @summary toggles where one option is on, like Day / Week / Month
 */
export const Segmented: Story = {
  args: { variant: "segmented" },
  render: function Render(args) {
    const [range, setRange] = React.useState<"day" | "week" | "month">("week");
    return (
      <ButtonGroup {...args}>
        <Button pressed={range === "day"} onClick={() => setRange("day")}>
          Day
        </Button>
        <Button pressed={range === "week"} onClick={() => setRange("week")}>
          Week
        </Button>
        <Button pressed={range === "month"} onClick={() => setRange("month")}>
          Month
        </Button>
      </ButtonGroup>
    );
  },
};

/**
 * Rows of icon-only buttons, such as a vehicle's toolbar, sit 4px apart. Each
 * button needs its own `accessibilityLabel`.
 * @summary icon-only toolbars, 4px apart
 */
export const TightGap: Story = {
  args: { gap: "tight" },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button icon="PrintMajor" accessibilityLabel="Print vehicle check sheet" url="/vehicles/L-927/print" />
      <Button icon="DuplicateMinor" accessibilityLabel="Duplicate vehicle" url="/vehicles/new?duplicate=L-927" />
      <Button icon="EditMinor" accessibilityLabel="Edit vehicle" url="/vehicles/L-927/edit" />
    </ButtonGroup>
  ),
};

/**
 * Buttons that share the row's width, for narrow panels and phones, such as
 * accepting or declining a part-exchange offer.
 * @summary buttons that stretch across narrow panels
 */
export const FullWidth: Story = {
  args: { fullWidth: true },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "360px" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Decline offer</Button>
      <Button variant="primary">
        Accept offer
      </Button>
    </ButtonGroup>
  ),
};
