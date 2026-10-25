import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CalloutCard } from "@/components/genaro";
import guidelines from "../docs/CalloutCard.md?raw";

/**
 * CalloutCard promotes a feature or a next step with a title, one sentence,
 * an illustration and actions. Use one per page at most; for news about the
 * current task use a Banner, and for video or photo content a MediaCard.
 */
const meta = {
  title: "Components/Layout and structure/CalloutCard",
  component: CalloutCard,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "Reach more buyers on Facebook Marketplace",
    children: "Publish adverts from the work list, with photos and prices kept in sync.",
    illustration: "/brands/facebook.svg",
    primaryAction: { content: "Set up Facebook adverts", url: "/advert/channels/facebook" },
    secondaryAction: { content: "Read the guide", url: "/help/facebook-marketplace" },
  },
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof CalloutCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Feature discovery, such as a new advert channel: the title names the
 * benefit, and the actions stay secondary and tertiary so the page's own
 * primary action is the only primary.
 * @summary promote a feature or next step
 */
export const Default: Story = {};

/**
 * A callout people can close once they've read it. Store the dismissal, so
 * the card stays hidden next time.
 * @summary a callout people can dismiss
 */
export const Dismissible: Story = {
  args: { onDismiss: fn() },
};

/**
 * Without an illustration the copy takes the full width, for next steps that
 * have no picture, such as finishing the business details.
 * @summary text-only callouts
 */
export const WithoutIllustration: Story = {
  args: {
    title: "Add your VAT number to invoices",
    children: "Invoices for VAT-qualifying vehicles need it before you can send them.",
    illustration: undefined,
    primaryAction: { content: "Add VAT number", url: "/admin/settings" },
    secondaryAction: undefined,
  },
};
