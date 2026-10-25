import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { OptionList, type OptionListProps } from "@/components/genaro";
import guidelines from "../docs/OptionList.md?raw";

/**
 * A list to pick one value (with a tick) or several (with checkboxes), usually
 * inside a `Popover`. To run an action, use an `ActionList`; for a choice in
 * a form, use `Select` or `ChoiceList`.
 */
const meta = {
  title: "Components/Overlays/OptionList",
  component: OptionList,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "Location",
    options: [
      { value: "forecourt", label: "Forecourt" },
      { value: "yard", label: "Yard" },
      { value: "garage", label: "Garage" },
      { value: "staff", label: "Staff" },
      { value: "courtesy-car", label: "Courtesy car" },
    ],
    selected: ["forecourt"],
    onChange: fn(),
  },
  // OptionList has no surface of its own; in the app the Popover supplies it.
  decorators: [
    (Story) => (
      <div
        style={{
          width: "16rem",
          background: "var(--bg-surface)",
          borderRadius: "var(--border-radius-popover)",
          boxShadow: "var(--shadow-300)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  // Controlled: the selection lives in the args, as it would in state.
  render: function OptionListStory(args) {
    const [, updateArgs] = useArgs<OptionListProps>();
    return (
      <OptionList
        {...args}
        onChange={(selected) => {
          args.onChange?.(selected);
          updateArgs({ selected });
        }}
      />
    );
  },
} satisfies Meta<typeof OptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pick one value, such as where a vehicle is. Picking another replaces the
 * choice; read it from `onChange`.
 * @summary pick one value
 */
export const Default: Story = {};

/**
 * Pick several values with checkboxes, such as fuel types to filter the
 * vehicle list by.
 * @summary pick several, with checkboxes
 */
export const MultipleChoice: Story = {
  args: {
    title: "Fuel type",
    allowMultiple: true,
    options: [
      { value: "petrol", label: "Petrol" },
      { value: "diesel", label: "Diesel" },
      { value: "hybrid", label: "Hybrid" },
      { value: "electric", label: "Electric" },
    ],
    selected: ["petrol", "hybrid"],
  },
};

/**
 * Longer lists in titled groups, such as people to assign a lead to. Use
 * `sections` instead of `title` and `options`.
 * @summary longer lists, in titled groups
 */
export const WithSections: Story = {
  args: {
    title: undefined,
    options: undefined,
    sections: [
      {
        title: "Sales",
        options: [
          { value: "amira", label: "Amira Hussain" },
          { value: "tom", label: "Tom Bradley" },
          { value: "chloe", label: "Chloe Evans" },
        ],
      },
      {
        title: "Managers",
        options: [{ value: "james", label: "James Whitfield" }],
      },
    ],
    selected: ["tom"],
  },
};

/**
 * An option that can't be picked right now stays in the list, greyed out,
 * such as a garage with no free bays.
 * @summary an option that can't be picked right now
 */
export const DisabledOption: Story = {
  args: {
    options: [
      { value: "forecourt", label: "Forecourt" },
      { value: "yard", label: "Yard" },
      { value: "garage", label: "Garage (full)", disabled: true },
      { value: "courtesy-car", label: "Courtesy car" },
    ],
  },
};

/**
 * Without `selected`, the list keeps its own choice, starting from
 * `defaultSelected`; `onChange` still reports every change.
 * @summary keeps its own choice from `defaultSelected`
 */
export const Uncontrolled: Story = {
  args: { selected: undefined, defaultSelected: ["yard"] },
  render: (args) => <OptionList {...args} />,
};
