import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import {
  Badge,
  Card,
  DescriptionList,
  IndexTable,
  Layout,
  Page,
  PageActions,
  Select,
  TextField,
} from "@/components/genaro";
import guidelines from "../docs/Page.md?raw";

const vehicleDetails = (
  <Layout>
    <Layout.Section>
      <Card title="Vehicle details">
        <DescriptionList
          items={[
            { term: "Registration", description: "OY70 TZG" },
            { term: "Mileage", description: "28,412 miles" },
            { term: "Colour", description: "Magnetic grey" },
          ]}
        />
      </Card>
    </Layout.Section>
    <Layout.Section variant="oneThird">
      <Card title="Price">£12,495.00</Card>
    </Layout.Section>
  </Layout>
);

/**
 * Page is the header (title, back button, actions, pagination) and the
 * width-limited content column every route returns. Use one per route, with
 * `fullWidth` for index tables and `narrowWidth` for settings.
 */
const meta = {
  title: "Components/Layout and structure/Page",
  component: Page,
  tags: ["autodocs"],
  parameters: { guidelines, layout: "fullscreen" },
  args: {
    title: "Appointments",
    primaryAction: { content: "Book appointment", url: "/appointments/new" },
    children: (
      <Card title="Today">
        <p className="body-md">7 appointments, the first at 09:30 with Priya Sharma for a test drive.</p>
      </Card>
    ),
  },
  argTypes: {
    children: { control: false },
    titleMetadata: { control: false },
    controls: { control: false },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every route returns one Page: its title, its one primary action and its
 * content, 998px wide.
 * @summary the title, one primary action and the content
 */
export const Default: Story = {};

/**
 * Detail pages go back to their index, show status badges and a subtitle, and
 * step to the previous or next record.
 * @summary a detail page: back, badges, subtitle, previous / next
 */
export const DetailPage: Story = {
  args: {
    title: "2020 Ford Fiesta 1.0 EcoBoost Titanium",
    backAction: { content: "Vehicles", url: "/vehicles" },
    titleMetadata: <Badge tone="attention">Reserved</Badge>,
    subtitle: "L-927 · Added 12 October 2026 from Autotrader",
    primaryAction: { content: "Save vehicle", onAction: fn() },
    pagination: { hasPrevious: true, hasNext: true, previousURL: "/vehicles/L-926", nextURL: "/vehicles/L-928" },
    children: vehicleDetails,
  },
};

/**
 * Other page-level actions sit beside the primary one as quiet pills. An
 * icon-only one needs an `accessibilityLabel`; `destructive` gives the critical
 * tone.
 * @summary quieter page actions, icon-only and destructive
 */
export const SecondaryActions: Story = {
  args: {
    title: "OY70 TZG",
    backAction: { content: "Vehicles", url: "/vehicles" },
    secondaryActions: [
      { content: "Duplicate", icon: "DuplicateMinor", url: "/vehicles/new?duplicate=L-927" },
      { content: "Delete", destructive: true, onAction: fn() },
      { icon: "PrintMajor", accessibilityLabel: "Print vehicle check sheet", url: "/vehicles/L-927/print" },
    ],
    primaryAction: { content: "Save vehicle", onAction: fn() },
    children: vehicleDetails,
  },
};

/**
 * While the primary action runs, its button shows a spinner and ignores
 * clicks.
 * @summary the primary action in progress
 */
export const Saving: Story = {
  args: {
    title: "OY70 TZG",
    backAction: { content: "Vehicles", url: "/vehicles" },
    primaryAction: { content: "Save vehicle", loading: true, onAction: fn() },
    children: vehicleDetails,
  },
};

/**
 * Index pages with an IndexTable use the full width, so every column fits.
 * @summary index pages with a table use the full width
 */
export const FullWidth: Story = {
  args: {
    title: "Vehicles",
    fullWidth: true,
    primaryAction: { content: "Add vehicle", url: "/vehicles/new" },
    children: (
      <IndexTable
        selectable={false}
        headings={[{ title: "Vehicle" }, { title: "Registration" }, { title: "Price", alignment: "end" }, { title: "Status" }]}
        rows={[
          {
            id: "L-927",
            url: "/vehicles/L-927",
            cells: ["2020 Ford Fiesta 1.0 EcoBoost Titanium", "OY70 TZG", "£12,495.00", <Badge key="status" tone="attention">Reserved</Badge>],
          },
          {
            id: "L-931",
            url: "/vehicles/L-931",
            cells: ["2014 Audi A4 2.0 TFSI Black Edition", "WP14 KXM", "£8,995.00", <Badge key="status" tone="success">In stock</Badge>],
          },
        ]}
      />
    ),
  },
};

/**
 * Settings pages are 662px wide, so forms stay a comfortable line length.
 * @summary settings pages at 662px
 */
export const NarrowWidth: Story = {
  args: {
    title: "Business details",
    narrowWidth: true,
    backAction: { content: "Settings", url: "/admin/settings" },
    primaryAction: undefined,
    children: (
      <>
        <Card>
          <TextField label="Trading name" name="tradingName" defaultValue="Car Capital" autoComplete="organization" />
          <TextField label="VAT number" name="vatNumber" defaultValue="GB 284 9127 63" autoComplete="off" />
        </Card>
        <PageActions primaryAction={{ content: "Save settings", onAction: fn() }} />
      </>
    ),
  },
};

/**
 * A control that isn't a button, such as the sales pipeline's agent filter,
 * goes in the header's top right, before the actions.
 * @summary a filter control in the header, before the actions
 */
export const WithControls: Story = {
  args: {
    title: "Sales pipeline",
    subtitle: "Track every deal from new lead to completed sale.",
    fullWidth: true,
    primaryAction: undefined,
    controls: (
      <div style={{ width: "224px" }}>
        <Select
          label="Agent"
          labelHidden
          placeholder="Select agent"
          defaultValue=""
          options={[
            { label: "Priya Sharma", value: "priya" },
            { label: "Tom Hughes", value: "tom" },
          ]}
        />
      </div>
    ),
    children: (
      <Card title="New leads">
        <p className="body-md">12 deals, £148,320.00 in total.</p>
      </Card>
    ),
  },
};

/**
 * A heading-sized menu after the title switches the page's scope, such as
 * which location's stock it shows.
 * @summary a title menu that switches the page's scope
 */
export const TitlePicker: Story = {
  args: {
    title: "Stock",
    titlePicker: { content: "All locations", onAction: fn() },
    primaryAction: { content: "Add vehicle", url: "/vehicles/new" },
    children: (
      <Card title="In stock">
        <p className="body-md">38 vehicles, £412,860.00 at list price.</p>
      </Card>
    ),
  },
};
