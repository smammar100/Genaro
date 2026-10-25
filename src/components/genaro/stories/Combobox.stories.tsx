import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn, userEvent, within } from "storybook/test";
import { Avatar } from "@/components/genaro";
import { Combobox, type ComboboxOption } from "@/components/genaro";
import guidelines from "../docs/Combobox.md?raw";

const staffNames = [
  "Amira Hussain",
  "Daniel Okafor",
  "Ellie Ward",
  "Hannah Price",
  "James Walker",
  "Marcus Bell",
  "Priya Shah",
  "Sara Ahmed",
  "Tom Fletcher",
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const staff: ComboboxOption[] = staffNames.map((name) => ({ value: slug(name), label: name }));

const vehicles: ComboboxOption[] = [
  ["OY70 TZG", "BMW 320d M Sport", "L-927", "In stock"],
  ["NA66 XGM", "Ford Fiesta Titanium", "L-904", "In prep"],
  ["KP19 RWO", "Volkswagen Golf Match", "L-931", "In stock"],
  ["YD68 HNV", "Audi A3 Sportback S line", "L-918", "Reserved"],
  ["LR21 KXE", "Toyota Yaris Icon hybrid", "L-940", "Awaiting inspection"],
  ["WU17 DFP", "Vauxhall Corsa SRi", "L-889", "In stock"],
  ["MF20 ZPA", "Mercedes-Benz A 180 AMG Line", "L-936", "In prep"],
  ["SG69 LMO", "Nissan Qashqai N-Connecta", "L-922", "Sold"],
].map(([reg, model, stockId, status]) => ({
  value: stockId,
  label: `${reg} · ${model}`,
  description: `${stockId} · ${status}`,
  keywords: [stockId],
  disabled: status === "Sold",
}));

const makes: ComboboxOption[] = ["Audi", "BMW", "Ford", "Hyundai", "Kia", "Mercedes-Benz", "Nissan", "Toyota", "Vauxhall", "Volkswagen"].map(
  (make) => ({ value: slug(make), label: make }),
);

const features: ComboboxOption[] = [
  "Android Auto",
  "Apple CarPlay",
  "Bluetooth",
  "Climate control",
  "Cruise control",
  "Heated seats",
  "Keyless entry",
  "Leather seats",
  "Panoramic roof",
  "Parking sensors",
  "Reversing camera",
  "Sat nav",
].map((feature) => ({ value: slug(feature), label: feature }));

const customers: ComboboxOption[] = [
  ["Aisha Patel", "07712 345678"],
  ["Ben Carter", "07700 900123"],
  ["Chloe Evans", "07911 482736"],
  ["David Morgan", "07824 610955"],
  ["Grace Thompson", "07456 203318"],
  ["Mohammed Ali", "07383 559201"],
  ["Olivia Harris", "07590 774612"],
  ["Paul Jenkins", "07123 908451"],
].map(([name, mobile]) => ({ value: slug(name), label: name, description: mobile, keywords: [mobile] }));

/**
 * A text field that searches a long list as people type and picks one option,
 * or several with `allowMultiple`: a vehicle by its reg, who preps a car, a
 * warranty. For a short fixed list use Select; to show two to five choices at
 * once, ChoiceList.
 */
const meta = {
  title: "Components/Forms/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "420px" } },
  },
  args: { label: "Prepped by", options: staff, placeholder: "Search staff", value: "", onChange: fn() },
  argTypes: {
    helpText: { control: "text" },
    error: { control: "text" },
    prefix: { control: "text" },
    emptyState: { control: "text" },
    options: { control: false },
    filter: { control: false },
  },
  // Keeps the picked value in args, so the field and Controls stay in step.
  render: function Render(args) {
    const [, updateArgs] = useArgs<{ value?: string | string[] }>();
    return (
      <Combobox
        {...args}
        onChange={(value: string | string[], id: string) => {
          updateArgs({ value });
          // One call for either mode: the value matches the story's allowMultiple.
          args.onChange?.(value as never, id);
        }}
      />
    );
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pick one name from a list too long to scroll, such as who preps a car:
 * type "sar" and press Enter.
 * @summary search a long list and pick one
 */
export const Default: Story = {};

/**
 * Options people tell apart by a second detail, such as vehicles by stock ID
 * and status. Typing matches the hidden keywords too, and a reg with or
 * without its space ("oy70tzg"). Sold cars are listed but can't be picked.
 * @summary a second line per option, matched on keywords
 */
export const WithDescription: Story = {
  args: {
    label: "Vehicle",
    options: vehicles,
    prefix: "SearchMinor",
    placeholder: "Search by reg, stock ID or model",
  },
};

/**
 * People are easier to spot by their avatar. `media` shows in the list and in
 * the field once picked.
 * @summary options with avatars
 */
export const WithMedia: Story = {
  args: {
    label: "Salesperson",
    options: staff.map((o) => ({ ...o, media: <Avatar size="xs" name={o.label} /> })),
    value: "hannah-price",
  },
};

/**
 * A filter where "nothing picked" means "all", such as a report's make. The
 * clear button, or erasing the text, resets it.
 * @summary a filter that clears back to "all"
 */
export const Clearable: Story = {
  args: { label: "Make", options: makes, placeholder: "All makes", clearable: true, value: "bmw" },
};

/**
 * Several values from a long list, such as a vehicle's features. Picks show
 * as tags; the list stays open between picks.
 * @summary pick several, shown as tags
 */
export const Multiple: Story = {
  args: {
    label: "Features",
    allowMultiple: true,
    options: features,
    placeholder: "Search features",
    value: ["heated-seats", "sat-nav"],
  },
};

/**
 * When nothing matches, say what to do next rather than only "No results".
 * @summary the message when nothing matches
 */
export const EmptyState: Story = {
  args: {
    label: "Vehicle",
    options: vehicles,
    prefix: "SearchMinor",
    placeholder: "Search by reg, stock ID or model",
    emptyState: "No vehicle matches that reg. Check it on the V5C.",
  },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole("combobox"), "ZZ99");
  },
};

