import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MediaCard, VideoThumbnail } from "@/components/genaro";
import guidelines from "../docs/MediaCard.md?raw";

/**
 * MediaCard pairs an image or a video with a title, a description and
 * actions, for walkthroughs and announcements. It's already a card, so don't
 * wrap it in Card; for a promotion with a small illustration use CalloutCard.
 */
const meta = {
  title: "Components/Layout and structure/MediaCard",
  component: MediaCard,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "Photograph a car for its advert",
    description: "A three-minute walkthrough of the 20 shots buyers look for, from the dashboard to the tyres.",
    primaryAction: { content: "Watch the walkthrough", url: "/help/advert-photos" },
    children: <VideoThumbnail thumbnailUrl="/cars/seed/vehicle-3.png" videoLength={184} />,
  },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof MediaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Media above the text, for narrow columns such as a one-third sidebar on a
 * dashboard.
 * @summary media on top, for narrow columns
 */
export const Default: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "320px" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Media on the left (40%) and the text beside it, for wide columns, such as a
 * vehicle announced on the dashboard.
 * @summary media beside the text, for wide columns
 */
export const Portrait: Story = {
  args: {
    portrait: true,
    title: "Just in: 2014 Audi A4 2.0 TFSI Black Edition",
    description: "L-931 · 61,240 miles · £8,995.00. Photos are done and the advert is ready to publish.",
    primaryAction: { content: "Review advert", url: "/advert/work-list?vehicle=L-931" },
    children: (
      <img
        src="/cars/seed/vehicle-3.png"
        alt="Black 2014 Audi A4 saloon, front three-quarter view"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    ),
  },
};

/**
 * A tertiary second action beside the default one, for a lighter alternative
 * such as reading instead of watching.
 * @summary a lighter second action
 */
export const WithSecondaryAction: Story = {
  args: {
    secondaryAction: { content: "Read the checklist", url: "/help/advert-photos/checklist" },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "320px" }}>
        <Story />
      </div>
    ),
  ],
};
