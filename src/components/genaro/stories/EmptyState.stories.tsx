import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Car } from "lucide-react";
import { EmptyState, iconNames } from "@/components/genaro";
import guidelines from "../docs/EmptyState.md?raw";

/**
 * Empty states explain why a page or section has nothing in it and what to do
 * next: on first use, or when a search or filter finds nothing. They draw their
 * own card, so don't wrap them in `Card`.
 */
const meta = {
  title: "Components/Feedback and status/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    icon: <Car />,
    heading: "Add your first vehicle",
    children: "Book a car in when it arrives and it appears here, ready for its inspection.",
    action: { content: "Add vehicle", onAction: fn() },
  },
  argTypes: {
    icon: { control: "select", options: [undefined, ...iconNames] },
    children: { control: "text" },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * First use of a page, with the one action that fills it. The heading says
 * what people can do; the body says what will appear.
 * @summary first use, with the action that fills the page
 */
export const FirstUse: Story = {};

/**
 * A second way to start, such as importing the master sheet instead of adding
 * cars one by one. It sits left of the primary action.
 * @summary an alternative way to start
 */
export const WithSecondaryAction: Story = {
  args: {
    secondaryAction: { content: "Import master sheet", onAction: fn() },
  },
};

/**
 * A search or filter that found nothing. Say so, and offer the way back.
 * @summary no results after a search or filter
 */
export const NoResults: Story = {
  args: {
    icon: "SearchMinor",
    heading: "No vehicles found",
    children: "Try another reg, stock ID or make, or clear the filters.",
    action: { content: "Clear filters", onAction: fn() },
  },
};

/**
 * A short note under the actions, such as when new leads will turn up.
 * @summary a short note under the actions
 */
export const WithFooter: Story = {
  args: {
    icon: "CustomersMinor",
    heading: "No leads yet",
    children: "Enquiries from AutoTrader, eBay and your website appear here as they come in.",
    action: { content: "Add lead", onAction: fn() },
    footerContent: "New enquiries sync every 15 minutes.",
  },
};

/**
 * Lets the text run wider than 400px, for wide layouts where a narrow column
 * would look lost.
 * @summary text wider than 400px, for wide layouts
 */
export const FullWidth: Story = {
  args: {
    icon: "ClockMinor",
    heading: "No appointments today",
    children: "Test drives, handovers and collections you book for today appear here, in time order.",
    action: { content: "Book appointment", onAction: fn() },
    fullWidth: true,
  },
};
