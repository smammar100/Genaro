import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KeyboardKey, TextField } from "@/components/genaro";
import guidelines from "../docs/KeyboardKey.md?raw";

/**
 * Keyboard keys show a shortcut as a keycap, in help text, menus and search
 * fields. They only display it; wire the key handler yourself. In a tooltip,
 * use the Tooltip's `suffix` instead.
 */
const meta = {
  title: "Components/Images and icons/KeyboardKey",
  component: KeyboardKey,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { children: "⌘K" },
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof KeyboardKey>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A shortcut on its own, written as the platform shows it: `⌘` on macOS,
 * `Ctrl` on Windows.
 * @summary a shortcut, as the platform writes it
 */
export const Default: Story = {};

/**
 * A shortcut in a sentence of help text. Name the action in words too, since
 * screen readers read symbols like `⌘` unevenly.
 * @summary in help text, with the action in words
 */
export const InText: Story = {
  args: { children: "K" },
  render: (args) => (
    <p className="body-md">
      Press <KeyboardKey>⌘</KeyboardKey> <KeyboardKey {...args} /> to search vehicles, leads and invoices.
    </p>
  ),
};

/**
 * The small key inside a field or a dense row, such as the search field's
 * shortcut hint.
 * @summary small, as a field's shortcut hint
 */
export const Small: Story = {
  args: { size: "small" },
  render: (args) => (
    <TextField
      label="Search"
      labelHidden
      prefix="SearchMinor"
      placeholder="Search regs, stock IDs or customers"
      suffix={<KeyboardKey {...args} />}
    />
  ),
};

/**
 * On dark chrome, such as the top bar, so the key doesn't glare.
 * @summary on dark chrome such as the top bar
 */
export const Dark: Story = {
  args: { dark: true },
  render: (args) => (
    <div
      className="body-md"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-200)",
        padding: "var(--space-200) var(--space-300)",
        borderRadius: "var(--radius-200)",
        background: "var(--bg-inverse)",
        color: "var(--text-inverse)",
      }}
    >
      Search <KeyboardKey {...args} />
    </div>
  ),
};
