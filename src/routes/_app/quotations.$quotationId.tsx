import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DocumentEditor } from "@/components/otrava/document-editor";
import { PageHeader } from "@/components/otrava/primitives";
import { quotationStatusLabel } from "@/lib/otrava/format";
import {
  buildPdfInputFromQuotation,
  exportDocumentPdf,
  printDocumentHtml,
} from "@/lib/otrava/pdf";
import { getQuotationMoney, useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/quotations/$quotationId")({
  component: QuotationDetailPage,
});

function QuotationDetailPage() {
  const { quotationId } = Route.useParams();
  const navigate = useNavigate();
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const quotation = useOtravaStore((s) => s.quotations.find((q) => q.id === quotationId));
  const convertQuotation = useOtravaStore((s) => s.convertQuotation);
  const [confirm, setConfirm] = useState(false);
  const [edit, setEdit] = useState(true);

  if (!quotation) {
    return (
      <div>
        <PageHeader title="Quotation not found" />
        <Button asChild variant="outline">
          <Link to="/quotations">Back</Link>
        </Button>
      </div>
    );
  }

  const moneyInfo = getQuotationMoney(quotation, company.taxEnabled);
  const pdfInput = buildPdfInputFromQuotation(quotation, company, app, moneyInfo.status);

  return (
    <div>
      <PageHeader
        title={quotation.number}
        description={`${quotation.customerSnapshot.name} · ${quotationStatusLabel(moneyInfo.status)}`}
        actions={
          <>
            <Badge tone={statusTone(moneyInfo.status)}>
              {quotationStatusLabel(moneyInfo.status)}
            </Badge>
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
            {quotation.status !== "converted" ? (
              <>
                <Button variant="secondary" onClick={() => setEdit((v) => !v)}>
                  {edit ? "Close editor" : "Edit"}
                </Button>
                <Button onClick={() => setConfirm(true)}>Convert to invoice</Button>
              </>
            ) : quotation.convertedInvoiceId ? (
              <Button asChild>
                <Link
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: quotation.convertedInvoiceId }}
                >
                  Open invoice
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      {edit && quotation.status !== "converted" ? (
        <DocumentEditor kind="quotation" existing={quotation} />
      ) : (
        <DocumentSummary
          customer={quotation.customerSnapshot.name}
          items={quotation.items.map((i) => i.description)}
        />
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Convert this quotation to an invoice?"
        description="A new invoice will be created with the same customer and line items. The quotation will be marked as converted and kept for history."
        confirmLabel="Convert to invoice"
        onConfirm={async () => {
          const invoice = await convertQuotation(quotation.id);
          toast.success(`Invoice ${invoice.number} created.`);
          void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invoice.id } });
        }}
      />
    </div>
  );
}

function DocumentSummary({ customer, items }: { customer: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">Customer</p>
      <p className="font-medium">{customer}</p>
      <p className="mt-4 text-sm text-muted">Items</p>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
