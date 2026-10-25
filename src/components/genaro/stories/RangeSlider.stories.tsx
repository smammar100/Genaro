import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { RangeSlider, type RangeSliderProps, type RangeSliderValue } from "@/components/genaro";
import guidelines from "../docs/RangeSlider.md?raw";

const pounds = (n: number) => `£${n.toLocaleString("en-GB")}`;

/** Keeps the dragged value in args, so the slider and its affixes move together. */
function useValueArg(args: RangeSliderProps) {
  const [, updateArgs] = useArgs<RangeSliderProps>();
  return (value: RangeSliderValue) => {
    updateArgs({ value });
    args.onChange?.(value);
  };
}

/**
 * Picks an approximate number, or a low–high range with two thumbs, by
 * dragging along a track: a deposit percentage, a price range. Show the
 * current value beside it. When the exact figure matters, use a TextField.
 */
const meta = {
  title: "Components/Forms/RangeSlider",
  component: RangeSlider,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { label: "Deposit", min: 0, max: 50, step: 5, value: 10, onChange: fn() },
  argTypes: {
    helpText: { control: "text" },
    prefix: { control: false },
    suffix: { control: false },
  },
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An approximate value people drag to, such as a deposit as a share of the
 * price. The suffix shows the current value.
 * @summary one value, shown in the suffix
 */
export const Default: Story = {
  render: function Render(args) {
    const onChange = useValueArg(args);
    return <RangeSlider {...args} suffix={`${args.value}%`} onChange={onChange} />;
  },
};

/**
 * A low and a high value, such as a price range for a lead's search. Pass
 * `[low, high]`; the prefix and suffix show both ends.
 * @summary a low–high range with two thumbs
 */
export const PriceRange: Story = {
  args: { label: "Price is between", min: 0, max: 40000, step: 500, value: [8000, 20000] },
  render: function Render(args) {
    const onChange = useValueArg(args);
    const [low, high] = Array.isArray(args.value) ? args.value : [args.min ?? 0, args.value ?? 0];
    return <RangeSlider {...args} prefix={pounds(low)} suffix={pounds(high)} onChange={onChange} />;
  },
};

/**
 * Help text says what the value affects.
 * @summary what the value affects, under the track
 */
export const WithHelpText: Story = {
  args: {
    label: "Maximum mileage",
    min: 0,
    max: 150000,
    step: 5000,
    value: 60000,
    helpText: "Vehicles over this mileage go to auction rather than the forecourt.",
  },
  render: function Render(args) {
    const onChange = useValueArg(args);
    return <RangeSlider {...args} suffix={`${Number(args.value).toLocaleString("en-GB")} miles`} onChange={onChange} />;
  },
};

/**
 * A value that can't change here. Say why in the help text.
 * @summary values that can't change here
 */
export const Disabled: Story = {
  args: { disabled: true, helpText: "Finance deals set the deposit with the lender." },
  render: function Render(args) {
    const onChange = useValueArg(args);
    return <RangeSlider {...args} suffix={`${args.value}%`} onChange={onChange} />;
  },
};
