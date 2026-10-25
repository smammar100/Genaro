import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Avatar, Select, type SelectProps } from "@/components/genaro";
import guidelines from "../docs/Select.md?raw";

const salespeople = ["Daniel Okafor", "Hannah Price", "Marcus Bell", "Ellie Ward"];

/**
 * A field that opens a list to choose one option from four or more, such as a
 * vehicle's location or a lead's salesperson. With fewer options, show them
 * all with ChoiceList; to choose several, use ChoiceList with allowMultiple.
 */
const meta = {
  title: "Components/Forms/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    label: "Location",
    options: ["Forecourt", "Yard", "Garage", "Staff", "Courtesy car"],
    value: "Forecourt",
    onChange: fn(),
  },
  argTypes: {
    helpText: { control: "text" },
    error: { control: "text" },
  },
  // Keeps the chosen value in args, so the field and Controls stay in step.
  render: function Render(args) {
    const [, updateArgs] = useArgs<SelectProps>();
    return (
      <Select
        {...args}
        onChange={(value, id) => {
          updateArgs({ value });
          args.onChange?.(value, id);
        }}
      />
    );
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Choose one of four or more options, such as where a vehicle is parked.
 * @summary one choice from four or more options
 */
export const Default: Story = {};

/**
 * No choice made yet, such as a new vehicle's make. The placeholder shows
 * while the value is `''` and can't be picked again.
 * @summary nothing chosen yet; value starts as ''
 */
export const WithPlaceholder: Story = {
  args: {
    label: "Make",
    placeholder: "Select a make",
    options: ["Audi", "BMW", "Ford", "Kia", "Mercedes-Benz", "Nissan", "Toyota", "Volkswagen"],
    value: "",
  },
};

/**
 * Sort and filter bars put the label inside the control ("Sort by Newest")
 * to save room.
 * @summary sort and filter bars; label inside the control
 */
export const InlineLabel: Story = {
  args: {
    label: "Sort by",
    labelInline: true,
    options: [
      { label: "Newest", value: "newest" },
      { label: "Oldest", value: "oldest" },
      { label: "Most days in stock", value: "days-desc" },
      { label: "Fewest days in stock", value: "days-asc" },
    ],
    value: "newest",
  },
};

/**
 * Help text says where the value comes from or what it affects.
 * @summary guidance under the field
 */
export const WithHelpText: Story = {
  args: {
    label: "Fuel type",
    options: ["Petrol", "Diesel", "Hybrid", "Plug-in hybrid", "Electric"],
    value: "Diesel",
    helpText: "As shown on the V5C.",
  },
};

/**
 * A required choice left empty. The message says what to choose.
 * @summary a missing or invalid choice with an inline error
 */
export const WithError: Story = {
  args: {
    label: "Salesperson",
    placeholder: "Select a salesperson",
    options: salespeople,
    value: "",
    error: "Choose a salesperson for this lead",
  },
};

/**
 * Options that are people can show their avatar, in the list and in the field
 * once chosen.
 * @summary an avatar or icon before each option
 */
export const WithMedia: Story = {
  args: {
    label: "Salesperson",
    options: salespeople.map((name) => ({
      label: name,
      value: name.split(" ")[0].toLowerCase(),
      media: <Avatar name={name} size="xs" />,
    })),
    value: "hannah",
  },
  argTypes: { options: { control: false } },
};

/**
 * Options that exist but can't be chosen here, such as Sold, which is set from
 * the invoice. Say where it can be set in the help text.
 * @summary options shown but not available here
 */
export const DisabledOptions: Story = {
  args: {
    label: "Status",
    options: [
      { label: "Received", value: "received" },
      { label: "Being prepared", value: "being_prepared" },
      { label: "Ready", value: "ready" },
      { label: "Listed", value: "listed" },
      { label: "Reserved", value: "reserved" },
      { label: "Sold", value: "sold", disabled: true },
    ],
    value: "listed",
    helpText: "Mark a vehicle as sold from its invoice.",
  },
};

/**
 * A choice that can't change right now. Say why in the help text.
 * @summary choices that can't change right now
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    helpText: "Reserved vehicles stay on the forecourt until handover.",
  },
};
