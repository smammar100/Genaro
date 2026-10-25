import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, Card, Layout, LayoutAnnotatedSection, LayoutSection, TextField } from "@/components/genaro";
import guidelines from "../docs/Layout.md?raw";

/**
 * Layout arranges a page's cards into the standard columns: a main column with
 * a one-third sidebar, halves, or annotated sections for settings. Put it
 * inside a Page; for dashboards and tiles use Grid instead.
 */
const meta = {
  title: "Components/Layout and structure/Layout",
  component: Layout,
  subcomponents: { LayoutSection, LayoutAnnotatedSection },
  tags: ["autodocs"],
  parameters: { guidelines, layout: "padded" },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof Layout>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Detail pages: the main content in a wide column and summaries in a one-third
 * sidebar. Each section stacks its cards 16px apart.
 * @summary detail pages: main column plus a one-third sidebar
 */
export const MainAndSidebar: Story = {
  render: (args) => (
    <Layout {...args}>
      <Layout.Section>
        <Card title="Vehicle details">
          <p className="body-md">2020 Ford Fiesta 1.0 EcoBoost Titanium, 28,412 miles, magnetic grey.</p>
        </Card>
        <Card title="Purchase costs">
          <p className="body-md">Bought for £9,850.00 at auction; £420.00 in preparation.</p>
        </Card>
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <Card title="Status">
          <Badge tone="attention">Reserved</Badge>
        </Card>
        <Card title="Price">
          <p className="body-md">£12,495.00</p>
        </Card>
      </Layout.Section>
    </Layout>
  ),
};

/**
 * Two equal columns, for pairs of the same kind of content, such as this
 * month's sales beside last month's.
 * @summary two equal columns for paired content
 */
export const Halves: Story = {
  render: (args) => (
    <Layout {...args}>
      <LayoutSection variant="oneHalf">
        <Card title="October 2026">
          <p className="body-md">23 vehicles sold, £287,640.00 in sales.</p>
        </Card>
      </LayoutSection>
      <LayoutSection variant="oneHalf">
        <Card title="September 2026">
          <p className="body-md">19 vehicles sold, £231,180.00 in sales.</p>
        </Card>
      </LayoutSection>
    </Layout>
  ),
};

/**
 * Settings pages: each group's title and description on the left, its cards
 * on the right.
 * @summary settings pages: annotation left, cards right
 */
export const AnnotatedSections: Story = {
  render: (args) => (
    <Layout {...args}>
      <Layout.AnnotatedSection
        title="Business details"
        description="Shown on invoices, warranties and the emails customers receive."
      >
        <Card>
          <TextField label="Trading name" name="tradingName" defaultValue="Car Capital" autoComplete="organization" />
        </Card>
      </Layout.AnnotatedSection>
      <Layout.AnnotatedSection title="Invoicing" description="Numbering and payment terms for new invoices.">
        <Card>
          <TextField label="Next invoice number" name="nextInvoice" defaultValue="INV-2042" autoComplete="off" />
        </Card>
      </Layout.AnnotatedSection>
    </Layout>
  ),
};
