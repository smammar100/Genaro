import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, Grid, GridCell } from "@/components/genaro";
import guidelines from "../docs/Grid.md?raw";

const stats = [
  { title: "Stock value", value: "£412,860.00" },
  { title: "Vehicles in stock", value: "38" },
  { title: "New leads this week", value: "54" },
  { title: "Appointments today", value: "7" },
];

const vehicles = [
  { stockId: "L-927", name: "2020 Ford Fiesta 1.0 EcoBoost Titanium", price: "£12,495.00" },
  { stockId: "L-931", name: "2014 Audi A4 2.0 TFSI Black Edition", price: "£8,995.00" },
  { stockId: "L-934", name: "2019 Volkswagen Golf 1.5 TSI Life", price: "£14,250.00" },
];

/**
 * Grid is the dashboard column grid: 6 columns on narrow containers, 12 on
 * wide ones, 16px gutters. Use it for stat tiles and report widgets; for a
 * page's main column and sidebar use Layout.
 */
const meta = {
  title: "Components/Layout and structure/Grid",
  component: Grid,
  subcomponents: { GridCell },
  tags: ["autodocs"],
  parameters: { guidelines },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Dashboard tiles: four across on wide screens, two on tablets and one per
 * row on phones, set per breakpoint with `columnSpan`.
 * @summary stat tiles that reflow by breakpoint
 */
export const StatTiles: Story = {
  render: (args) => (
    <Grid {...args}>
      {stats.map((stat) => (
        <Grid.Cell key={stat.title} columnSpan={{ xs: 6, sm: 3, lg: 3 }}>
          <Card title={stat.title}>
            <p className="heading-lg">{stat.value}</p>
          </Card>
        </Grid.Cell>
      ))}
    </Grid>
  ),
};

/**
 * A wide widget beside a narrow one, such as a sales chart with the top
 * models: 8 and 4 columns on wide screens, stacked below that.
 * @summary a wide widget beside a narrow one
 */
export const WideAndNarrow: Story = {
  render: (args) => (
    <Grid {...args}>
      <GridCell columnSpan={{ xs: 6, lg: 8 }}>
        <Card title="Sales over time">
          <p className="body-md">£287,640.00 this month, up 24% on September.</p>
        </Card>
      </GridCell>
      <GridCell columnSpan={{ xs: 6, lg: 4 }}>
        <Card title="Top models">
          <p className="body-md">Ford Fiesta, 6 sold</p>
        </Card>
      </GridCell>
    </Grid>
  ),
};

/**
 * Equal cards with a custom column count: one, two or three per row. With
 * custom `columns`, give every cell a `columnSpan`.
 * @summary equal cards, one to three per row
 */
export const CustomColumns: Story = {
  args: { columns: { xs: 1, sm: 2, lg: 3 } },
  render: (args) => (
    <Grid {...args}>
      {vehicles.map((vehicle) => (
        <Grid.Cell key={vehicle.stockId} columnSpan={1}>
          <Card title={vehicle.name}>
            <p className="body-md">
              {vehicle.stockId} · {vehicle.price}
            </p>
          </Card>
        </Grid.Cell>
      ))}
    </Grid>
  ),
};

/**
 * The column overlay, for checking a layout against the grid in design
 * reviews. Don't ship it.
 * @summary column overlay for layout reviews
 */
export const ColumnOverlay: Story = {
  args: { showColumns: true },
  render: (args) => (
    <Grid {...args}>
      <Grid.Cell columnSpan={{ xs: 6, lg: 8 }}>
        <Card title="Sales over time">
          <p className="body-md">£287,640.00 this month</p>
        </Card>
      </Grid.Cell>
      <Grid.Cell columnSpan={{ xs: 6, lg: 4 }}>
        <Card title="Top models">
          <p className="body-md">Ford Fiesta, 6 sold</p>
        </Card>
      </Grid.Cell>
    </Grid>
  ),
};
