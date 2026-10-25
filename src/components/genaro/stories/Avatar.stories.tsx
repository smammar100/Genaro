import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "@/components/genaro";
import guidelines from "../docs/Avatar.md?raw";

/**
 * Avatars stand for a customer, a member of staff or a company in lists,
 * timelines and the top bar. Pass `name`: it picks the initials and a colour
 * that stays the same for that person everywhere.
 */
const meta = {
  title: "Components/Images and icons/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { name: "Sophie Bennett" },
  argTypes: {
    label: { control: "text" },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A person, from their `name`: two initials and a colour that's always the
 * same for that name.
 * @summary a person's initials and colour, from their name
 */
export const Default: Story = {};

/**
 * The avatar with the person's name beside it, such as the salesperson on a
 * lead. The label is announced; the avatar is hidden from screen readers.
 * @summary avatar plus name, e.g. a lead's owner
 */
export const WithLabel: Story = {
  args: { name: "Daniel Okafor", label: "Daniel Okafor", size: "sm" },
};

/**
 * Someone with no name on record yet, such as a walk-in customer: the grey
 * silhouette shows.
 * @summary no name yet: the grey silhouette
 */
export const Placeholder: Story = {
  args: { name: undefined, accessibilityLabel: "Walk-in customer" },
};

/**
 * A company whose first two words give the wrong initials, such as a finance
 * provider: set `initials` and an accessible name yourself.
 * @summary companies: set initials yourself
 */
export const CustomInitials: Story = {
  args: {
    name: "The Car Finance Company",
    initials: "CF",
    accessibilityLabel: "The Car Finance Company",
    size: "lg",
  },
};

/**
 * Five sizes: xs (20px) and sm (24px) in dense rows and beside labels, md
 * (28px) by default, lg (32px) and xl (40px) in headers and profiles.
 * @summary xs 20 · sm 24 · md 28 · lg 32 · xl 40
 */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
      <Avatar {...args} size="xs" />
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
      <Avatar {...args} size="xl" />
    </div>
  ),
};
