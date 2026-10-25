import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, Spinner } from "@/components/genaro";
import guidelines from "../docs/Spinner.md?raw";

/**
 * Spinners show that something is loading when you can't say how long it will
 * take or what shape it will have. Prefer skeletons when you know the layout,
 * `ProgressBar` when you know the percentage, and `Button loading` in buttons.
 */
const meta = {
  title: "Components/Feedback and status/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { accessibilityLabel: "Loading vehicles" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading a whole page or section whose layout isn't known yet. Name what is
 * loading in `accessibilityLabel`.
 * @summary loading a page or section; name what's loading
 */
export const Default: Story = {};

/**
 * Centred in the space the content will fill, such as a card whose rows are
 * still on their way.
 * @summary centred in the card it's loading
 */
export const InCard: Story = {
  args: { accessibilityLabel: "Loading appointments" },
  render: (args) => (
    <Card title="Today's appointments">
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-800)" }}>
        <Spinner {...args} />
      </div>
    </Card>
  ),
};

/**
 * Inline status next to text, such as a sync running in the background. Not
 * for buttons: use `Button loading` there.
 * @summary inline status beside text
 */
export const Small: Story = {
  args: { size: "small", accessibilityLabel: "Syncing master sheet" },
  render: (args) => (
    <div className="body-md" style={{ display: "flex", alignItems: "center", gap: "var(--space-200)" }}>
      <Spinner {...args} />
      <span>Syncing the master sheet…</span>
    </div>
  ),
};
