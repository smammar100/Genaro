import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Labelled } from "@/components/genaro";
import { makeVehicle } from "@/test/factories";
import { VehiclePicker } from "./vehicle-picker";

type PickerArgs = React.ComponentProps<typeof VehiclePicker>;

const stock = [
  makeVehicle({ id: "veh-0927", registration: "OY70TZG", stockId: "L-927", make: "Ford", model: "Fiesta", variantName: "ST-Line" }),
  makeVehicle({ id: "veh-0905", registration: "KM19XRT", stockId: "L-905", make: "Volkswagen", model: "Golf", variantName: "Match" }),
  makeVehicle({ id: "veh-0944", registration: "YA21KPC", stockId: "L-944", make: "Toyota", model: "Yaris", variantName: "Hybrid Design" }),
  makeVehicle({ id: "veh-0871", registration: "BD18HVN", stockId: "L-871", make: "BMW", model: "3 Series", variantName: "320d M Sport" }),
  makeVehicle({ id: "veh-0958", registration: "WR22FNM", stockId: "L-958", make: "Kia", model: "Sportage", variantName: "GT-Line" }),
  makeVehicle({ id: "veh-0919", registration: "LN20UJE", stockId: "L-919", make: "Audi", model: "A3 Sportback", variantName: "S line" }),
  makeVehicle({ id: "veh-0886", registration: "SF19OPA", stockId: "L-886", make: "Nissan", model: "Qashqai", variantName: "N-Connecta" }),
  makeVehicle({ id: "veh-0932", registration: "MX21ROD", stockId: "L-932", make: "Mazda", model: "MX-5", variantName: "Sport" }),
];

/** Inspections under way, as the leads page passes them to `renderMeta`. */
const inspections: Record<string, { done: number; total: number }> = {
  "veh-0944": { done: 9, total: 24 },
  "veh-0958": { done: 3, total: 24 },
};

/**
 * Finds a vehicle by typing its reg, with or without the space, or its stock
 * ID, make or model. Use it wherever a form links a record to a vehicle in
 * stock (a lead, an appointment, an invoice); stock runs past a hundred cars,
 * so a plain Select would be a scroll hunt. Give it a label through
 * `Labelled` and the same `id`.
 */
const meta = {
  title: "App components/Shared/VehiclePicker",
  component: VehiclePicker,
  tags: ["autodocs"],
  parameters: {
    // The list opens in a portal; keep it inside the story's frame on the docs page.
    docs: { story: { inline: false, height: "420px" } },
  },
  args: {
    id: "story-vehicle-picker",
    vehicles: stock,
    value: null,
    onChange: fn(),
  },
  argTypes: {
    vehicles: { control: false },
    value: { control: false },
    renderMeta: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "22.5rem" }}>
        <Story />
      </div>
    ),
  ],
  // Controlled: the picked vehicle lives in the args, as it would in a form.
  render: function VehiclePickerStory(args) {
    const [, updateArgs] = useArgs<PickerArgs>();
    return (
      <Labelled id={args.id ?? "story-vehicle-picker"} label="Vehicle">
        <VehiclePicker
          {...args}
          onChange={(vehicle) => {
            args.onChange(vehicle);
            updateArgs({ value: vehicle });
          }}
        />
      </Labelled>
    );
  },
} satisfies Meta<typeof VehiclePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An empty picker in a form, waiting for a reg. Click it to see the stock
 * list: plate, make and model, stock ID.
 * @summary pick a vehicle from stock by reg
 */
export const Default: Story = {};

/**
 * Once a vehicle is picked, the field shows its reg, make, model and stock ID,
 * with a button to clear it.
 * @summary a picked vehicle, with a clear button
 */
export const Selected: Story = {
  args: { value: stock[0] },
};

/**
 * Typing narrows the list as you go. "wr22fnm" finds WR22 FNM: case and the
 * space don't matter, and the top match is highlighted so Enter picks it.
 * @summary type a reg, without its space, then Enter
 */
export const Searching: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Vehicle"), "wr22fnm");
  },
};

/**
 * When nothing in stock matches, the list says so rather than showing an empty
 * box.
 * @summary nothing in stock matches
 */
export const NoMatch: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Vehicle"), "ZZ99 ZZZ");
  },
};

/**
 * Where a vehicle is optional, as on a lead, `emptyOptionLabel` says so: the
 * no-match message tells people to leave the field blank and type the car
 * in by hand.
 * @summary optional vehicle; fall back to free text
 */
export const FreeTextFallback: Story = {
  args: {
    emptyOptionLabel: "None / free text",
    placeholder: "Search by reg, or leave blank for free text",
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Vehicle"), "Vauxhall Corsa");
  },
};

/**
 * `renderMeta` adds a short hint to a row, such as how far a car's inspection
 * has got, so people can pick the right one.
 * @summary a short hint per row, such as inspection progress
 */
export const WithMeta: Story = {
  args: {
    renderMeta: (vehicle) => {
      const progress = inspections[vehicle.id];
      return progress ? (
        <span className="body-xs shrink-0 text-(--text-caution)">
          insp {progress.done}/{progress.total}
        </span>
      ) : null;
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByLabelText("Vehicle"));
    await userEvent.keyboard("{ArrowDown}");
  },
};
