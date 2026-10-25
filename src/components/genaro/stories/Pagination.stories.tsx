import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Pagination } from "@/components/genaro";
import guidelines from "../docs/Pagination.md?raw";

/**
 * Previous and next buttons for a paged list, with an optional label between
 * them. Put it under a list; `IndexTable` and `Page` take a `pagination` prop
 * and draw it for you.
 */
const meta = {
  title: "Components/App chrome and navigation/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    hasPrevious: true,
    hasNext: true,
    label: "Page 2 of 26",
    onPrevious: fn(),
    onNext: fn(),
  },
  argTypes: { label: { control: "text" } },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Paging through a long list in the middle, where both directions are open.
 * Change pages in `onPrevious` and `onNext`.
 * @summary paging a long list, both ways open
 */
export const Default: Story = {};

/**
 * On the first page Previous is disabled; it stays disabled unless
 * `hasPrevious` is true. The last page does the same with Next.
 * @summary the first page: Previous disabled
 */
export const FirstPage: Story = {
  args: { hasPrevious: false, label: "Page 1 of 26" },
};

/**
 * Says which rows are showing out of how many, as the vehicle list does.
 * @summary which rows are showing ("51–100 of 1,284")
 */
export const RangeLabel: Story = {
  args: { label: "51–100 of 1,284" },
};

/**
 * With URLs the arrows are links, so paging works from a Server Component
 * that reads `?page=` from the URL.
 * @summary links to `?page=`, for Server Components
 */
export const AsLinks: Story = {
  args: {
    previousURL: "/vehicles?page=1",
    nextURL: "/vehicles?page=3",
    onPrevious: undefined,
    onNext: undefined,
  },
};

/**
 * Just the arrows, for previous and next record on a detail page, where the
 * position matters less than the next car.
 * @summary arrows only, for previous and next record
 */
export const WithoutLabel: Story = {
  args: { label: undefined },
};
