import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { VehicleImage } from "./vehicle-image";

/** Holds a card or hero image at the width of the slot it sits in. */
const slot = (width: string): Decorator =>
  function Slot(Story) {
    return (
      <div style={{ width, maxWidth: "100%" }}>
        <Story />
      </div>
    );
  };

/**
 * A vehicle's photo at one of three sizes: a thumbnail for rows, a card image,
 * or the hero on a vehicle page. A vehicle with no photo gets a striped
 * placeholder with its plate, so a row or card still looks complete. Photos
 * are switched off for Phase 1 (`PHOTOS_ENABLED`): keep any image behind that
 * flag, and make sure the layout reads without it.
 */
const meta = {
  title: "App components/Shared/VehicleImage",
  component: VehicleImage,
  tags: ["autodocs"],
  args: {
    vehicle: { id: "veh-0927", registration: "OY70 TZG", heroImageUrl: "/cars/seed/vehicle-1.png" },
    variant: "card",
    alt: "Ford Fiesta ST-Line, OY70 TZG",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["thumb", "card", "hero"] },
    // Other angles are generated on demand through the app's photo API.
    angle: { control: false },
  },
} satisfies Meta<typeof VehicleImage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The card image, 16:10, filling the width of its slot, for vehicle cards on
 * the stock and work-list pages.
 * @summary the image on a vehicle card
 */
export const Card: Story = {
  decorators: [slot("22.5rem")],
};

/**
 * A 64px thumbnail, 4:3, beside a vehicle's name in a table row or a list.
 * @summary a small thumbnail for rows and lists
 */
export const Thumb: Story = {
  args: {
    variant: "thumb",
    vehicle: { id: "veh-0958", registration: "WR22 FNM", heroImageUrl: "/cars/seed/vehicle-4.png" },
    alt: "Kia Sportage GT-Line, WR22 FNM",
  },
};

/**
 * The 16:9 hero at the top of a vehicle's page.
 * @summary the hero on a vehicle page
 */
export const Hero: Story = {
  args: {
    variant: "hero",
    vehicle: { id: "veh-0919", registration: "LN20 UJE", heroImageUrl: "/cars/seed/vehicle-7.png" },
    alt: "Audi A3 Sportback, LN20 UJE",
  },
  decorators: [slot("45rem")],
};

/**
 * A vehicle with no photo yet, such as stock imported from a CSV: a striped
 * placeholder with a car outline and the plate, so the card still says which
 * car it is.
 * @summary no photo yet: a placeholder with the plate
 */
export const NoImage: Story = {
  args: {
    vehicle: { id: "veh-0905", registration: "KM19 XRT", heroImageUrl: null },
    alt: undefined,
  },
  decorators: [slot("22.5rem")],
};

/**
 * A thumbnail with no photo shows the car outline only; the row beside it
 * already names the vehicle.
 * @summary a thumbnail with no photo
 */
export const NoImageThumb: Story = {
  args: {
    variant: "thumb",
    vehicle: { id: "veh-0905", registration: "KM19 XRT", heroImageUrl: null },
    alt: undefined,
  },
};
