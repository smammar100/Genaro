import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, ProgressBar } from "@/components/genaro";
import guidelines from "../docs/ProgressBar.md?raw";

/**
 * Progress bars show how far a task with a known end has got: an import, a
 * car's preparation, a monthly target. Pair the bar with text that says what's
 * done ("3 of 5 jobs complete"). For unknown durations use `Spinner`.
 */
const meta = {
  title: "Components/Feedback and status/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { progress: 40, accessibilityLabel: "Master sheet import progress" },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 100, step: 1 } },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A task under way with a known end, such as an import. Name the bar in
 * `accessibilityLabel`; the default tone is highlight.
 * @summary a task under way with a known end
 */
export const Default: Story = {};

/**
 * The bar with the text that says what's done, inside a card. Small bars sit
 * well in cards and lists.
 * @summary in a card, with the count as text
 */
export const WithLabel: Story = {
  args: { progress: 60, size: "small", tone: "primary", accessibilityLabel: "Preparation progress" },
  render: (args) => (
    <Card title="Preparation for OY70 TZG">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-200)" }}>
        <span className="body-sm" style={{ color: "var(--text-secondary)" }}>
          3 of 5 jobs complete
        </span>
        <ProgressBar {...args} />
      </div>
    </Card>
  ),
};

/**
 * Switch to success when the task is complete, so people see at a glance that
 * it's done.
 * @summary a finished task
 */
export const Success: Story = {
  args: { progress: 100, tone: "success" },
};

/**
 * Switch to critical when the task is failing or off track, such as an import
 * that stopped partway.
 * @summary a failing or stalled task
 */
export const Critical: Story = {
  args: { progress: 25, tone: "critical" },
};

/**
 * Three heights: small (8px) in cards and lists, medium (16px) by default,
 * large (32px) for a page's one main task.
 * @summary small 8px, medium 16px, large 32px
 */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-400)" }}>
      <ProgressBar {...args} size="small" />
      <ProgressBar {...args} size="medium" />
      <ProgressBar {...args} size="large" />
    </div>
  ),
};

/**
 * A static value in a dense list, such as each salesperson's monthly target:
 * turn off the width transition so rows don't animate on load.
 * @summary static values in dense lists
 */
export const NotAnimated: Story = {
  args: { progress: 64, size: "small", tone: "success", animated: false, accessibilityLabel: "Monthly sales target" },
};
