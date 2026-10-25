import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Card, Tabs, type TabsProps } from "@/components/genaro";
import guidelines from "../docs/Tabs.md?raw";

/**
 * Tabs switch between views of the same content, such as the vehicle list by
 * location. Keep labels to a word or two. To move between areas of the app,
 * use `Navigation`; inside an `IndexTable`, pass its own `tabs` prop.
 */
const meta = {
  title: "Components/App chrome and navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    tabs: [
      { id: "all", content: "All" },
      { id: "forecourt", content: "Forecourt" },
      { id: "yard", content: "Yard" },
      { id: "garage", content: "Garage" },
      { id: "courtesy-car", content: "Courtesy car" },
      { id: "sold", content: "Sold" },
    ],
    selected: 0,
    onSelect: fn(),
  },
  // Controlled: the selected tab lives in the args, as it would in state.
  render: function TabsStory(args) {
    const [, updateArgs] = useArgs<TabsProps>();
    return (
      <Tabs
        {...args}
        onSelect={(index) => {
          args.onSelect?.(index);
          updateArgs({ selected: index });
        }}
      />
    );
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Views of one list, here the vehicles by where they are. The selected tab is
 * filled; the rest are brand-coloured text.
 * @summary views of one list
 */
export const Default: Story = {};

/**
 * A count on each tab says how much is in each view before anyone clicks it.
 * @summary a count per view ("Forecourt 42")
 */
export const WithCounts: Story = {
  args: {
    tabs: [
      { id: "all", content: "All", badge: 96 },
      { id: "forecourt", content: "Forecourt", badge: 42 },
      { id: "yard", content: "Yard", badge: 18 },
      { id: "garage", content: "Garage", badge: 9 },
      { id: "courtesy-car", content: "Courtesy car", badge: 3 },
      { id: "sold", content: "Sold", badge: 24 },
    ],
  },
};

/**
 * Tabs that share a card's width equally, for switching what a card shows.
 * @summary equal-width tabs inside a card
 */
export const Fitted: Story = {
  args: {
    fitted: true,
    tabs: [
      { id: "leads", content: "Leads" },
      { id: "appointments", content: "Appointments" },
      { id: "sales", content: "Sales" },
    ],
  },
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
};

/**
 * A chevron on the selected saved view, where its actions (rename, duplicate)
 * will live. It's only the chevron: wire the menu yourself.
 * @summary a chevron for saved-view actions
 */
export const SavedViewActions: Story = {
  args: {
    tabs: [
      { id: "all", content: "All", actions: true },
      { id: "awaiting-prep", content: "Awaiting prep", actions: true },
      { id: "ready-to-advertise", content: "Ready to advertise", actions: true },
    ],
  },
};

/**
 * A "+" after the tabs for saving a new view. Open a "Create view" Modal from
 * `onCreateNewView`.
 * @summary a "+" to save a new view
 */
export const CreateNewView: Story = {
  args: { canCreateNewView: true, onCreateNewView: fn() },
};

/**
 * Tabs never wrap or shrink their labels; when there are more than fit, the
 * row scrolls sideways.
 * @summary more tabs than fit: the row scrolls
 */
export const Overflow: Story = {
  args: {
    tabs: [
      { id: "all", content: "All" },
      { id: "purchase", content: "Purchase" },
      { id: "prep", content: "Prep" },
      { id: "advert", content: "Advert" },
      { id: "sale", content: "Sale" },
      { id: "warranty", content: "Warranty" },
      { id: "finance", content: "Finance" },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "20rem" }}>
        <Story />
      </div>
    ),
  ],
};
