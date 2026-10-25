import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, DataTable, Link } from "@/components/genaro";
import guidelines from "../docs/DataTable.md?raw";

/**
 * A read-only table of figures for reports, such as sales by make or stock
 * value by location, in a flush card with an optional totals row. It has no
 * selection, sorting or pagination: for lists people act on, use IndexTable.
 */
const meta = {
  title: "Components/Lists and tables/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    columnContentTypes: ["text", "numeric", "numeric", "numeric", "numeric"],
    headings: ["Make", "Units sold", "Average days to sell", "Revenue", "Gross profit"],
    rows: [
      ["BMW", 6, 34, "£112,450.00", "£14,210.00"],
      ["Audi", 5, 29, "£86,975.00", "£10,840.00"],
      ["Ford", 9, 21, "£81,630.00", "£9,915.00"],
      ["Volkswagen", 4, 38, "£54,280.00", "£6,120.00"],
      ["Toyota", 3, 26, "£41,397.00", "£5,064.00"],
    ],
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Compare figures across rows, such as a month's sales by make. Numeric
 * columns align right with tabular figures so the digits line up.
 * @summary a report of figures; numbers align right
 */
export const Default: Story = {};

/**
 * A totals row under the headings, for reports where the sum matters most.
 * Pass `''` in the first slot; it shows "Totals".
 * @summary totals under the headings
 */
export const WithTotals: Story = {
  args: { totals: ["", 27, "", "£376,732.00", "£46,149.00"] },
};

/**
 * Totals at the bottom, read after the rows, as on an invoice or a statement.
 * Name the row with `totalsName`.
 * @summary a named totals row at the bottom
 */
export const TotalsInFooter: Story = {
  args: {
    totals: ["", 27, "", "£376,732.00", "£46,149.00"],
    totalsName: "Total",
    showTotalsInFooter: true,
  },
};

/**
 * A short note under the table, such as how many rows it shows out of all of
 * them.
 * @summary a note under the table ("Showing 5 of 12 makes")
 */
export const WithFooterContent: Story = {
  args: { footerContent: "Showing 5 of 12 makes" },
};

/**
 * Cells can hold links and badges, such as invoice numbers that open the
 * invoice and a payment status. Keep the figures in their own column.
 * @summary links and status badges in cells
 */
export const WithLinksAndBadges: Story = {
  args: {
    columnContentTypes: ["text", "text", "text", "text", "numeric"],
    headings: ["Invoice", "Customer", "Vehicle", "Status", "Amount"],
    rows: [
      [
        <Link key="invoice" url="/invoices/INV-1042">
          INV-1042
        </Link>,
        "James Walker",
        "OY70 TZG",
        <Badge key="status" tone="success">
          Paid
        </Badge>,
        "£16,419.00",
      ],
      [
        <Link key="invoice" url="/invoices/INV-1041">
          INV-1041
        </Link>,
        "Priya Shah",
        "LB21 FMO",
        <Badge key="status" tone="attention">
          Part paid
        </Badge>,
        "£21,995.00",
      ],
      [
        <Link key="invoice" url="/invoices/INV-1040">
          INV-1040
        </Link>,
        "Tom Hughes",
        "WR68 HVD",
        <Badge key="status" tone="critical">
          Overdue
        </Badge>,
        "£9,480.00",
      ],
    ],
  },
  argTypes: { rows: { control: false } },
};
