import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListChecks, MapPin, PoundSterling } from "lucide-react";
import { Button } from "@/components/genaro";
import { BandedCard } from "./banded-card";

/**
 * A card with a header band: an icon tile, the title and the card's actions
 * as plain links on the right; the detail sits below. The vehicle Overview
 * sets Pricing, Location and Sales highlights in a row of these so their
 * headers line up. Leave out `actions` for a read-only card.
 */
const meta = {
  title: "App components/Vehicle detail/BandedCard",
  component: BandedCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "24rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    icon: PoundSterling,
    title: "Pricing",
    children: (
      <>
        <div className="flex justify-between body-md">
          <span className="text-(--text-secondary)">Web price</span>
          <span className="font-semibold tabular-nums">£16,995.00</span>
        </div>
        <div className="flex justify-between body-md">
          <span className="text-(--text-secondary)">Floor price</span>
          <span className="tabular-nums">£15,950.00</span>
        </div>
      </>
    ),
    actions: (
      <Button variant="plain" icon="EditMinor">
        Edit
      </Button>
    ),
  },
  argTypes: { icon: { control: false }, children: { control: false }, actions: { control: false } },
} satisfies Meta<typeof BandedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pricing: the prices sit in the body, one per row, and Edit is a link in
 * the header.
 * @summary a card with a header link
 */
export const Default: Story = {};

/**
 * Location's header link moves the car; the body says where it is and since
 * when.
 * @summary a header link that starts a task
 */
export const MoveLink: Story = {
  args: {
    icon: MapPin,
    title: "Location",
    children: <p className="body-md">Currently at Garage, since 22 Oct.</p>,
    actions: (
      <Button variant="plain" icon="ArrowRightMinor">
        Move vehicle
      </Button>
    ),
  },
};

/**
 * A read-only card leaves out `actions`; it still fills its cell so a row
 * stays level.
 * @summary read-only, no actions
 */
export const ReadOnly: Story = {
  args: {
    icon: ListChecks,
    title: "Sales highlights",
    children: <p className="body-md">Mileage, service history, MOT and owners.</p>,
    actions: undefined,
  },
};
