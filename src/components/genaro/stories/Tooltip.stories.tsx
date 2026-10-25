import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Tooltip } from "@/components/genaro";
import guidelines from "../docs/Tooltip.md?raw";

/**
 * Tooltips name icon-only buttons and reveal truncated text while the trigger
 * is hovered or focused. Supplementary only: they may never show on touch
 * screens, so anything people need belongs on the page itself.
 */
const meta = {
  title: "Components/Feedback and status/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { guidelines },
  // Kept open so the docs page shows it; leave `active` off in the app.
  args: {
    content: "Edit vehicle",
    active: true,
    children: <Button icon="EditMinor" accessibilityLabel="Edit vehicle" />,
  },
  argTypes: {
    children: { control: false },
    content: { control: "text" },
  },
  // Room for the bubble on every side, since it doesn't flip at the edges.
  decorators: [
    (Story) => (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-1200) var(--space-3200)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Names an icon-only button. The button still needs its own
 * `accessibilityLabel`, because screen readers may not announce the tooltip.
 * @summary names an icon-only button
 */
export const IconButton: Story = {};

/**
 * How it behaves in the app: without `active`, it opens while the trigger is
 * hovered or focused. Hover the button to see it.
 * @summary opens on hover and focus (the app default)
 */
export const OnHover: Story = {
  args: { active: undefined },
};

/**
 * Teaches the keyboard shortcut for an action: `suffix` shows it as a
 * KeyboardKey after the text.
 * @summary teaches a keyboard shortcut ("⌘K")
 */
export const WithShortcut: Story = {
  args: {
    content: "Search vehicles",
    suffix: "⌘K",
    children: <Button icon="SearchMinor" accessibilityLabel="Search vehicles" />,
  },
};

/**
 * A side with room for the bubble, such as below a button in the top bar. It
 * doesn't flip at the viewport edge, so pick the side yourself.
 * @summary choose a side with room; it doesn't flip
 */
export const PreferredPosition: Story = {
  args: { preferredPosition: "below" },
};

/**
 * Reveals text cut short by truncation, such as a long vehicle name in a
 * narrow column. Make the trigger focusable so keyboard users can open it.
 * @summary reveals truncated text
 */
export const TruncatedText: Story = {
  args: {
    content: "2018 Audi A3 Sportback 1.6 TDI SE Technik 5dr",
    children: (
      <span
        tabIndex={0}
        className="body-md"
        style={{
          maxWidth: "var(--space-3200)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        2018 Audi A3 Sportback 1.6 TDI SE Technik 5dr
      </span>
    ),
  },
};
