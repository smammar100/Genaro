import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import {
  Card,
  IndexTable,
  TableFilterMenu,
  TableSortMenu,
  applyTableFilters,
  applyTableSort,
  countTableValues,
  type TableFilterField,
  type TableFilterRule,
  type TableJoin,
  type TableSortRule,
} from "@/components/genaro";
import guidelines from "../docs/TableFilterMenu.md?raw";

interface Car {
  reg: string;
  make: string;
  model: string;
  mileage: number | null;
  location: string;
  dateSold: string | null;
}

const CARS: Car[] = [
  { reg: "LT07 JDK", make: "Mercedes-Benz", model: "B Class", mileage: 82000, location: "Sold", dateSold: "2026-10-03" },
  { reg: "PK63 XAW", make: "Vauxhall", model: "Astra", mileage: 45000, location: "Forecourt", dateSold: null },
  { reg: "WF58 KXY", make: "Smart", model: "Fortwo", mileage: null, location: "Yard", dateSold: null },
  { reg: "HN62 KPY", make: "Mercedes-Benz", model: "C Class", mileage: 120500, location: "Sold", dateSold: "2026-09-12" },
  { reg: "DG08 GKF", make: "Skoda", model: "Fabia", mileage: 131365, location: "Forecourt", dateSold: null },
  { reg: "CK07 WXF", make: "Volkswagen", model: "Golf", mileage: 98000, location: "Garage", dateSold: null },
  { reg: "YN19 KWO", make: "MG", model: "ZS", mileage: 23400, location: "Forecourt", dateSold: null },
];

const locationCounts = countTableValues(CARS, (c) => c.location);
const FIELDS: TableFilterField[] = [
  { id: "make", label: "Make", variant: "text" },
  { id: "model", label: "Model", variant: "text" },
  { id: "mileage", label: "Mileage", variant: "number" },
  {
    id: "location",
    label: "Location",
    variant: "select",
    options: [...locationCounts].map(([value, count]) => ({ value, label: value, count })),
  },
  { id: "dateSold", label: "Date sold", variant: "date" },
];
const get = (car: Car, field: string) => car[field as keyof Car];

/**
 * Rule-based filtering for a table, after tablecn: a Filter button with the
 * number of rules, opening the list of them (column, condition, value, joined
 * by "and" or "or"). TableSortMenu is its sorting twin. The rules are data;
 * applyTableFilters and applyTableSort run them over the rows.
 */
const meta = {
  title: "Components/Lists and tables/TableFilterMenu",
  component: TableFilterMenu,
  subcomponents: { TableSortMenu },
  tags: ["autodocs"],
  parameters: { guidelines, docs: { story: { inline: false, height: "360px" } } },
  args: { fields: FIELDS, rules: [], join: "and", onChange: fn() },
  // Holds the rules, so adding, editing and removing them all work.
  render: function Render(args) {
    const [rules, setRules] = React.useState<TableFilterRule[]>(args.rules);
    const [join, setJoin] = React.useState<TableJoin>(args.join);
    return (
      <TableFilterMenu
        {...args}
        rules={rules}
        join={join}
        onChange={(next, nextJoin) => {
          setRules(next);
          setJoin(nextJoin);
          args.onChange(next, nextJoin);
        }}
      />
    );
  },
} satisfies Meta<typeof TableFilterMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * No rules yet: the panel says so, and Add filter starts one on the first
 * column with its cursor in the column picker.
 * @summary the Filter button before any rule
 */
export const Default: Story = {};

/**
 * Two rules joined by "and": cars on the forecourt or in the yard, with at
 * least 100,000 miles. The button counts the rules; the second row's list
 * switches every join to "or".
 * @summary a list field and a number field, joined by "and"
 */
export const WithRules: Story = {
  args: {
    rules: [
      { id: "a", field: "location", operator: "anyOf", value: ["Forecourt", "Yard"] },
      { id: "b", field: "mileage", operator: "gte", value: "100000" },
    ],
  },
};

/**
 * A date between two days: two date fields with "and" between them. Either
 * end alone works as "on or after" or "on or before".
 * @summary a date range rule
 */
export const DateBetween: Story = {
  args: {
    rules: [{ id: "a", field: "dateSold", operator: "between", value: ["2026-09-01", "2026-10-31"] }],
  },
};

/**
 * Sorting as a list: by make, then by mileage, highest first. Each rule
 * breaks the ties of those before it; blank cells go last either way.
 * @summary TableSortMenu with two sort rules
 */
export const SortMenu: StoryObj<typeof TableSortMenu> = {
  args: {
    fields: FIELDS.map(({ id, label }) => ({ id, label })),
    sorting: [
      { field: "make", desc: false },
      { field: "mileage", desc: true },
    ],
    onChange: fn(),
  },
  render: function Render(args) {
    const [sorting, setSorting] = React.useState<TableSortRule[]>(args.sorting);
    return <TableSortMenu {...args} sorting={sorting} onChange={(next) => { setSorting(next); args.onChange(next); }} />;
  },
};

/**
 * Both menus on a table's toolbar, running their rules over the rows: what a
 * page wires up. Filter, then sort, then page the whole set, never just the
 * rows on screen.
 * @summary Sort and Filter driving a table
 */
export const OnATable: Story = {
  parameters: { docs: { story: { inline: false, height: "520px" } } },
  render: function Render() {
    const [rules, setRules] = React.useState<TableFilterRule[]>([
      { id: "a", field: "location", operator: "anyOf", value: ["Forecourt"] },
    ]);
    const [join, setJoin] = React.useState<TableJoin>("and");
    const [sorting, setSorting] = React.useState<TableSortRule[]>([{ field: "mileage", desc: true }]);
    const rows = applyTableSort(applyTableFilters(CARS, rules, join, FIELDS, get), sorting, get);
    return (
      <Card padding="0">
        <div style={{ display: "flex", gap: "var(--space-200)", padding: "var(--space-200)" }}>
          <TableSortMenu fields={FIELDS.map(({ id, label }) => ({ id, label }))} sorting={sorting} onChange={setSorting} />
          <TableFilterMenu
            fields={FIELDS}
            rules={rules}
            join={join}
            onChange={(next, nextJoin) => {
              setRules(next);
              setJoin(nextJoin);
            }}
          />
        </div>
        <IndexTable
          className="rounded-none shadow-none"
          selectable={false}
          headings={[{ title: "Reg" }, { title: "Make" }, { title: "Model" }, { title: "Location" }, { title: "Mileage", alignment: "end" }]}
          rows={rows.map((c) => ({
            id: c.reg,
            cells: [c.reg, c.make, c.model, c.location, c.mileage == null ? "—" : c.mileage.toLocaleString("en-GB")],
          }))}
        />
      </Card>
    );
  },
};
