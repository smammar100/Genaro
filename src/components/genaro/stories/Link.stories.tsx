import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Link } from "@/components/genaro";
import guidelines from "../docs/Link.md?raw";

/**
 * Link is an inline text link for navigation in sentences, help text, banners
 * and table cells; its text names the destination, never "click here". For a
 * standalone action use a Button (`variant="plain"` when it sits inline).
 */
const meta = {
  title: "Components/Actions/Link",
  component: Link,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { url: "/vehicles/L-927", children: "2020 Ford Fiesta 1.0 EcoBoost Titanium" },
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Navigates to another page in the app, such as a vehicle from a table cell.
 * Internal URLs go through the router link from GenaroProvider.
 * @summary navigation to a page in the app
 */
export const Default: Story = {};

/**
 * Most links sit inside running text, where the link words name the page they
 * open.
 * @summary a link inside a sentence of help text
 */
export const InText: Story = {
  args: { url: "/help/part-exchange", children: "how part-exchange valuations work" },
  render: (args) => (
    <p className="body-md">
      The offer uses the trade price on the day. Read <Link {...args} /> before you quote a customer.
    </p>
  ),
};

/**
 * Other sites open in a new tab, such as a vehicle's MOT history on GOV.UK.
 * Say so in or next to the link text when it matters.
 * @summary links to other sites, in a new tab
 */
export const External: Story = {
  args: {
    url: "https://www.check-mot.service.gov.uk/",
    external: true,
    children: "MOT history for OY70 TZG (opens in a new tab)",
  },
};

/**
 * Names in a list, such as a lead's customer, inherit the text colour and only
 * underline on hover, so the row stays calm.
 * @summary names in lists: text colour, underline on hover
 */
export const Monochrome: Story = {
  args: { url: "/sales/leads/1053", monochrome: true, removeUnderline: true, children: "Priya Sharma" },
};

/**
 * An action inside a sentence, such as adding a missing mileage. Without a
 * `url`, `onClick` renders a link-styled button.
 * @summary an inline action in text; a button underneath
 */
export const InlineAction: Story = {
  args: { url: undefined, onClick: fn(), children: "Add mileage" },
  render: (args) => (
    <p className="body-md">
      No mileage recorded at purchase. <Link {...args} />
    </p>
  ),
};
