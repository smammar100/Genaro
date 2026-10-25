import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  Avatar,
  Badge,
  Card,
  Filters,
  Link,
  ResourceItem,
  ResourceList,
  Thumbnail,
  type ResourceListItem,
  type ResourceListProps,
} from "@/components/genaro";
import guidelines from "../docs/ResourceList.md?raw";

/** Leads, newest enquiry first. */
const leads: ResourceListItem[] = [
  {
    id: "2041",
    name: "James Walker",
    url: "/sales/leads?lead=2041",
    meta: "BMW 3 Series · OY70 TZG · Website enquiry",
    media: <Avatar name="James Walker" size="lg" />,
    badge: <Badge tone="info">New lead</Badge>,
  },
  {
    id: "2038",
    name: "Priya Shah",
    url: "/sales/leads?lead=2038",
    meta: "Mercedes-Benz A-Class · LB21 FMO · Viewing on Thursday",
    media: <Avatar name="Priya Shah" size="lg" />,
    badge: <Badge tone="attention">Viewing</Badge>,
  },
  {
    id: "2035",
    name: "Tom Hughes",
    url: "/sales/leads?lead=2035",
    meta: "Ford Focus · WR68 HVD · AutoTrader enquiry",
    media: <Avatar name="Tom Hughes" size="lg" />,
    badge: <Badge>Contacted</Badge>,
  },
  {
    id: "2029",
    name: "Sophie Clarke",
    url: "/sales/leads?lead=2029",
    meta: "Toyota Yaris · MA20 UWB · £500 deposit paid",
    media: <Avatar name="Sophie Clarke" size="lg" />,
    badge: <Badge tone="success">Deposit taken</Badge>,
  },
];

/**
 * A flush card listing one kind of thing, such as leads or staff, where each
 * row is a name, a line of detail and a badge. Use IndexTable when people
 * compare several columns across rows. ResourceItem is a single row for your
 * own lists.
 */
const meta = {
  title: "Components/Lists and tables/ResourceList",
  component: ResourceList,
  subcomponents: { ResourceItem },
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    items: leads,
    resourceName: { singular: "lead", plural: "leads" },
  },
  argTypes: {
    items: { control: false },
  },
} satisfies Meta<typeof ResourceList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A list of leads: each name links to the lead, with the car they asked about
 * and their stage. The header counts the rows.
 * @summary leads with avatar, detail line and stage badge
 */
export const Default: Story = {};

/**
 * Quick actions on a row, such as booking an appointment, without opening the
 * lead. They appear when the row is hovered or its link has focus.
 * @summary row actions revealed on hover or focus
 */
export const WithShortcutActions: Story = {
  args: {
    items: leads.map((lead) => ({
      ...lead,
      shortcutActions: [{ content: "Book appointment", onAction: fn() }],
    })),
  },
};

/**
 * Select leads to act on them together. While any are selected, the header
 * shows the count and the bulk actions in place of the sort.
 * @summary selected rows with bulk actions in the header
 */
export const BulkActions: Story = {
  args: {
    selectable: true,
    selectedItems: ["2041", "2035"],
    promotedBulkActions: [
      { content: "Assign salesperson", onAction: fn() },
      { content: "Mark as contacted", onAction: fn() },
    ],
  },
};

/**
 * A "Sort by" control in the header for lists people reorder, such as oldest
 * enquiry first. The list reports the choice; sort the items yourself.
 * @summary a "Sort by" select; you reorder the items
 */
export const WithSorting: Story = {
  args: {
    sortOptions: [
      { label: "Newest enquiry", value: "newest" },
      { label: "Oldest enquiry", value: "oldest" },
      { label: "Name A–Z", value: "name" },
    ],
    sortValue: "newest",
    onSortChange: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ResourceListProps>();
    const items =
      args.sortValue === "oldest"
        ? [...args.items].reverse()
        : args.sortValue === "name"
          ? [...args.items].sort((a, b) => a.name.localeCompare(b.name))
          : args.items;
    return (
      <ResourceList
        {...args}
        items={items}
        onSortChange={(sortValue) => {
          updateArgs({ sortValue });
          args.onSortChange?.(sortValue);
        }}
      />
    );
  },
};

/**
 * Search and filter pills above the list, for long lists such as every open
 * lead. Pass a Filters element.
 * @summary a Filters bar above the list
 */
export const WithFilters: Story = {
  args: {
    filterControl: (
      <Filters
        queryPlaceholder="Search leads by name, reg or make"
        filters={[
          { key: "stage", label: "Stage", onClick: fn() },
          { key: "salesperson", label: "Salesperson", onClick: fn() },
        ]}
        onAddFilterClick={fn()}
      />
    ),
  },
  argTypes: { filterControl: { control: false } },
};

/**
 * A page of a longer list. Pass the full count so the header says "Showing 4
 * of 50 leads".
 * @summary a count of all items, not just those shown
 */
export const WithTotalCount: Story = {
  args: { totalItemsCount: 50 },
};

/**
 * A single row for a list of your own, such as one car on a lead. Make the
 * first line a link or semibold; the row adds no name styling.
 * @summary one row of media and content, for your own lists
 */
export const StandaloneItem: StoryObj<typeof ResourceItem> = {
  args: {
    media: <Thumbnail size="small" source="/cars/seed/vehicle-1.png" alt="Audi A3 Sportback" />,
    children: (
      <>
        <Link url="/vehicles/L-931" monochrome removeUnderline>
          Audi A3 Sportback
        </Link>
        <div className="body-sm" style={{ color: "var(--text-secondary)" }}>
          KN18 XPL · Forecourt · 12 days in stock
        </div>
      </>
    ),
  },
  argTypes: { media: { control: false }, children: { control: false } },
  render: ({ media, children }) => (
    <Card padding="0">
      <ResourceItem media={media}>{children}</ResourceItem>
    </Card>
  ),
};
