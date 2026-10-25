import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, FooterHelp, Link, Page } from "@/components/genaro";
import guidelines from "../docs/FooterHelp.md?raw";

/**
 * A centred line at the foot of a page that links to help on its topic
 * ("Learn more about the master sheet"). Use it once per page, after the
 * cards; for help next to a single field, use the field's `helpText`.
 */
const meta = {
  title: "Components/App chrome and navigation/FooterHelp",
  component: FooterHelp,
  tags: ["autodocs"],
  parameters: { guidelines },
  argTypes: { children: { control: false } },
  args: {
    children: (
      <>
        Learn more about <Link url="/help/master-sheet">the master sheet</Link>
      </>
    ),
  },
} satisfies Meta<typeof FooterHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Points to the app's own help on what the page is for. Start with "Learn
 * more about" and let the link text name the topic.
 * @summary links to help on the page's topic
 */
export const Default: Story = {};

/**
 * Help that lives on another site, such as GOV.UK, opens in a new tab.
 * @summary an external article, in a new tab
 */
export const ExternalArticle: Story = {
  args: {
    children: (
      <>
        Learn more about{" "}
        <Link url="https://www.gov.uk/check-mot-history" external>
          checking a vehicle’s MOT history
        </Link>
      </>
    ),
  },
};

/**
 * Where it goes: the last child of a `Page`, after the cards. It brings its
 * own padding, so it needs no wrapper.
 * @summary the last thing on a page
 */
export const AtTheEndOfAPage: Story = {
  render: (args) => (
    <Page title="Master sheet" fullWidth>
      <Card title="Sold this month">
        <p className="body-md">24 vehicles sold for £386,210.00 in total.</p>
      </Card>
      <FooterHelp {...args} />
    </Page>
  ),
};
