"use client";

import { DataTable, Modal } from "@/components/polaris";
import {
  companyInvoiceFields,
  downloadBlob,
  openPdfInNewTab,
  pdfService,
} from "@/lib/services/pdf-service";
import { toast } from "@/lib/toast";
import { InvoicePaymentsPanel } from "./invoice-payments-panel";
import type { Company, Invoice, Vehicle } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * In-app invoice detail modal (line items + totals + Download PDF / Print).
 * Extracted from the Invoicing page so it can open in place wherever an invoice
 * is surfaced — e.g. Closed Deals — instead of navigating away (GEN-42).
 * Open when `invoice` is non-null.
 */
export function InvoiceDetailDialog({
  invoice,
  company,
  vehicle,
  onOpenChange,
  onChanged,
}: {
  invoice: Invoice | null;
  company: Company | null;
  /** Optional linked vehicle so the PDF can render Make/Model/VRM. */
  vehicle?: Vehicle | null;
  onOpenChange: (open: boolean) => void;
  /** Fired when a payment changes the invoice, so the list can re-read it. */
  onChanged?: () => void;
}) {
  async function build(): Promise<Blob | null> {
    if (!company || !invoice) return null;
    return pdfService.generateInvoice({
      invoice,
      vehicle: vehicle ?? null,
      ...companyInvoiceFields(company),
    });
  }
  async function download(): Promise<void> {
    try {
      const blob = await build();
      if (blob && invoice) downloadBlob(blob, `${invoice.invoiceNumber}.pdf`);
    } catch {
      toast.error("Couldn't generate the invoice PDF.");
    }
  }
  async function print(): Promise<void> {
    if (!invoice) return;
    try {
      await openPdfInNewTab(async () => {
        const blob = await build();
        if (!blob) throw new Error("No invoice to render");
        return blob;
      }, `${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      console.error("[invoice] print failed", e);
      toast.error("Couldn't open the invoice for printing.");
    }
  }

  return (
    <Modal
      open={invoice !== null}
      onClose={() => onOpenChange(false)}
      title={invoice?.invoiceNumber ?? "Invoice"}
      primaryAction={{ content: "Print invoice", onAction: () => void print() }}
      secondaryActions={[
        { content: "Download PDF", onAction: () => void download() },
      ]}
    >
      {invoice && (
        <div className="flex flex-col gap-4">
          <p className="text-(--text-secondary)">
            {invoice.partyName} · {formatDate(invoice.invoiceDate)}
          </p>
          <DataTable
            columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
            headings={["Description", "Qty", "Unit", "VAT", "Total"]}
            rows={invoice.lineItems.map((li) => [
              li.description,
              li.quantity,
              formatCurrency(li.unitPrice),
              formatCurrency(li.vatAmount),
              formatCurrency(li.total + li.vatAmount),
            ])}
          />
          <dl className="grid gap-1 text-right tabular-nums">
            <div>
              <dt className="inline text-(--text-secondary)">Subtotal: </dt>
              <dd className="inline">{formatCurrency(invoice.subtotal)}</dd>
            </div>
            <div>
              <dt className="inline text-(--text-secondary)">VAT: </dt>
              <dd className="inline">{formatCurrency(invoice.vatAmount)}</dd>
            </div>
            <div className="text-base font-semibold">
              <dt className="inline">Total: </dt>
              <dd className="inline">{formatCurrency(invoice.total)}</dd>
            </div>
          </dl>
          {/* Payments + running balance (GEN-73). Sale invoices only —
              purchase and refund invoices aren't collected against here. */}
          {invoice.type === "sale" ? (
            <InvoicePaymentsPanel invoice={invoice} onChanged={onChanged} />
          ) : null}
        </div>
      )}
    </Modal>
  );
}
