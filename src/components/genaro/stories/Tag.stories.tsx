import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Tag } from "@/components/genaro";
import guidelines from "../docs/Tag.md?raw";

/**
 * Tag is a short keyword someone attached to a record, such as a vehicle's
 * features or an applied filter: plain, removable or clickable. For a status
 * the system sets, such as "Reserved", use a Badge.
 */
const meta = {
  title: "Components/Forms/Tag",
  component: Tag,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { children: "Full service history" },
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A keyword on a record, read-only, such as a feature on a vehicle's advert.
 * @summary a read-only keyword
 */
export const Default: Story = {};

/**
 * While editing, the × removes the tag, such as a feature from an advert or a
 * filter from the master sheet.
 * @summary removable while editing
 */
export const Removable: Story = {
  args: { onRemove: fn() },
};

/**
 * A tag that does something when clicked, such as adding a suggested feature.
 * The whole tag is the button, with no ×.
 * @summary suggestions that add themselves when clicked
 */
export const Clickable: Story = {
  args: { children: "Heated seats", onClick: fn() },
};

/**
 * A tag that can't be changed right now, such as while the advert publishes.
 * @summary tags that can't be changed right now
 */
export const Disabled: Story = {
  args: { onRemove: fn(), disabled: true },
};

/**
 * Long labels truncate with an ellipsis; a plain or removable tag shows the
 * full text on hover.
 * @summary long labels truncate; the full text on hover
 */
export const LongLabel: Story = {
  args: {
    children: "Panoramic opening glass sunroof with electric blind",
    onRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "200px" }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * A row of removable tags, each removed from state by its ×, as in the advert
 * editor's feature list.
 * @summary a wrapping list of removable tags
 */
export const RemovableList: Story = {
  render: function Render(args) {
    const [features, setFeatures] = React.useState([
      "Full service history",
      "Apple CarPlay",
      "Heated seats",
      "Parking sensors",
    ]);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-200)" }}>
        {features.map((feature) => (
          <Tag
            {...args}
            key={feature}
            onRemove={() => setFeatures((current) => current.filter((f) => f !== feature))}
          >
            {feature}
          </Tag>
        ))}
      </div>
    );
  },
};
