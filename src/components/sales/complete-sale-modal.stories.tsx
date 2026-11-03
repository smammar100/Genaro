import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn, screen } from "storybook/test";
import { Button } from "@/components/genaro";
import { enquirySourceOptions } from "@/lib/sale-confirm";
import { makeVehicle } from "@/test/factories";
import { CompleteSaleModal } from "./complete-sale-modal";

type CompleteSaleArgs = React.ComponentProps<typeof CompleteSaleModal>;

/**
 * Completes a sale from the pipeline or the deal page. It asks what the
 * master sheet records about the sale (date, price, where the buyer came
 * from, value added) and then marks the car sold.
 */
const meta = {
  title: "App components/Sales/CompleteSaleModal",
  component: CompleteSaleModal,
  tags: ["autodocs"],
  parameters: {
    docs: { story: { inline: false, height: "560px" } },
  },
  args: {
    open: true,
    customerName: "Thomas Trainor",
    vehicle: makeVehicle({
      registration: "MX73HLV",
      make: "TOYOTA",
      model: "LAND CRUISER",
      valueAddition: 255,
      legacySerialNumber: null,
    }),
    stageLabel: "Completed Sale",
    defaultPrice: 38995,
    defaultSource: "AUTO TRADER",
    sourceOptions: enquirySourceOptions([], "AUTO TRADER"),
    onClose: fn(),
    onConfirm: fn(async () => {}),
  },
  argTypes: {
    vehicle: { control: false },
    sourceOptions: { control: false },
  },
  // Controlled: `open` lives in the args, as it would in the page's state.
  render: function CompleteSaleStory(args) {
    const [, updateArgs] = useArgs<CompleteSaleArgs>();
    return (
      <>
        <Button variant="primary" onClick={() => updateArgs({ open: true })}>
          Mark as sold
        </Button>
        <CompleteSaleModal
          {...args}
          onClose={() => {
            args.onClose();
            updateArgs({ open: false });
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof CompleteSaleModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * As it opens from a deal: today's date, the deal's agreed price, the lead's
 * channel in the sheet's wording, and the car's Things to Do total.
 * @summary complete a sale with its master sheet details
 */
export const Default: Story = {};

/**
 * A deal with no price yet: saving marks the missing price instead of
 * marking the car sold.
 * @summary what it needs before the car is marked sold
 */
export const Required: Story = {
  args: { defaultPrice: null, defaultSource: null },
  play: async ({ userEvent }) => {
    // The modal's own button, not the one that opened it.
    const buttons = await screen.findAllByRole("button", { name: "Mark as sold" });
    await userEvent.click(buttons[buttons.length - 1]);
  },
};
