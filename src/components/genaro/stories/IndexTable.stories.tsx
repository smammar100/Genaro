import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  Badge,
  IndexTable,
  Thumbnail,
  type BadgeProps,
  type IndexTableHeading,
  type IndexTableProps,
  type IndexTableRow,
} from "@/components/genaro";
import guidelines from "../docs/IndexTable.md?raw";

type Status = "Received" | "Inspection pending" | "Being prepared" | "Ready" | "Listed" | "Reserved";

/** Stock statuses and their Badge tones, as the vehicles page shows them. */
const statusBadge: Record<Status, Pick<BadgeProps, "tone" | "strong">> = {
  Received: { tone: "info" },
  "Inspection pending": { tone: "attention" },
  "Being prepared": { tone: "warning" },
  Ready: { tone: "success" },
  Listed: { tone: "magic" },
  Reserved: { tone: "info", strong: true },
};

const stock: { id: string; reg: string; make: string; model: string; status: Status; location: string; days: number }[] = [
  { id: "L-927", reg: "OY70 TZG", make: "BMW", model: "3 Series", status: "Listed", location: "Forecourt", days: 41 },
  { id: "L-931", reg: "KN18 XPL", make: "Audi", model: "A3 Sportback", status: "Ready", location: "Forecourt", days: 12 },
  { id: "L-934", reg: "WR68 HVD", make: "Ford", model: "Focus", status: "Being prepared", location: "Garage", days: 6 },
  { id: "L-938", reg: "LB21 FMO", make: "Mercedes-Benz", model: "A-Class", status: "Reserved", location: "Forecourt", days: 27 },
  { id: "L-940", reg: "YH17 RCU", make: "Volkswagen", model: "Golf", status: "Inspection pending", location: "Yard", days: 3 },
  { id: "L-942", reg: "SF66 KJE", make: "Nissan", model: "Juke", status: "Received", location: "Yard", days: 1 },
  { id: "L-945", reg: "MA20 UWB", make: "Toyota", model: "Yaris", status: "Listed", location: "Forecourt", days: 58 },
  { id: "L-948", reg: "DE69 OAN", make: "Kia", model: "Sportage", status: "Ready", location: "Garage", days: 9 },
];

const headings: IndexTableHeading[] = [
  { title: "Registration" },
  { title: "Make" },
  { title: "Model" },
  { title: "Status" },
  { title: "Location" },
  { title: "Days in stock", alignment: "end" },
];

/** The column the location views and filters match on. */
const LOCATION = headings.findIndex((h) => h.title === "Location");

const rows: IndexTableRow[] = stock.map((v) => ({
  id: v.id,
  url: `/vehicles/${v.id}`,
  cells: [v.reg, v.make, v.model, <Badge key="status" {...statusBadge[v.status]}>{v.status}</Badge>, v.location, v.days],
}));

const views = ["All", "Forecourt", "Yard", "Garage"].map((content) => ({
  content,
  badge: content === "All" ? stock.length : stock.filter((v) => v.location === content).length,
}));

/** Numbers sort as numbers, everything else as text. */
function compareCells(a: React.ReactNode, b: React.ReactNode) {
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
}

/**
 * The main list view for vehicles, leads and invoices: saved views, search and
 * filter, sortable headings, selectable rows with bulk actions, and
 * pagination. It is already a flush card. For a simple list of one kind of
 * thing use ResourceList; for read-only figures use DataTable.
 */
const meta = {
  title: "Components/Lists and tables/IndexTable",
  component: IndexTable,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { headings, rows },
  argTypes: {
    rows: { control: false },
  },
} satisfies Meta<typeof IndexTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An index page's list: each registration links to its vehicle, and rows can
 * be selected. Keep the primary cell a plain string so it names the row.
 * @summary the stock list, linked rows, selectable
 */
export const Default: Story = {};

/**
 * Turn selection off when nothing on the page acts on selected rows, such as
 * a read-only list on a dashboard.
 * @summary no checkboxes when nothing acts on a selection
 */
export const WithoutSelection: Story = {
  args: { selectable: false },
};

/**
 * Sortable headings for columns people order by, such as days in stock. The
 * table only reports the sort through `onSort`; sort `rows` yourself.
 * @summary click a heading to sort; you reorder the rows
 */
export const SortableHeadings: Story = {
  args: {
    headings: headings.map((h) => ({ ...h, sortable: h.title !== "Registration" && h.title !== "Status" })),
    sortColumnIndex: headings.length - 1,
    sortDirection: "descending",
    onSort: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<IndexTableProps>();
    const index = args.sortColumnIndex ?? 0;
    const sign = args.sortDirection === "ascending" ? 1 : -1;
    const sorted = [...args.rows].sort((a, b) => sign * compareCells(a.cells[index], b.cells[index]));
    return (
      <IndexTable
        {...args}
        rows={sorted}
        onSort={(sortColumnIndex, sortDirection) => {
          updateArgs({ sortColumnIndex, sortDirection });
          args.onSort?.(sortColumnIndex, sortDirection);
        }}
      />
    );
  },
};

