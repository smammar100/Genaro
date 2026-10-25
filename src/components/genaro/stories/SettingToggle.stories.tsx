import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { SettingToggle, type SettingToggleProps } from "@/components/genaro";
import guidelines from "../docs/SettingToggle.md?raw";

/**
 * A card that turns one setting on or off straight away, with an On or Off
 * badge and a single button. Place it directly in the layout. Settings saved
 * with a form are Checkboxes instead.
 */
const meta = {
  title: "Components/Forms/SettingToggle",
  component: SettingToggle,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    title: "Appointment reminders",
    children: "Texts customers the day before a test drive or a handover.",
    enabled: false,
    onToggle: fn(),
  },
  argTypes: {
    title: { control: "text" },
    children: { control: "text" },
  },
  // The button flips `enabled` in args, as your onToggle would.
  render: function Render(args) {
    const [, updateArgs] = useArgs<SettingToggleProps>();
    return (
      <SettingToggle
        {...args}
        onToggle={() => {
          updateArgs({ enabled: !args.enabled });
          args.onToggle?.();
        }}
      />
    );
  },
} satisfies Meta<typeof SettingToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A setting that is off. The primary button turns it on; the body says what it
 * does.
 * @summary a setting that is off, with "Turn on"
 */
export const Off: Story = {};

/**
 * A setting that is on, with a success badge and a secondary "Turn off".
 * @summary a setting that is on, with "Turn off"
 */
export const On: Story = {
  args: { enabled: true },
};
