import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { DataTable, EmptyState, PageHeader, Td, Toolbar } from "@/components/otrava/primitives";
import { invoicesCsv } from "@/lib/otrava/csv";
import { downloadText, formatDate, invoiceStatusLabel, money } from "@/lib/otrava/format";
import { getInvoiceMoney, useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const invoices = useOtravaStore((s) => s.invoices);
  const payments = useOtravaStore((s) => s.payments);
  const deleteInvoice = useOtravaStore((s) => s.deleteInvoice);
  const duplicateInvoice = useOtravaStore((s) => s.duplicateInvoice);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return invoices
      .map((doc) => ({ doc, money: getInvoiceMoney(doc, payments, company.taxEnabled) }))
      .filter(({ money: m }) => (status === "all" ? true : m.status === status))
      .filter(({ doc }) =>
        !n
          ? true
          : [doc.number, doc.customerSnapshot.name, doc.customerSnapshot.companyName].some((f) =>
              f.toLowerCase().includes(n),
            ),
      )
      .sort((a, b) => b.doc.date.localeCompare(a.doc.date));
  }, [invoices, payments, q, status, company.taxEnabled]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Issue invoices, record payments, and track outstanding balances."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadText("invoices.csv", invoicesCsv(useOtravaStore.getState()), "text/csv")
              }
            >
              Export CSV
            </Button>
            <Button asChild>
              <Link to="/invoices/new">New invoice</Link>
            </Button>
          </>
        }
      />
      <Toolbar>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Input
            className="max-w-md"
            placeholder="Search number or customer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <NativeSelect className="max-w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </NativeSelect>
        </div>
      </Toolbar>
      {filtered.length === 0 ? (
        <EmptyState
          title="No invoices yet."
          description="Create an invoice directly, or convert an accepted quotation in one click."
          action={
            <Button asChild>
              <Link to="/invoices/new">New invoice</Link>
            </Button>
          }
        />
      ) : (
        <DataTable columns={["Number", "Date", "Customer", "Status", "Total", "Balance", ""]}>
          {filtered.map(({ doc, money: m }) => (
            <tr key={doc.id} className="hover:bg-brand-light/60">
              <Td>
                <Link
                  className="font-medium text-brand hover:underline"
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: doc.id }}
                >
                  {doc.number}
                </Link>
              </Td>
              <Td>{formatDate(doc.date, app.dateFormat)}</Td>
              <Td>{doc.customerSnapshot.name}</Td>
              <Td>
                <Badge tone={statusTone(m.status)}>{invoiceStatusLabel(m.status)}</Badge>
              </Td>
              <Td className="tabular-nums">{money(m.totals.grandTotal, company)}</Td>
              <Td className="tabular-nums">{money(m.balanceDue, company)}</Td>
              <Td className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const copy = await duplicateInvoice(doc.id);
                    toast.success(`Duplicated as ${copy.number}.`);
                  }}
                >
                  Duplicate
                </Button>
                {doc.status === "draft" ? (
                  <Button variant="ghost" size="sm" onClick={() => setPending(doc.id)}>
                    Delete
                  </Button>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(v) => !v && setPending(null)}
        title="Delete draft invoice?"
        description="Only draft invoices can be deleted. Issued invoices should be cancelled instead."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pending) await deleteInvoice(pending);
          toast.success("Invoice deleted.");
        }}
      />
    </div>
  );
}
