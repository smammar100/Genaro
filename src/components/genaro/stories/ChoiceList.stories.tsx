import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { ChoiceList, type ChoiceListProps } from "@/components/genaro";
import guidelines from "../docs/ChoiceList.md?raw";

const channels = [
  { label: "Website", value: "website" },
  { label: "AutoTrader", value: "autotrader" },
  { label: "eBay Motors", value: "ebay" },
  { label: "Facebook Marketplace", value: "facebook" },
];

/**
 * A titled group of two to five options shown all at once: radios for one
 * choice, checkboxes with `allowMultiple`. With more options, use Select; for
 * a single on/off option, use Checkbox.
 */
const meta = {
  title: "Components/Forms/ChoiceList",
  component: ChoiceList,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "Payment method",
    name: "paymentMethod",
    choices: [
      { label: "Card", value: "card" },
      { label: "Bank transfer", value: "transfer" },
      { label: "Finance", value: "finance" },
    ],
    selected: ["transfer"],
    onChange: fn(),
  },
  argTypes: {
    title: { control: "text" },
    error: { control: "text" },
  },
  // Keeps the selection in args, so the list and Controls stay in step.
  render: function Render(args) {
    const [, updateArgs] = useArgs<ChoiceListProps>();
    return (
      <ChoiceList
        {...args}
        onChange={(selected, name) => {
          updateArgs({ selected });
          args.onChange?.(selected, name);
        }}
      />
    );
  },
} satisfies Meta<typeof ChoiceList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One choice from a few, all visible, such as how a customer pays. Start with
 * one option chosen.
 * @summary one choice from two to five, as radios
 */
export const Default: Story = {};

/**
 * Several choices from a few, such as where to advertise a vehicle.
 * `allowMultiple` switches the radios to checkboxes.
 * @summary several choices, as checkboxes
 */
export const AllowMultiple: Story = {
  args: {
    title: "Advertise on",
    name: "channels",
    allowMultiple: true,
    choices: channels,
    selected: ["website", "autotrader"],
  },
};

/**
 * Help text under a choice spells out what it means, such as a fee or a
 * timescale.
 * @summary the consequence of each choice, under its label
 */
export const WithHelpText: Story = {
  args: {
    title: "Handover",
    name: "handover",
    choices: [
      { label: "Customer collects", value: "collection", helpText: "From the forecourt, Monday to Saturday." },
      { label: "Deliver to customer", value: "delivery", helpText: "We add a £95 delivery fee to the invoice." },
    ],
    selected: ["collection"],
  },
};

/**
 * Nothing chosen where a choice is required. The message stands on its own,
 * since it isn't linked to the inputs.
 * @summary a required choice left empty, with an inline error
 */
export const WithError: Story = {
  args: {
    title: "Advertise on",
    name: "channels",
    allowMultiple: true,
    choices: channels,
    selected: [],
    error: "Choose at least one place to advertise",
  },
};

/**
 * A choice that isn't available yet. Say why in its help text.
 * @summary one choice unavailable, with the reason
 */
export const DisabledChoice: Story = {
  args: {
    title: "Advertise on",
    name: "channels",
    allowMultiple: true,
    choices: channels.map((c) =>
      c.value === "ebay" ? { ...c, disabled: true, helpText: "Connect eBay in settings first." } : c,
    ),
    selected: ["website"],
  },
};

/**
 * Inside a filter popover the pill already names the list, so hide the title.
 * Screen readers still read it.
 * @summary in filter popovers, where the pill names the list
 */
export const TitleHidden: Story = {
  args: {
    title: "Status",
    name: "status",
    titleHidden: true,
    allowMultiple: true,
    choices: [
      { label: "Ready", value: "ready" },
      { label: "Listed", value: "listed" },
      { label: "Reserved", value: "reserved" },
    ],
    selected: ["listed"],
  },
};
