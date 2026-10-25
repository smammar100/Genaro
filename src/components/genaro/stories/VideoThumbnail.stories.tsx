import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MediaCard, VideoThumbnail } from "@/components/genaro";
import guidelines from "../docs/VideoThumbnail.md?raw";

/**
 * Video thumbnails show a video's poster with a play button and its length,
 * usually as the media of a `MediaCard`. They only draw the poster: start the
 * video yourself in `onClick`. For still photos, use `Thumbnail`.
 */
const meta = {
  title: "Components/Images and icons/VideoThumbnail",
  component: VideoThumbnail,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { thumbnailUrl: "/cars/seed/vehicle-1.png", videoLength: 156, onClick: fn() },
  // The poster fills its container at 16:9; keep it to a card's width here.
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "calc(var(--space-1000) * 9)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VideoThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A video people haven't watched, such as a car's walkaround. Always pass
 * `videoLength` so they see the duration before they press play.
 * @summary an unwatched video, with its length
 */
export const Default: Story = {};

/**
 * A video people started and left, so they can pick up where they stopped:
 * `videoProgress` draws a bar along the bottom.
 * @summary partly watched: shows how far people got
 */
export const WithProgress: Story = {
  args: { videoProgress: 60 },
};

/**
 * A video with no poster yet, such as a walkaround still processing: the play
 * button sits on a plain fill.
 * @summary no poster yet: a plain fill
 */
export const NoPoster: Story = {
  args: { thumbnailUrl: undefined },
};

/**
 * Where it usually sits: as the media of a MediaCard, whose title names the
 * video, since the button itself is only "Play video".
 * @summary as a MediaCard's media, titled by the card
 */
export const InMediaCard: Story = {
  render: (args) => (
    <MediaCard
      title="Walkaround: 2018 Audi A3 Sportback"
      description="A short tour of OY70 TZG for buyers who can't get to the showroom."
      primaryAction={{ content: "Send to customer", onAction: fn() }}
    >
      <VideoThumbnail {...args} />
    </MediaCard>
  ),
};
