import { Page } from "@/components/polaris";
import { StockTable } from "@/components/vehicles/stock-table";

/**
 * In stock — the cars still for sale, as a table. All vehicles keeps every
 * car ever taken in, sold or not.
 */
export default function InStockPage() {
  return (
    <Page
      fullWidth
      title="In stock"
      subtitle="Cars still for sale, including those in inspection or prep. Sold cars and cars returned to their owner are left out."
      secondaryActions={[{ content: "All vehicles", url: "/vehicles" }]}
    >
      <StockTable />
    </Page>
  );
}
