import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, SkeletonBodyText, SkeletonDisplayText, SkeletonThumbnail } from "@/components/genaro";
import { SkeletonBox } from "@/components/genaro";
import guidelines from "../docs/Skeleton.md?raw";

/**
 * Skeletons hold the shape of content while it loads, in `loading.tsx` files
 * and Suspense fallbacks: `SkeletonBodyText` for text, `SkeletonDisplayText`
 * for headings, `SkeletonThumbnail` for images and `SkeletonBox` for any
 * other shape, such as a chart. Use `Spinner` when you don't know the shape
 * of what's coming.
 */
const meta = {
  title: "Components/Feedback and status/Skeleton",
  component: SkeletonBodyText,
  subcomponents: { SkeletonDisplayText, SkeletonThumbnail, SkeletonBox },
  tags: ["autodocs"],
  parameters: { guidelines },
} satisfies Meta<typeof SkeletonBodyText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Stands in for a paragraph while it loads. Three lines by default, the last
 * one shorter so it reads as the end of a paragraph.
 * @summary placeholder paragraph, 3 lines by default
 */
export const BodyText: Story = {};

/**
 * One line per table cell or list row, so the placeholder matches the text it
 * replaces.
 * @summary one line for cells and rows
 */
export const SingleLine: Story = {
  args: { lines: 1 },
};

/**
 * Stands in for a heading. Match `size` to the heading it replaces so nothing
 * jumps when the content arrives.
 * @summary placeholder heading, sized to match
 */
export const DisplayText: StoryObj<typeof SkeletonDisplayText> = {
  args: { size: "small" },
  argTypes: {
    size: { control: "select", options: ["small", "medium", "large", "extraLarge"] },
  },
  render: (args) => <SkeletonDisplayText {...args} />,
};

/**
 * Stands in for a vehicle photo. Match `size` to the `Thumbnail` that follows.
 * @summary placeholder image, sized like Thumbnail
 */
export const Thumbnail: StoryObj<typeof SkeletonThumbnail> = {
  args: { size: "medium" },
  argTypes: {
    size: { control: "select", options: ["extraSmall", "small", "medium", "large"] },
  },
  render: (args) => <SkeletonThumbnail {...args} />,
};

/**
 * Stands in for a shape the text and image skeletons don't cover, such as a
 * chart in a report card. Give it the height and radius of what it replaces.
 * @summary any-size placeholder, such as a chart
 */
export const Box: StoryObj<typeof SkeletonBox> = {
  args: { height: 288, radius: "300" },
  argTypes: {
    radius: { control: "select", options: ["0", "050", "100", "150", "200", "300", "400", "500", "750", "full"] },
    width: { control: "text" },
    height: { control: "text" },
    aspectRatio: { control: "text" },
  },
  render: (args) => <SkeletonBox {...args} />,
};

/**
 * Vehicle photos, whose height follows their width: set `aspectRatio`
 * instead of a height, so the tiles keep their shape at any width.
 * @summary photo tiles that keep their shape
 */
export const PhotoGrid: StoryObj<typeof SkeletonBox> = {
  args: { aspectRatio: "4 / 3" },
  render: (args) => (
    <div aria-busy="true" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-300)" }}>
      {[1, 2, 3, 4, 5, 6].map((tile) => (
        <SkeletonBox key={tile} {...args} />
      ))}
    </div>
  ),
};

/**
 * A vehicle's page while it loads: mirror the real layout (heading, photo,
 * details) so nothing moves when the content arrives.
 * @summary a loading vehicle page that mirrors the real one
 */
export const VehiclePage: Story = {
  args: { lines: 4 },
  render: (args) => (
    <Card>
      <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-400)" }}>
        <SkeletonDisplayText size="small" />
        <div style={{ display: "flex", gap: "var(--space-400)" }}>
          <SkeletonThumbnail size="large" />
          <div style={{ flex: 1 }}>
            <SkeletonBodyText {...args} />
          </div>
        </div>
      </div>
    </Card>
  ),
};

/**
 * Rows of a vehicle list while they load, such as a Suspense fallback: a small
 * thumbnail and one line per row.
 * @summary loading list rows
 */
export const ListRows: Story = {
  args: { lines: 1 },
  render: (args) => (
    <Card>
      <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-300)" }}>
        {[1, 2, 3].map((row) => (
          <div key={row} style={{ display: "flex", alignItems: "center", gap: "var(--space-300)" }}>
            <SkeletonThumbnail size="small" />
            <div style={{ flex: 1 }}>
              <SkeletonBodyText {...args} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  ),
};
