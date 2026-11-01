import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn, screen } from "storybook/test";
import { Button } from "@/components/genaro";
import type { LeadChannel, User } from "@/lib/types";
import { makeVehicle } from "@/test/factories";
import { CreateLeadModal } from "./create-lead-modal";

type CreateLeadArgs = React.ComponentProps<typeof CreateLeadModal>;

const salesperson = (id: string, name: string): User => ({
  id,
  companyId: "co-0001",
  name,
  email: `${name.split(" ")[0].toLowerCase()}@example.co.uk`,
  role: "sales",
  isSuperUser: false,
  roles: [],
  avatarUrl: null,
  active: true,
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

const channel = (id: string, slug: string, label: string, sortOrder: number): LeadChannel => ({
  id,
  companyId: "co-0001",
  slug,
  label,
  sortOrder,
  enabled: true,
  isSystem: true,
  colour: "#8A8A8A",
  createdAt: "2026-01-05T09:00:00.000Z",
  updatedAt: "2026-01-05T09:00:00.000Z",
});

const stock = [
  makeVehicle({ id: "veh-0804", registration: "EP18HLV", stockId: "L-804", make: "Land Rover", model: "Discovery" }),
  makeVehicle({ id: "veh-0923", registration: "NX69OCV", stockId: "L-923", make: "Jaguar", model: "XE" }),
  makeVehicle({ id: "veh-0126", registration: "NC19EYB", stockId: "CC-0126", make: "BMW", model: "5 Series" }),
  makeVehicle({ id: "veh-0655", registration: "MM17KHD", stockId: "L-10655", make: "Ford", model: "Focus" }),
];

/**
 * Takes a new buyer enquiry on the sales pipeline: who called, the car they
 * want, where they found us and who follows it up. Saving opens the deal in
 * New lead, so the car is required. Closing it throws the lead away, so the
 * next one starts empty.
 */
const meta = {
  title: "App components/Sales/CreateLeadModal",
  component: CreateLeadModal,
  tags: ["autodocs"],
  parameters: {
    docs: { story: { inline: false, height: "760px" } },
  },
  args: {
    open: true,
    onClose: fn(),
    vehicles: stock,
    channels: [
      channel("ch-phone", "phone", "Phone", 1),
      channel("ch-autotrader", "autotrader", "AutoTrader", 2),
      channel("ch-walk-in", "walk_in", "Walk-in", 3),
      channel("ch-other", "other", "Other", 4),
    ],
    users: [salesperson("user-0002", "Sikander Jaffery"), salesperson("user-0003", "Amira Hussain")],
    defaultAssignee: "user-0002",
    draftKey: null,
    onCreate: fn(async () => {}),
  },
  argTypes: {
    vehicles: { control: false },
    channels: { control: false },
    users: { control: false },
  },
  // Controlled: `open` lives in the args, as it would in the page's state.
  render: function CreateLeadStory(args) {
    const [, updateArgs] = useArgs<CreateLeadArgs>();
    return (
      <>
        <Button variant="primary" onClick={() => updateArgs({ open: true })}>
          Create lead
        </Button>
        <CreateLeadModal
          {...args}
          onClose={() => {
            args.onClose();
            updateArgs({ open: false });
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof CreateLeadModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The modal as it opens: empty, assigned to the person taking the call.
 * @summary take a new enquiry from the pipeline
 */
export const Default: Story = {};

/**
 * Creating with fields missing marks each one: a name, a UK phone number, the
 * car and the channel.
 * @summary what it asks for before it saves
 */
export const Required: Story = {
  play: async ({ userEvent }) => {
    // The modal's own button, not the one that opened it.
    const buttons = await screen.findAllByRole("button", { name: "Create lead" });
    await userEvent.click(buttons[buttons.length - 1]);
  },
};

