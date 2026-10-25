import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  Button,
  ColorPicker,
  Popover,
  TextField,
  hsbToHex,
  type ColorPickerProps,
  type HSBAColor,
} from "@/components/genaro";
import guidelines from "../docs/ColorPicker.md?raw";

/** Keeps the picked colour in args, so the picker and Controls stay in step. */
function useColorArg(args: ColorPickerProps) {
  const [, updateArgs] = useArgs<ColorPickerProps>();
  return (color: HSBAColor) => {
    updateArgs({ color });
    args.onChange?.(color);
  };
}

/**
 * Picks a colour by dragging on a saturation and brightness square and a hue
 * slider, such as the accent colour on printed invoices. It is pointer-only,
 * so always pair it with a text field that shows the value.
 */
const meta = {
  title: "Components/Forms/ColorPicker",
  component: ColorPicker,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { color: { hue: 210, saturation: 0.8, brightness: 0.6 }, onChange: fn() },
  render: function Render(args) {
    const onChange = useColorArg(args);
    return <ColorPicker {...args} onChange={onChange} />;
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pick a colour by eye. Values are hue, saturation and brightness; convert
 * them with `hsbToHex` to show or save them.
 * @summary pick a colour by eye; values are HSB
 */
export const Default: Story = {};

/**
 * The picker with a field showing its hex value, so keyboard and screen
 * reader users can read it and the form can post it.
 * @summary the picker paired with its hex value
 */
export const WithHexField: Story = {
  render: function Render(args) {
    const onChange = useColorArg(args);
    const color = args.color ?? { hue: 0, saturation: 0, brightness: 0 };
    return (
      <div style={{ display: "grid", gap: "var(--space-300)", justifyItems: "start" }}>
        <ColorPicker {...args} onChange={onChange} />
        <TextField
          label="Invoice accent colour"
          name="accentColour"
          value={hsbToHex(color.hue, color.saturation, color.brightness)}
          readOnly
        />
      </div>
    );
  },
};

/**
 * An alpha slider for colours that sit over other content, such as an overlay
 * on advert photos. Leave it off when transparency means nothing.
 * @summary adds an alpha slider for transparency
 */
export const AllowAlpha: Story = {
  args: { allowAlpha: true, color: { hue: 210, saturation: 0.8, brightness: 0.6, alpha: 0.6 } },
};

/**
 * The square grows to fill its container, for a panel where the picker is the
 * main content.
 * @summary fills its container in a panel
 */
export const FullWidth: Story = {
  args: { fullWidth: true },
};

/**
 * Opened from a button that shows the current colour, so the picker only
 * takes room while someone is choosing.
 * @summary in a Popover, opened from a swatch button
 */
export const InPopover: Story = {
  parameters: { docs: { story: { inline: false, height: "360px" } } },
  render: function Render(args) {
    const onChange = useColorArg(args);
    const [open, setOpen] = React.useState(true);
    const color = args.color ?? { hue: 0, saturation: 0, brightness: 0 };
    const swatch = (
      <span
        style={{
          display: "block",
          width: "var(--space-400)",
          height: "var(--space-400)",
          borderRadius: "var(--radius-100)",
          background: hsbToHex(color.hue, color.saturation, color.brightness),
        }}
      />
    );
    return (
      <Popover
        active={open}
        onClose={() => setOpen(false)}
        sectioned
        activator={
          <Button disclosure icon={swatch} onClick={() => setOpen((o) => !o)}>
            Change accent colour
          </Button>
        }
      >
        <ColorPicker {...args} onChange={onChange} />
      </Popover>
    );
  },
};
