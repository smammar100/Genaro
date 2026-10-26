import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { makeVehicle } from "@/test/factories";
import { OverviewStats } from "./overview-stats";

const vehicle = makeVehicle({
  id: "veh-0124",
  registration: "OY70TZG",
  make: "BMW",
  model: "3 SERIES",
  year: 2020,
  daysInStock: 3,
  dailyChargeRate: 5.5,
  listingPrice: null,
  minimumSalePrice: null,
  atTradeValuation: 15412,
  atPartExchangeValuation: 15332,
  atRetailValuation: 16419,
  atValuationAt: "2026-10-23T10:12:00Z",
});

/**
 * The figures at the top of a vehicle's Overview tab, in one card: web price,
 * net profit, days in stock and AutoTrader retail; then AutoTrader's trade,
 * part-ex and retail with when they were pulled and Refresh; then, once the
 * car has a price, where it sits between trade and retail. It sizes its
 * columns to the nearest container, so the tiles go 2 × 2 in a narrow panel.
 */
const meta = {
  title: "App components/Vehicle detail/OverviewStats",
  component: OverviewStats,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="@container">
        <Story />
      </div>
    ),
  ],
  args: { vehicle, webPrice: 0, refreshing: false, onRefresh: fn() },
  argTypes: { vehicle: { control: false } },
} satisfies Meta<typeof OverviewStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A car valued by AutoTrader but not priced yet: no profit, no meter, and the
 * retail tile reads as live market retail.
 * @summary valued, not priced yet
 */
export const NotPriced: Story = {};

/**
 * Priced above AutoTrader retail after ten weeks: the days tile turns to warn
 * and the meter pins the price at the top of the band.
 * @summary priced above market, ageing
 */
export const PricedAboveMarket: Story = {
  args: {
    vehicle: { ...vehicle, listingPrice: 16995, minimumSalePrice: 15950, daysInStock: 74 },
    webPrice: 16995,
  },
};

/**
 * Priced inside the trade to retail band.
 * @summary priced within the market
 */
export const PricedWithinMarket: Story = {
  args: {
    vehicle: { ...vehicle, listingPrice: 16295, minimumSalePrice: 15500 },
    webPrice: 16295,
  },
};

/**
 * A car AutoTrader hasn't valued yet: the row asks for a refresh.
 * @summary not valued yet
 */
export const NotValued: Story = {
  args: {
    vehicle: {
      ...vehicle,
      atTradeValuation: null,
      atPartExchangeValuation: null,
      atRetailValuation: null,
      atValuationAt: null,
    },
  },
};

/**
 * While a refresh is in flight the button spins and can't be pressed twice.
 * @summary refreshing the valuation
 */
export const Refreshing: Story = { args: { refreshing: true } };
