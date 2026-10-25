import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DatePicker } from "@/components/genaro";
import guidelines from "../docs/DatePicker.md?raw";

/**
 * A month calendar for picking a day, such as a test drive, or a range of
 * days, such as a report period. Show the chosen date as text beside it, since
 * the day buttons only say the number.
 */
const meta = {
  title: "Components/Forms/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { selected: new Date(2026, 9, 29), month: 9, year: 2026, onChange: fn() },
  argTypes: {
    selected: { control: false },
    disableDatesBefore: { control: false },
    disableDatesAfter: { control: false },
  },
  // `selected`, `month` and `year` only set the starting state, so a new key
  // redraws the calendar when they change in Controls.
  render: (args) => (
    <DatePicker key={`${args.month}-${args.year}-${args.allowRange}-${args.multiMonth}`} {...args} />
  ),
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pick one day, such as the date of a test drive or a handover.
 * @summary one day
 */
export const Default: Story = {};

/**
 * Pick a start and an end day, such as the period for a sales report. The
 * range previews as you hover after the first click.
 * @summary a start and end day
 */
export const DateRange: Story = {
  args: { allowRange: true, selected: { start: new Date(2026, 9, 1), end: new Date(2026, 9, 14) } },
};

/**
 * Two months side by side, for ranges that often cross a month end.
 * @summary two months, for ranges across a month end
 */
export const MultiMonth: Story = {
  args: {
    allowRange: true,
    multiMonth: true,
    selected: { start: new Date(2026, 9, 20), end: new Date(2026, 10, 8) },
  },
};

/**
 * Block days that can't be chosen, such as past days for a new appointment.
 * The boundary day itself stays available.
 * @summary blocks impossible days, such as the past
 */
export const DisabledPastDates: Story = {
  args: { disableDatesBefore: new Date(2026, 9, 25) },
};

/**
 * The chosen day written out beside the calendar, so it can be read at a
 * glance and by screen readers.
 * @summary the chosen date shown as text
 */
export const WithDateText: Story = {
  render: function Render(args) {
    const [date, setDate] = React.useState(args.selected instanceof Date ? args.selected : new Date(2026, 9, 29));
    return (
      <div style={{ display: "grid", gap: "var(--space-300)", justifyItems: "start" }}>
        <DatePicker
          {...args}
          onChange={(range) => {
            setDate(range.start);
            args.onChange?.(range);
          }}
        />
        <p className="body-md" aria-live="polite">
          {`Test drive on ${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        </p>
      </div>
    );
  },
};
