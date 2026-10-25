import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LocationBadge } from "./location-badge";

/**
 * Where a vehicle is, in a word ("Forecourt"), with an "Off-site" marker when
 * it's at a garage, with a member of staff or out as a courtesy car, and a
 * clock while a customer has it on a test drive. Hover either marker for who
 * has it and when it's due back. Use it in vehicle lists and cards; for the
 * location with its recent moves, use `LocationCard`.
 */
const meta = {
  title: "App components/Locations/LocationBadge",
  component: LocationBadge,
  tags: ["autodocs"],
  args: { location: "forecourt" },
  argTypes: {
    location: {
      control: "select",
      options: ["forecourt", "yard", "garage", "staff", "courtesy_car", "sold"],
    },
  },
} satisfies Meta<typeof LocationBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A car on site, on the forecourt or in the yard: just the place's name.
 * @summary on site: the place's name
 */
export const OnSite: Story = {};

/**
 * A car away at a garage. The critical dot says it's off site; hover it for
 * the workshop.
 * @summary off site at a garage; hover for the workshop
 */
export const AtGarage: Story = {
  args: { location: "garage", workshopName: "Kwik Fit Leicester" },
};

/**
 * A car with a member of staff, such as for a valet run. Hover the marker for
 * who has it and when it's due back.
 * @summary with a member of staff, due back later
 */
export const WithStaff: Story = {
  args: { location: "staff", staffName: "Tom Bradley", expectedReturnAt: "2026-10-27T16:00:00Z" },
};

/**
 * A car lent to a customer as a courtesy car while theirs is in for work.
 * @summary lent out as a courtesy car
 */
export const CourtesyCar: Story = {
  args: { location: "courtesy_car" },
};

/**
 * A customer has the car on a test drive: a clock after the place, with when
 * it's due back on hover.
 * @summary out on a test drive; hover for when it's back
 */
export const OutForTestDrive: Story = {
  args: { outForTestDrive: true, testDriveExpectedBackAt: "2026-10-25T15:30:00Z" },
};

/**
 * In tight spots, such as a vehicle card's facts, `compact` drops the
 * "Off-site" word and keeps the dot.
 * @summary just the dot, for tight spots
 */
export const Compact: Story = {
  args: { location: "garage", workshopName: "Kwik Fit Leicester", compact: true },
};

/**
 * A sold car is recorded at "Sold", which the master sheet sets; no one moves a
 * car there by hand.
 * @summary sold, set by the master sheet
 */
export const Sold: Story = {
  args: { location: "sold" },
};
