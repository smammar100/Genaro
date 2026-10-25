import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DragHandle } from "./drag-handle";

/**
 * A grip that says "this moves". Put it on anything people can drag to
 * reorder, such as a vehicle's photo tiles; it's shown at rest and firms up
 * when its card (`group/card`) is hovered. It's decoration only: the card
 * stays the drag target, so the grip is hidden from screen readers and takes
 * no focus.
 */
const meta = {
  title: "App components/Shared/DragHandle",
  component: DragHandle,
  tags: ["autodocs"],
} satisfies Meta<typeof DragHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The bare grip, faint until its card is hovered.
 * @summary the grip on its own
 */
export const Default: Story = {};

/**
 * On a photo tile, where the photo fills the tile, the grip sits in a free
 * corner on a small surface chip so it reads over any image. Hover the tile
 * and the cursor turns to a grab.
 * @summary in the corner of a draggable photo tile
 */
export const OnPhotoTile: Story = {
  args: {
    className:
      "absolute bottom-1.5 left-1.5 z-10 rounded-(--radius-100) bg-(--bg-surface) p-0.5 text-(--icon-secondary) shadow-(--shadow-100)",
  },
  render: (args) => (
    <div
      draggable
      className="group/card relative aspect-[4/3] w-48 cursor-grab overflow-hidden rounded-(--radius-200) bg-(--bg-surface-secondary) outline-1 -outline-offset-1 outline-(--border-secondary) active:cursor-grabbing"
    >
      <DragHandle {...args} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cars/seed/vehicle-3.png"
        alt="Toyota Yaris Hybrid, YA21 KPC, front three-quarter"
        className="pointer-events-none h-full w-full object-cover"
      />
    </div>
  ),
};
