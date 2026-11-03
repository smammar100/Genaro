import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button } from "@/components/genaro";
import { DealParticularsModal } from "./deal-particulars-modal";

type DealParticularsArgs = React.ComponentProps<typeof DealParticularsModal>;

/**
 * Edits a deal's particulars from its page: the agreed total price, the
 * deposit and when it was paid, and the viewing and collection dates. The
 * balance due is worked out from the price and deposit.
 */
const meta = {
  title: "App components/Sales/DealParticularsModal",
  component: DealParticularsModal,
  tags: ["autodocs"],
  parameters: {
    docs: { story: { inline: false, height: "560px" } },
  },
  args: {
    open: true,
    customerName: "Thomas Trainor",
    value: {
      agreedPrice: 38995,
      depositAmount: 1000,
      depositDate: "2026-10-27",
      viewingDate: "2026-10-25",
      collectionDate: "2026-11-08",
    },
    onClose: fn(),
    onSave: fn(async () => {}),
  },
  argTypes: { value: { control: false } },
  // Controlled: `open` lives in the args, as it would in the page's state.
  render: function DealParticularsStory(args) {
    const [, updateArgs] = useArgs<DealParticularsArgs>();
    return (
      <>
        <Button onClick={() => updateArgs({ open: true })}>Edit</Button>
        <DealParticularsModal
          {...args}
          onClose={() => {
            args.onClose();
            updateArgs({ open: false });
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof DealParticularsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A deal with a deposit taken: £38,995 agreed less £1,000 leaves £37,995 due.
 * @summary edit a deal's price, deposit and dates
 */
export const Default: Story = {};

/**
 * A new deal with nothing agreed yet: every field starts blank, and the
 * balance stays empty until there is a price.
 * @summary a deal with nothing agreed yet
 */
export const Empty: Story = {
  args: {
    customerName: "Abhi",
    value: { agreedPrice: null, depositAmount: null, depositDate: null, viewingDate: null, collectionDate: null },
  },
};
