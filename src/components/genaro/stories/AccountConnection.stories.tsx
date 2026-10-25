import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AccountConnection, Link } from "@/components/genaro";
import guidelines from "../docs/AccountConnection.md?raw";

/**
 * AccountConnection connects or disconnects an outside account, such as an
 * advert channel, on a settings page. It shows whether the account is linked
 * and the one button that changes that; for other settings use a Card.
 */
const meta = {
  title: "Components/Layout and structure/AccountConnection",
  component: AccountConnection,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "eBay Motors",
    action: { content: "Connect eBay", onAction: fn() },
    termsOfService: (
      <p className="body-md">
        By connecting, you agree to the <Link url="/help/ebay-motors-terms">eBay Motors listing terms</Link>.
      </p>
    ),
  },
  argTypes: {
    details: { control: "text" },
    termsOfService: { control: false },
  },
} satisfies Meta<typeof AccountConnection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Not connected yet: the title names the service, and the primary button
 * starts the connection.
 * @summary an account to connect, with a primary button
 */
export const Default: Story = {};

/**
 * Connected: the account's name and avatar, a line of details such as its
 * page, and a secondary button to disconnect.
 * @summary a connected account, with Disconnect
 */
export const Connected: Story = {
  args: {
    title: "Facebook Marketplace",
    connected: true,
    accountName: "Car Capital Ltd",
    avatarUrl: "/brands/facebook.svg",
    details: "facebook.com/carcapital · 38 adverts live",
    action: { content: "Disconnect Facebook", onAction: fn() },
    termsOfService: undefined,
  },
};

/**
 * Connected without an image: the avatar shows the account name's initials.
 * @summary a connected account with initials
 */
export const ConnectedWithInitials: Story = {
  args: {
    connected: true,
    accountName: "Car Capital Ltd",
    details: "carcapital-motors · 38 adverts live",
    action: { content: "Disconnect eBay", onAction: fn() },
    termsOfService: undefined,
  },
};
