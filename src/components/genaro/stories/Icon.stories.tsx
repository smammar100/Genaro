import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Car } from "lucide-react";
import { Icon, iconNames } from "@/components/genaro";
import guidelines from "../docs/Icon.md?raw";

/**
 * Icons draw one of the 60 Genaro glyphs, coloured only through `tone`. Most
 * components take an `icon` prop (Button, Badge, Banner, EmptyState); pass
 * the name there instead of nesting an `Icon`.
 */
const meta = {
  title: "Components/Images and icons/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { source: "NotesMinor" },
  argTypes: {
    source: { control: "select", options: iconNames },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A decorative glyph in the default `icon` ink. Decorative icons are hidden
 * from screen readers.
 * @summary a decorative glyph in the default ink
 */
export const Default: Story = {};

/**
 * Colour icons only through `tone`, never a fill: subdued beside text, success,
 * warning and critical for status, magic only for AI features.
 * @summary colour through tone, never a fill
 */
export const Tones: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-200)" }}>
      <Icon {...args} />
      <Icon {...args} tone="subdued" />
      <Icon {...args} tone="info" />
      <Icon {...args} tone="success" />
      <Icon {...args} tone="warning" />
      <Icon {...args} tone="critical" />
      <Icon {...args} tone="magic" />
    </div>
  ),
};

/**
 * An icon that carries meaning on its own, such as a paid tick with no words
 * beside it. `accessibilityLabel` names it for screen readers.
 * @summary icons that mean something on their own
 */
export const WithAccessibilityLabel: Story = {
  args: { source: "TickMinor", tone: "success", accessibilityLabel: "Paid" },
};

/**
 * A subdued icon before a line of text, where the text carries the meaning
 * and the icon helps people scan.
 * @summary a subdued glyph beside text
 */
export const BesideText: Story = {
  args: { source: "ClockMinor", tone: "subdued" },
  render: (args) => (
    <span className="body-md" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-100)" }}>
      <Icon {...args} />
      Collection booked for 28 October at 14:00
    </span>
  ),
};

/**
 * A glyph the Genaro set doesn't have, such as a car: pass any React
 * element, like a lucide-react icon, as `source`.
 * @summary any React element, e.g. a lucide-react icon
 */
export const ElementSource: Story = {
  args: { source: <Car /> },
};
