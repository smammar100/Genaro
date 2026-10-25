import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RegPlate } from "./reg-plate";

/**
 * A UK registration plate: plate yellow, a monospace face, the reg formatted
 * with its space. Use it wherever a vehicle is named at a glance, in tables,
 * pickers and headers. On a Kanban card use `KanbanPlate`, which links to the
 * vehicle and never widens the card.
 */
const meta = {
  title: "App components/Shared/RegPlate",
  component: RegPlate,
  tags: ["autodocs"],
  args: { registration: "OY70 TZG" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof RegPlate>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The medium plate, for a vehicle named in body text or a card, such as a
 * deal's vehicle on its detail panel.
 * @summary the default plate for body text and cards
 */
export const Default: Story = {};

/**
 * Small plates fit dense rows, such as a table's vehicle column or a picker's
 * options, without making the row taller.
 * @summary dense rows: tables, pickers, cards
 */
export const Small: Story = {
  args: { size: "sm" },
};

/**
 * Large plates sit beside display type, such as the reg in a vehicle page's
 * header.
 * @summary page headers, beside display type
 */
export const Large: Story = {
  args: { size: "lg", registration: "WR22 FNM" },
};

/**
 * Regs arrive as people type them ("oy70tzg") or as the database stores them
 * ("OY70TZG"). The plate uppercases them and puts the space back, so pass the
 * value as it is.
 * @summary pass the reg as typed; it formats itself
 */
export const AsTyped: Story = {
  args: { registration: "oy70tzg" },
};

/**
 * Personalised and older plates aren't the seven-character current format, so
 * they're uppercased and shown without spaces ("R4 ZAJ" reads "R4ZAJ").
 * @summary personalised plates show without spaces
 */
export const Personalised: Story = {
  args: { registration: "R4 ZAJ" },
};
