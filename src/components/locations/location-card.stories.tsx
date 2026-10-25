import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import type { LocationMovement } from "@/lib/types";
import { makeVehicle } from "@/test/factories";
import { LocationCard } from "./location-card";

/** An ISO time `days` ago, so "since" and the day count read the same whenever the story is opened. */
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const move = (
  id: string,
  days: number,
  fromLocation: LocationMovement["fromLocation"],
  toLocation: LocationMovement["toLocation"],
  extra: Partial<LocationMovement> = {},
): LocationMovement => ({
  id,
  vehicleId: "veh-0871",
  fromLocation,
  toLocation,
  externalVendorId: null,
  staffUserId: null,
  expectedReturnAt: null,
  actualReturnAt: null,
  notes: null,
  createdBy: "user-0001",
  createdAt: daysAgo(days),
  ...extra,
});

const vehicle = makeVehicle({
  id: "veh-0871",
  registration: "BD18HVN",
  stockId: "L-871",
  make: "BMW",
  model: "3 Series",
  currentLocation: "forecourt",
  locationSince: daysAgo(6),
});

const recentMovements = [
  move("mov-3", 6, "garage", "forecourt"),
  move("mov-2", 9, "yard", "garage", { externalVendorId: "ven-kwikfit", expectedReturnAt: daysAgo(7) }),
  move("mov-1", 21, null, "yard"),
];

/**
 * A vehicle's location on its detail page: where it is now and since when,
 * then its three latest moves, with buttons to move it and to see the full
 * history. The page owns the move dialog and the history drawer and passes
 * `onMove` and `onViewHistory`. Pass `recentMovements` when the page already
 * has them; otherwise the card fetches them itself. For the location in a
 * list, use `LocationBadge`.
 */
const meta = {
  title: "App components/Locations/LocationCard",
  component: LocationCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "24rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    vehicle,
    recentMovements,
    vendorNames: { "ven-kwikfit": "Kwik Fit Leicester" },
    staffNames: { "user-0003": "Tom Bradley" },
    onMove: fn(),
    onViewHistory: fn(),
  },
  argTypes: {
    vehicle: { control: false },
    recentMovements: { control: false },
  },
} satisfies Meta<typeof LocationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A car back on the forecourt after a garage visit: its place, how long it's
 * been there, and its last three moves, the garage named.
 * @summary where the car is, and its last three moves
 */
export const Default: Story = {};

/**
 * A car away with a member of staff: the move names who has it.
 * @summary away with a member of staff
 */
export const WithStaff: Story = {
  args: {
    vehicle: { ...vehicle, currentLocation: "staff", locationSince: daysAgo(1) },
    recentMovements: [
      move("mov-4", 1, "forecourt", "staff", { staffUserId: "user-0003", expectedReturnAt: daysAgo(-1) }),
      ...recentMovements.slice(0, 2),
    ],
  },
};

/**
 * A customer has the car out on a test drive, which the second line says
 * after the day count.
 * @summary out on a test drive
 */
export const OutForTestDrive: Story = {
  args: {
    vehicle: { ...vehicle, outForTestDrive: true },
  },
};

/**
 * A car with no recorded moves, such as one added before locations were
 * tracked, says so instead of an empty list.
 * @summary no recorded moves
 */
export const NoMovements: Story = {
  args: {
    vehicle: { ...vehicle, currentLocation: "yard", locationSince: daysAgo(0) },
    recentMovements: [],
  },
};

/**
 * For people who can't move vehicles, leave out `onMove` and `onViewHistory`
 * and the card is read-only.
 * @summary read-only, without the move buttons
 */
export const ReadOnly: Story = {
  args: { onMove: undefined, onViewHistory: undefined },
};
