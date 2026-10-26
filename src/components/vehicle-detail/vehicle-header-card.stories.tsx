import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from "@/components/genaro";
import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
import { makeVehicle } from "@/test/factories";
import { VehicleHeaderCard, VehicleStatusMenu } from "./vehicle-header-card";

const vehicle = makeVehicle({
  id: "veh-0124",
  registration: "OY70TZG",
  stockId: "CC-0124",
  make: "BMW",
  model: "3 SERIES",
  year: 2020,
  derivative: "2.0 318d MHT SE Saloon 4dr Diesel Hybrid Auto Euro 6 (s/s) (150 ps)",
  colour: "BLACK",
  mileage: 70624,
  fuelType: "diesel",
  transmission: "automatic",
  receivedDate: "2026-10-23",
  status: "ready",
  daysInStock: 3,
});

/**
 * The vehicle page's header. Back, the plate with the status menu and
 * days-in-stock chip, the name with its variant, and the key facts; then a
 * band showing how far the car is from arrival to sale, the next step with its
 * open to-dos, and the page's actions. The page passes the status menu and
 * chip as `badges`, the next step's button (and Remove from website once
 * sold) as `actions`, and the to-do count the detail tabs fetch.
 */
const meta = {
  title: "App components/Vehicle detail/VehicleHeaderCard",
  component: VehicleHeaderCard,
  tags: ["autodocs"],
  args: {
    vehicle,
    back: { href: "/vehicles", label: "All vehicles" },
    todoCount: 1,
    onOpenTodos: fn(),
  },
  argTypes: {
    vehicle: { control: false },
    badges: { control: false },
    actions: { control: false },
  },
  render: (args) => (
    <VehicleHeaderCard
      {...args}
      badges={
        <>
          <VehicleStatusMenu vehicle={args.vehicle} onStatusChange={fn()} />
          <DaysInStockChip days={args.vehicle.daysInStock} />
        </>
      }
      actions={args.actions ?? <Button variant="primary">Publish listing</Button>}
    />
  ),
} satisfies Meta<typeof VehicleHeaderCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A car prepped and ready to list: four of seven stages done, Publish listing
 * as the next step, and one job still open.
 * @summary ready to list, one job open
 */
export const Default: Story = {};

/**
 * A car that has been listed for ten weeks with four jobs open: the chip turns
 * to warn, and the to-do link opens Things to do.
 * @summary listed, ageing, several jobs open
 */
export const Listed: Story = {
  args: {
    vehicle: { ...vehicle, status: "listed", daysInStock: 74 },
    todoCount: 4,
    actions: <Button variant="primary">View enquiries</Button>,
  },
};

/**
 * Sold and still on the website: no next step, so the band says so, and
 * Remove from website is the only action, in the critical tone.
 * @summary sold, with Remove from website
 */
export const Sold: Story = {
  args: {
    vehicle: { ...vehicle, status: "sold", daysInStock: 41 },
    todoCount: 0,
    actions: <Button tone="critical">Remove from website</Button>,
  },
};

/**
 * A car back from a customer sits outside the line: every stage shows as to
 * come and the label says Returned.
 * @summary returned by a customer
 */
export const Returned: Story = {
  args: {
    vehicle: { ...vehicle, status: "returned", daysInStock: 96 },
    todoCount: 2,
    actions: <Button variant="primary">Re-prep vehicle</Button>,
  },
};
