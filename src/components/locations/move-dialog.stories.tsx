import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn, screen } from "storybook/test";
import { Button } from "@/components/genaro";
import type { User, Vendor } from "@/lib/types";
import { makeVehicle } from "@/test/factories";
import { MoveDialog } from "./move-dialog";

type MoveDialogArgs = React.ComponentProps<typeof MoveDialog>;

const staffMember = (id: string, name: string, active = true): User => ({
  id,
  companyId: "co-0001",
  name,
  email: `${name.split(" ")[0].toLowerCase()}@example.co.uk`,
  role: "sales",
  isSuperUser: false,
  roles: [],
  avatarUrl: null,
  active,
  invitedAt: null,
  acceptedAt: null,
  lastLoginAt: null,
  twoStepEnabled: false,
  creationMode: "direct",
  passwordResetRequired: false,
  activatedAt: null,
  onboardingCompletedAt: null,
  createdAt: "2026-01-05T09:00:00.000Z",
});

const vendors: Vendor[] = [
  { id: "ven-kwikfit", companyId: "co-0001", name: "Kwik Fit Leicester", phone: "0116 253 0011", speciality: "tyres", active: true },
  { id: "ven-midlands", companyId: "co-0001", name: "Midlands Auto Electrics", phone: "0116 262 4410", speciality: "electrical", active: true },
  { id: "ven-smart", companyId: "co-0001", name: "Smart Repair Leicester", phone: "0116 287 9902", speciality: "bodywork", active: true },
];

const users: User[] = [
  staffMember("user-0002", "Amira Hussain"),
  staffMember("user-0003", "Tom Bradley"),
  staffMember("user-0004", "Chloe Evans"),
];

/**
 * Moves a vehicle to another location: forecourt, yard, garage, staff or
 * courtesy car. Garage and staff moves ask for the workshop or the person and
 * when the car is due back. The vehicle page opens it from `LocationCard`'s
 * "Move vehicle". It saves through the location service itself, so saving
 * doesn't work in Storybook.
 */
const meta = {
  title: "App components/Locations/MoveDialog",
  component: MoveDialog,
  tags: ["autodocs"],
  parameters: {
    docs: { story: { inline: false, height: "720px" } },
  },
  args: {
    open: true,
    onOpenChange: fn(),
    vehicle: makeVehicle({
      id: "veh-0871",
      registration: "BD18 HVN",
      stockId: "L-871",
      make: "BMW",
      model: "3 Series",
      currentLocation: "forecourt",
      locationSince: "2026-10-19T09:30:00.000Z",
    }),
    vendors,
    users,
    actorId: "user-0001",
    companyId: "co-0001",
    onSuccess: fn(),
  },
  argTypes: {
    vehicle: { control: false },
    vendors: { control: false },
    users: { control: false },
  },
  // Controlled: `open` lives in the args, as it would in the page's state.
  render: function MoveDialogStory(args) {
    const [, updateArgs] = useArgs<MoveDialogArgs>();
    return (
      <>
        <Button icon="ArrowRightMinor" onClick={() => updateArgs({ open: true })}>
          Move vehicle
        </Button>
        <MoveDialog
          {...args}
          onOpenChange={(open) => {
            args.onOpenChange(open);
            updateArgs({ open });
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof MoveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The dialog as it opens: where the car is now and since when, the places it
 * can go (its current one is disabled), and an optional note. "Move vehicle"
 * waits for a destination.
 * @summary pick where the car is going
 */
export const Default: Story = {};

/**
 * Sending a car to a garage asks which workshop and when it's due back; both
 * are required before it can move.
 * @summary a garage move: workshop and return time
 */
export const ToGarage: Story = {
  play: async ({ userEvent }) => {
    await userEvent.click(await screen.findByRole("radio", { name: "Garage" }));
  },
};

/**
 * Handing a car to a member of staff asks who has it and when it's due back.
 * @summary a staff move: who has it, and until when
 */
export const ToStaff: Story = {
  play: async ({ userEvent }) => {
    await userEvent.click(await screen.findByRole("radio", { name: "Staff" }));
  },
};