/**
 * Lists too long to send to the browser, such as every customer, are searched
 * on the server: `onQueryChange` runs the search, `loading` shows a spinner,
 * and `filter={null}` shows the results as they come back.
 * @summary search a server, with a loading state
 */
export const RemoteSearch: Story = {
  args: {
    label: "Customer",
    options: [],
    prefix: "SearchMinor",
    placeholder: "Search by name or mobile",
  },
  render: function RemoteSearchStory(args) {
    const { value, defaultValue: _defaultValue, allowMultiple: _allowMultiple, ...rest } = args;
    const [, updateArgs] = useArgs<{ value?: string }>();
    const [results, setResults] = React.useState<ComboboxOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [searched, setSearched] = React.useState(false);
    const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
    return (
      <Combobox
        {...rest}
        value={typeof value === "string" ? value : ""}
        options={results}
        filter={null}
        loading={loading}
        emptyState={searched ? "No customer matches" : "Type a name or mobile number"}
        onQueryChange={(query) => {
          clearTimeout(timer.current);
          const q = query.trim().toLowerCase();
          setSearched(q !== "");
          if (!q) {
            setLoading(false);
            return;
          }
          setLoading(true);
          // Stands in for a Server Action that searches the customers table.
          timer.current = setTimeout(() => {
            const digits = q.replace(/\s/g, "");
            setResults(
              customers.filter((c) => c.label.toLowerCase().includes(q) || (c.keywords || []).some((k) => k.replace(/\s/g, "").includes(digits))),
            );
            setLoading(false);
          }, 600);
        }}
        onChange={(next: string, id: string) => {
          updateArgs({ value: next });
          args.onChange?.(next as never, id);
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole("combobox"), "pa");
  },
};

/**
 * A required choice that's missing. The message says what to choose.
 * @summary a missing choice with an inline error
 */
export const WithError: Story = {
  args: {
    label: "Vehicle",
    options: vehicles,
    prefix: "SearchMinor",
    placeholder: "Pick a vehicle in stock",
    error: "Choose the vehicle this warranty covers",
  },
};

/**
 * A choice that doesn't apply yet. Say in the help text when it will.
 * @summary choices that don't apply yet
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    value: "sara-ahmed",
    helpText: "Reassign once the inspection is complete.",
  },
};
