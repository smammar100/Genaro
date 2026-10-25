import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NextLink from "next/link";
import { Button, ButtonGroup, Card, Link, GenaroProvider, UnstyledLink } from "@/components/genaro";
import guidelines from "../docs/GenaroProvider.md?raw";

const links = (
  <ButtonGroup>
    <Button url="/vehicles">View all vehicles</Button>
    <Link url="/sales/leads">Open leads</Link>
  </ButtonGroup>
);

/**
 * Wraps the app once so every internal `url` (on Button, Link, Navigation and
 * the rest) navigates client-side through `next/link`. It draws nothing.
 * `UnstyledLink` is the anchor those components render; use it to make your
 * own elements, such as a whole card, into links.
 */
const meta = {
  title: "Components/App setup/GenaroProvider",
  component: GenaroProvider,
  subcomponents: { UnstyledLink },
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { linkComponent: NextLink, children: links },
  argTypes: {
    linkComponent: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof GenaroProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Set up once, in a `'use client'` providers file the root layout renders:
 * internal URLs then prefetch and navigate without a full page load.
 * @summary app setup: internal urls go through next/link
 */
export const Default: Story = {};

/**
 * Without a `linkComponent` everything still works, but links are plain
 * anchors and every click is a full page load.
 * @summary no router: plain anchors, full page loads
 */
export const WithoutRouter: Story = {
  args: { linkComponent: undefined },
};

/**
 * `UnstyledLink` makes your own element a link with the same routing, such as
 * a dashboard card that opens the inspection queue. It adds no styles.
 * @summary make a whole card a link
 */
export const UnstyledLinkCard: Story = {
  render: (args) => (
    <GenaroProvider {...args}>
      <UnstyledLink
        url="/maintenance/inspection"
        style={{ display: "block", maxWidth: "24rem", color: "inherit", textDecoration: "none" }}
      >
        <Card title="6 vehicles waiting for inspection">
          <p className="body-md">Inspect them today to keep the forecourt stocked.</p>
        </Card>
      </UnstyledLink>
    </GenaroProvider>
  ),
};

/**
 * Links to other sites take `external`: they open in a new tab with
 * `rel="noopener noreferrer"` and skip the router.
 * @summary another site, in a new tab
 */
export const ExternalUnstyledLink: Story = {
  render: (args) => (
    <GenaroProvider {...args}>
      <UnstyledLink url="https://www.gov.uk/check-mot-history" external className="body-md">
        Check MOT history on GOV.UK
      </UnstyledLink>
    </GenaroProvider>
  ),
};