/**
 * Act on several vehicles at once. While rows are selected, a bar floats at
 * the bottom of the card with the main actions and a menu of the rest.
 * @summary selected rows with a floating bulk-actions bar
 */
export const BulkActions: Story = {
  args: {
    selectedItems: ["L-931", "L-948"],
    promotedBulkActions: [{ content: "Move to forecourt", onAction: fn() }],
    bulkActions: [
      { content: "Print window cards", icon: "PrintMajor", onAction: fn() },
      { content: "Mark as reserved", onAction: fn() },
    ],
  },
};

/**
 * Saved views switch between slices of the same list, such as stock by
 * location, with a count on each tab. The "+" creates a new view.
 * @summary tabs for saved views, with counts
 */
export const SavedViews: Story = {
  args: {
    tabs: views,
    selectedTab: 0,
    onSelectTab: fn(),
    canCreateNewView: true,
    onCreateNewView: fn(),
    onSortButtonClick: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<IndexTableProps>();
    const view = args.tabs?.[args.selectedTab ?? 0]?.content;
    const shown = view && view !== "All" ? args.rows.filter((row) => row.cells[LOCATION] === view) : args.rows;
    return (
      <IndexTable
        {...args}
        rows={shown}
        onSelectTab={(selectedTab) => {
          updateArgs({ selectedTab });
          args.onSelectTab?.(selectedTab);
        }}
      />
    );
  },
};

/**
 * Search and filter a long list. The search button swaps the tabs for the
 * Filters bar; applied filters show as pills naming the condition.
 * @summary the search and filter bar, open
 */
export const SearchAndFilter: Story = {
  args: {
    tabs: views,
    filtersOpen: true,
    filters: {
      queryPlaceholder: "Search by reg, stock ID or make",
      onQueryChange: fn(),
      onQueryClear: fn(),
      filters: [
        { key: "status", label: "Status", onClick: fn() },
        { key: "make", label: "Make", onClick: fn() },
        { key: "location", label: "Location", onClick: fn() },
      ],
      appliedFilters: [{ key: "location", label: "Location is Forecourt", onRemove: fn() }],
      onAddFilterClick: fn(),
      onClearAll: fn(),
    },
    rows: rows.filter((row) => row.cells[LOCATION] === "Forecourt"),
    onSortButtonClick: fn(),
  },
};

/**
 * Lists longer than a page show previous and next controls in the footer,
 * with a label saying where you are.
 * @summary paged lists, with a "1–8 of 112" label
 */
export const WithPagination: Story = {
  args: {
    pagination: { hasPrevious: false, hasNext: true, onPrevious: fn(), onNext: fn(), label: "1–8 of 112" },
  },
};

/**
 * Open a vehicle from anywhere on its row. Checkboxes and links in the row
 * keep their own clicks, and the registration link stays for keyboard users.
 * @summary whole-row click; controls keep their own clicks
 */
export const ClickableRows: Story = {
  args: { onRowClick: fn() },
};

/**
 * 32px rows for dense lists people scan, such as the master sheet.
 * @summary 32px rows for dense lists
 */
export const Condensed: Story = {
  args: { condensed: true },
};

/**
 * A thumbnail column helps people recognise a car at a glance. Mark the
 * heading `media` and put a small Thumbnail in each cell.
 * @summary a photo column of small thumbnails
 */
export const WithThumbnails: Story = {
  args: {
    headings: [{ title: "Photo", media: true }, ...headings],
    rows: [
      { id: "L-931", reg: "KN18 XPL", model: "A3 Sportback", make: "Audi", status: "Ready", location: "Forecourt", days: 12, photo: 1 },
      { id: "L-951", reg: "WP17 HZB", model: "A3 Sportback", make: "Audi", status: "Listed", location: "Forecourt", days: 33, photo: 2 },
      { id: "L-953", reg: "LR64 BXU", model: "A4", make: "Audi", status: "Being prepared", location: "Garage", days: 8, photo: 3 },
      { id: "L-942", reg: "SF66 KJE", model: "Juke", make: "Nissan", status: "Received", location: "Yard", days: 1, photo: 4 },
    ].map((v) => ({
      id: v.id,
      url: `/vehicles/${v.id}`,
      cells: [
        <Thumbnail key="photo" size="small" source={`/cars/seed/vehicle-${v.photo}.png`} alt={`${v.make} ${v.model}`} />,
        v.reg,
        v.make,
        v.model,
        <Badge key="status" {...statusBadge[v.status as Status]}>
          {v.status}
        </Badge>,
        v.location,
        v.days,
      ],
    })),
  },
};
