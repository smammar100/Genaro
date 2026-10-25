import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Banner, Card, iconNames } from "@/components/genaro";
import guidelines from "../docs/Banner.md?raw";

/**
 * Banners carry important messages that stay until they're resolved or
 * dismissed, at the top of a page or inside the card they concern. For a brief
 * confirmation that an action worked, use a `Toast` instead.
 */
const meta = {
  title: "Components/Feedback and status/Banner",
  component: Banner,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "3 vehicles arrive tomorrow",
    children: "L-927, L-931 and L-934 are due at the Leeds site before 10:00. Book their inspections today.",
  },
  argTypes: {
    icon: { control: "select", options: [undefined, ...iconNames] },
    children: { control: "text" },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Information people should know but needn't act on straight away. Info is
 * the default tone.
 * @summary information to note, no urgent action
 */
export const Info: Story = {};

/**
 * A lasting result worth keeping on screen, such as a finished import. For a
 * passing "Saved", use a Toast.
 * @summary lasting results, such as a finished import
 */
export const Success: Story = {
  args: {
    tone: "success",
    title: "Master sheet imported",
    children: "142 vehicles updated and 6 added. Nothing needs your attention.",
  },
};

/**
 * A problem to fix before work can go on, such as an MOT about to run out.
 * Announced to screen readers straight away.
 * @summary problems to fix before going on
 */
export const Warning: Story = {
  args: {
    tone: "warning",
    title: "MOT expires in 9 days",
    children: "OY70 TZG's MOT runs out on 3 November 2026. Book a test before you hand the car over.",
  },
};

/**
 * Something has gone wrong and needs action now, such as an overdue invoice.
 * Keep the critical tone for real problems.
 * @summary something wrong that needs action now
 */
export const Critical: Story = {
  args: {
    tone: "critical",
    title: "Invoice INV-2041 is overdue",
    children: "£16,419.00 was due on 18 October 2026. Record the payment or chase the customer.",
  },
};

/**
 * Give people the fix right in the banner: `action` for the fix, and
 * `secondaryAction` for an alternative or more detail.
 * @summary the fix as a button, plus an alternative
 */
export const WithActions: Story = {
  args: {
    tone: "warning",
    title: "MOT expires in 9 days",
    children: "OY70 TZG's MOT runs out on 3 November 2026. Book a test before you hand the car over.",
    action: { content: "Book MOT", onAction: fn() },
    secondaryAction: { content: "View MOT history", onAction: fn() },
  },
};

/**
 * Messages people can clear once read. The banner doesn't hide itself: remove
 * it in `onDismiss`.
 * @summary messages people can clear once read
 */
export const Dismissible: Story = {
  args: { onDismiss: fn() },
};

/**
 * One-line messages inside a card: without a title the banner takes its
 * compact layout, with a toned icon tile.
 * @summary compact one-line messages inside cards
 */
export const Untitled: Story = {
  args: {
    tone: "critical",
    title: undefined,
    children: "Outstanding finance of £4,210.00. Settle it before you sell the car.",
  },
  render: (args) => (
    <Card title="Vehicle checks">
      <Banner {...args} />
    </Card>
  ),
};
