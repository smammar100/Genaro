import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { ChoiceList, FilterPill, Filters, Popover, type FiltersProps } from "@/components/genaro";
import guidelines from "../docs/Filters.md?raw";

/**
 * A search field and filter pills at the top of a list, such as the vehicles
 * or leads list. IndexTable takes the same props through `filters`, and
 * ResourceList takes a Filters element; FilterPill is one pill, for building
 * a bar of your own.
 */
const meta = {
  title: "Components/Forms/Filters",
  component: Filters,
  subcomponents: { FilterPill },
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    queryValue: "",
    queryPlaceholder: "Search by reg, stock ID or make",
    filters: [
      { key: "status", label: "Status", onClick: fn() },
      { key: "make", label: "Make", onClick: fn() },
      { key: "location", label: "Location", onClick: fn() },
    ],
    onQueryChange: fn(),
    onQueryClear: fn(),
    onAddFilterClick: fn(),
    onClearAll: fn(),
  },
  // Keeps the search text and the applied filters in args, so typing,
  // removing a pill and "Clear all" all work.
  render: function Render(args) {
    const [, updateArgs] = useArgs<FiltersProps>();
    const applied = args.appliedFilters ?? [];
    return (
      <Filters
        {...args}
        onQueryChange={(queryValue) => {
          updateArgs({ queryValue });
          args.onQueryChange?.(queryValue);
        }}
        onQueryClear={() => {
          updateArgs({ queryValue: "" });
          args.onQueryClear?.();
        }}
        appliedFilters={applied.map((filter) => ({
          ...filter,
          onRemove: () => {
            updateArgs({ appliedFilters: applied.filter((f) => f.key !== filter.key) });
            filter.onRemove?.();
          },
        }))}
        onClearAll={() => {
          updateArgs({ appliedFilters: [] });
          args.onClearAll?.();
        }}
      />
    );
  },
} satisfies Meta<typeof Filters>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Search and filter a list. Each filter's `onClick` opens your own picker,
 * such as a Modal with a ChoiceList.
 * @summary a search field and the available filters
 */
export const Default: Story = {};

/**
 * Applied filters become filled pills that name the condition ("Status is
 * Listed"), each with a remove button, and "Clear all" appears.
 * @summary applied filters as removable pills, with "Clear all"
 */
export const WithAppliedFilters: Story = {
  args: {
    appliedFilters: [
      { key: "status", label: "Status is Listed", onRemove: fn() },
      { key: "location", label: "Location is Forecourt", onRemove: fn() },
    ],
  },
};

/**
 * A search in progress. The clear button calls `onQueryClear`, so reset the
 * text there.
 * @summary search text with its clear button
 */
export const WithQuery: Story = {
  args: { queryValue: "BMW 3 Series" },
};

/**
 * The three pill styles: a filter you can add, an applied filter with a remove
 * button, and the "Add filter" pill.
 * @summary available, applied and "Add filter" pills
 */
export const PillStyles: StoryObj<typeof FilterPill> = {
  args: { label: "Make", onClick: fn(), onRemove: fn() },
  render: ({ label, onClick, onRemove }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-200)" }}>
      <FilterPill label={label} onClick={onClick} />
      <FilterPill label={`${label} is BMW`} active onClick={onClick} onRemove={onRemove} />
      <FilterPill label="Add filter" add onClick={onClick} />
    </div>
  ),
};

/**
 * A pill that opens a dropdown under itself, built from FilterPill, Popover
 * and ChoiceList. Once values are chosen it becomes an applied pill.
 * @summary a pill with an anchored dropdown of choices
 */
export const PillWithPopover: StoryObj<typeof FilterPill> = {
  args: { label: "Make", onClick: fn(), onRemove: fn() },
  parameters: { docs: { story: { inline: false, height: "280px" } } },
  render: function Render({ label, onClick, onRemove }) {
    const [open, setOpen] = React.useState(true);
    const [makes, setMakes] = React.useState<string[]>([]);
    const toggle = () => {
      setOpen((o) => !o);
      onClick?.();
    };
    return (
      <Popover
        active={open}
        onClose={() => setOpen(false)}
        sectioned
        activator={
          makes.length ? (
            <FilterPill
              label={`${label} is ${makes.join(", ")}`}
              active
              onClick={toggle}
              onRemove={() => {
                setMakes([]);
                onRemove?.();
              }}
            />
          ) : (
            <FilterPill label={label} onClick={toggle} />
          )
        }
      >
        <ChoiceList
          title={label}
          titleHidden
          allowMultiple
          choices={["Audi", "BMW", "Ford", "Mercedes-Benz", "Volkswagen"].map((make) => ({ label: make, value: make }))}
          selected={makes}
          onChange={setMakes}
        />
      </Popover>
    );
  },
};
