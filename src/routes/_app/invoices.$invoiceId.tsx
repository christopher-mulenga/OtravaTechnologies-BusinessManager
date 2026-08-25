import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DocumentEditor } from "@/components/otrava/document-editor";
import { PaymentDialog } from "@/components/otrava/payment-dialog";
import { DataTable, PageHeader, Td } from "@/components/otrava/primitives";
import {
  formatDate,
  invoiceStatusLabel,
  money,
  paymentMethodLabel,
} from "@/lib/otrava/format";
import {
  buildPdfInputFromInvoice,
  exportDocumentPdf,
  printDocumentHtml,
} from "@/lib/otrava/pdf";
import { getInvoiceMoney, useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/invoices/$invoiceId")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const invoice = useOtravaStore((s) => s.invoices.find((q) => q.id === invoiceId));
  const payments = useOtravaStore((s) => s.payments);
  const saveInvoice = useOtravaStore((s) => s.saveInvoice);
  const deletePayment = useOtravaStore((s) => s.deletePayment);
  const [pay, setPay] = useState(false);
  const [edit, setEdit] = useState(true);
  const [pendingPay, setPendingPay] = useState<string | null>(null);

  if (!invoice) {
    return (
      <div>
        <PageHeader title="Invoice not found" />
        <Button asChild variant="outline">
          <Link to="/invoices">Back</Link>
        </Button>
      </div>
    );
  }

  const info = getInvoiceMoney(invoice, payments, company.taxEnabled);
  const pdfInput = buildPdfInputFromInvoice(
    invoice,
    info.payments,
    company,
    app,
    info.status,
  );
  const canPay =
    info.balanceDue > 0 && invoice.status !== "cancelled" && invoice.status !== "draft";
  const canEdit =
    invoice.status !== "cancelled" && info.status !== "paid";
  const canCancel =
    invoice.status !== "cancelled" &&
    invoice.status !== "draft" &&
    info.status !== "paid";

  return (
    <div>
      <PageHeader
        title={invoice.number}
        description={`${invoice.customerSnapshot.name} · Balance ${money(info.balanceDue, company)}`}
        actions={
          <>
            <Badge tone={statusTone(info.status)}>{invoiceStatusLabel(info.status)}</Badge>
            <Button variant="outline" onClick={() => printDocumentHtml(company, app, pdfInput)}>
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void exportDocumentPdf(company, app, pdfInput).then(
                  () => toast.success("PDF downloaded."),
                  (err: unknown) =>
                    toast.error(err instanceof Error ? err.message : "PDF export failed."),
                )
              }
            >
              Export PDF
            </Button>
            {canEdit ? (
              <Button variant="secondary" onClick={() => setEdit((v) => !v)}>
                {edit ? "Close editor" : "Edit"}
              </Button>
            ) : null}
            {canPay ? <Button onClick={() => setPay(true)}>Record payment</Button> : null}
            {canCancel ? (
              <Button
                variant="outline"
                onClick={async () => {
                  await saveInvoice({ ...invoice, status: "cancelled" });
                  toast.success("Invoice cancelled.");
                }}
              >
                Cancel invoice
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Info label="Grand total" value={money(info.totals.grandTotal, company)} />
        <Info label="Amount paid" value={money(info.amountPaid, company)} />
        <Info label="Balance due" value={money(info.balanceDue, company)} />
      </div>

      {invoice.quotationId ? (
        <p className="mb-4 text-sm text-muted">
          Created from quotation{" "}
          <Link
            className="text-brand hover:underline"
            to="/quotations/$quotationId"
            params={{ quotationId: invoice.quotationId }}
          >
            {invoice.quotationNumber}
          </Link>
        </p>
      ) : null}

      {edit && canEdit ? <DocumentEditor kind="invoice" existing={invoice} /> : null}

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Payment history</h2>
        {info.payments.length === 0 ? (
          <p className="text-sm text-muted">No payments recorded yet.</p>
        ) : (
          <DataTable columns={["Date", "Method", "Reference", "Amount", ""]}>
            {info.payments.map((p) => (
              <tr key={p.id}>
                <Td>{formatDate(p.date, app.dateFormat)}</Td>
                <Td>{paymentMethodLabel(p.method)}</Td>
                <Td>{p.reference || "—"}</Td>
                <Td className="tabular-nums">{money(p.amount, company)}</Td>
                <Td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setPendingPay(p.id)}>
                    Delete
                  </Button>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>

      <PaymentDialog
        open={pay}
        onOpenChange={setPay}
        invoiceId={invoice.id}
        balanceDue={info.balanceDue}
      />
      <ConfirmDialog
        open={Boolean(pendingPay)}
        onOpenChange={(v) => !v && setPendingPay(null)}
        title="Delete this payment?"
        description="The invoice balance will increase by this amount."
        confirmLabel="Delete payment"
        destructive
        onConfirm={async () => {
          if (pendingPay) await deletePayment(pendingPay);
          toast.success("Payment deleted.");
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
