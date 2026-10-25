import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button } from "@/components/genaro";
import type { LocationMovement } from "@/lib/types";
import { MovementEditDialog } from "./movement-edit-dialog";

type MovementEditArgs = React.ComponentProps<typeof MovementEditDialog>;

const move = (
  id: string,
  createdAt: string,
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
  createdAt,
  ...extra,
});

/** BD18 HVN's history, oldest first: arrival, a garage visit, back out front, sold. */
const history = [
  move("mov-1", "2026-09-28T10:15:00.000Z", null, "yard"),
  move("mov-2", "2026-10-12T08:40:00.000Z", "yard", "garage", {
    externalVendorId: "ven-kwikfit",
    expectedReturnAt: "2026-10-14T17:00:00.000Z",
    actualReturnAt: "2026-10-15T11:20:00.000Z",
    notes: "Two front tyres and tracking",
  }),
  move("mov-3", "2026-10-15T11:20:00.000Z", "garage", "forecourt"),
  move("mov-4", "2026-10-23T15:05:00.000Z", "forecourt", "sold"),
];

/**
 * Corrects a location move recorded in error, such as the wrong garage or the
 * wrong day. Dates are checked against the moves either side, since the order
 * of the history is the car's history. The history drawer opens it; pass
 * `movement: null` to close it. It saves through the location service itself,
 * so saving doesn't work in Storybook.
 */
const meta = {
  title: "App components/Locations/MovementEditDialog",
  component: MovementEditDialog,
  tags: ["autodocs"],
  parameters: {
    docs: { story: { inline: false, height: "720px" } },
  },
  args: {
    movement: history[1],
    movements: history,
    onOpenChange: fn(),
    actorId: "user-0001",
    companyId: "co-0001",
    onSaved: fn(),
  },
  argTypes: {
    movement: { control: false },
    movements: { control: false },
  },
  // Open while `movement` is set; closing clears it, and the button brings it back.
  render: function MovementEditDialogStory(args, { initialArgs }) {
    const [, updateArgs] = useArgs<MovementEditArgs>();
    return (
      <>
        <Button onClick={() => updateArgs({ movement: initialArgs.movement })}>Edit movement</Button>
        <MovementEditDialog
          {...args}
          onOpenChange={(open) => {
            args.onOpenChange(open);
            if (!open) updateArgs({ movement: null });
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof MovementEditDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A garage visit: its place and time, plus when the car was expected back and
 * when it actually returned, since garage and staff moves are stays.
 * @summary correct a garage or staff stay
 */
export const Default: Story = {};

/**
 * A move between places on site, such as back to the forecourt, has no return
 * times to correct: just the place, the time and the notes.
 * @summary correct an on-site move
 */
export const OnSiteMove: Story = {
  args: { movement: history[2] },
};

/**
 * The move to Sold follows the sale, so its place is locked; only its time and
 * notes can be corrected here. Undo the sale on the master sheet instead.
 * @summary the sale's move: place locked to Sold
 */
export const SaleMove: Story = {
  args: { movement: history[3] },
};
