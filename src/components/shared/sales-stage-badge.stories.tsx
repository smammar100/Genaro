import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SalesStageBadge } from "./status-badge";

/**
 * A deal's stage on the sales pipeline, from new lead to completed sale, as a
 * Badge. Stages are configurable, so the shipped ones have a fixed tone and any
 * stage a dealership adds is neutral. In a data grid use `SalesStageCell`; for
 * a vehicle's own status use `VehicleStatusBadge`.
 */
const meta = {
  title: "App components/Shared/SalesStageBadge",
  component: SalesStageBadge,
  tags: ["autodocs"],
  args: { stage: "new_lead" },
  argTypes: {
    stage: {
      control: "select",
      options: [
        "new_lead",
        "contacted",
        "test_drive",
        "deposit_taken",
        "collection_delivery",
        "completed_sale",
        "lost",
        "offer_made",
      ],
    },
  },
} satisfies Meta<typeof SalesStageBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A lead that's just come in and nobody has spoken to yet.
 * @summary a lead nobody has called yet
 */
export const NewLead: Story = {};

/**
 * A customer someone has spoken to about the car.
 * @summary the customer has been spoken to
 */
export const Contacted: Story = {
  args: { stage: "contacted" },
};

/**
 * A customer who's qualified or booked a viewing. The `test_drive` slug shows
 * as "Qualified / Viewing".
 * @summary qualified, or booked a viewing
 */
export const QualifiedViewing: Story = {
  args: { stage: "test_drive" },
};

/**
 * A customer who's paid a deposit, which also reserves the car.
 * @summary deposit paid; the car is reserved
 */
export const DepositTaken: Story = {
  args: { stage: "deposit_taken" },
};

/**
 * A sale waiting for the customer to collect the car, or for delivery.
 * @summary waiting for collection or delivery
 */
export const CollectionDelivery: Story = {
  args: { stage: "collection_delivery" },
};

/**
 * A sale that's finished and paid.
 * @summary the sale is finished
 */
export const CompletedSale: Story = {
  args: { stage: "completed_sale" },
};

/**
 * A deal that didn't go ahead. Neutral, so a lost deal doesn't shout in a
 * list.
 * @summary a deal that didn't go ahead
 */
export const Lost: Story = {
  args: { stage: "lost" },
};

/**
 * A stage the dealership added itself ("awaiting_finance"). Its slug is read
 * as words and the badge is neutral.
 * @summary custom stages: neutral, slug read as words
 */
export const CustomStage: Story = {
  args: { stage: "awaiting_finance" },
};
