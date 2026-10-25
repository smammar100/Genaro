import Image from "next/image";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Thumbnail } from "@/components/genaro";
import guidelines from "../docs/Thumbnail.md?raw";

/**
 * Thumbnails preview a vehicle photo or a file in rows, tables and line
 * items. With no image they show a subdued placeholder, so a missing photo URL
 * can be passed as it is. For people, use `Avatar`.
 */
const meta = {
  title: "Components/Images and icons/Thumbnail",
  component: Thumbnail,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { source: "/cars/seed/vehicle-1.png", alt: "Silver 2018 Audi A3 Sportback" },
  argTypes: {
    source: { control: "text" },
    children: { control: false },
  },
} satisfies Meta<typeof Thumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A vehicle photo on its own. Describe the car in `alt` when no text beside it
 * names it.
 * @summary a vehicle photo; describe it in alt
 */
export const Default: Story = {};

/**
 * Four squares: extraSmall (24px) in compact lists, small (40px) in table rows,
 * medium (60px) by default, large (80px) on detail pages.
 * @summary extraSmall 24 · small 40 · medium 60 · large 80
 */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-300)" }}>
      <Thumbnail {...args} size="extraSmall" />
      <Thumbnail {...args} size="small" />
      <Thumbnail {...args} size="medium" />
      <Thumbnail {...args} size="large" />
    </div>
  ),
};

/**
 * In a row next to the vehicle's name, the photo is decorative: leave `alt`
 * empty so screen readers don't read the car twice.
 * @summary in a row beside the name; empty alt
 */
export const InRow: Story = {
  args: { size: "small", alt: undefined },
  render: (args) => (
    <div className="body-md" style={{ display: "flex", alignItems: "center", gap: "var(--space-300)" }}>
      <Thumbnail {...args} />
      <span>2018 Audi A3 Sportback · L-927</span>
    </div>
  ),
};

/**
 * A car with no photos yet: the subdued placeholder shows in place of the
 * image, so rows keep their shape.
 * @summary no photo yet: the placeholder
 */
export const Placeholder: Story = {
  args: { source: undefined, alt: undefined },
};

/**
 * A file rather than a photo, such as a signed invoice: pass an icon name as
 * `source`.
 * @summary files, with an icon instead of an image
 */
export const IconSource: Story = {
  args: { source: "NotesMinor", alt: undefined, size: "small" },
};

/**
 * Your own image element, such as `next/image`, as `children`. Give it a width
 * and height; the frame isn't positioned, so `fill` won't work.
 * @summary your own image element, e.g. next/image
 */
export const CustomImage: Story = {
  args: {
    source: undefined,
    alt: undefined,
    size: "large",
    children: <Image src="/cars/seed/vehicle-1.png" alt="Silver 2018 Audi A3 Sportback" width={80} height={80} />,
  },
};
