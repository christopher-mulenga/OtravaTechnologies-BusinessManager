import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/otrava/customer-form";
import { DataTable, PageHeader, Td } from "@/components/otrava/primitives";
import {
  customerDisplayName,
  formatDate,
  invoiceStatusLabel,
  money,
  quotationStatusLabel,
} from "@/lib/otrava/format";
import { getInvoiceMoney, getQuotationMoney, useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/customers/$customerId")({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { customerId } = Route.useParams();
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const customer = useOtravaStore((s) => s.customers.find((c) => c.id === customerId));
  const quotations = useOtravaStore((s) => s.quotations.filter((q) => q.customerId === customerId));
  const invoices = useOtravaStore((s) => s.invoices.filter((q) => q.customerId === customerId));
  const payments = useOtravaStore((s) => s.payments);
  const saveCustomer = useOtravaStore((s) => s.saveCustomer);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!customer) {
    return (
      <div>
        <PageHeader title="Customer not found" />
        <Button asChild variant="outline">
          <Link to="/customers">Back to customers</Link>
        </Button>
      </div>
    );
  }

  const outstanding = invoices.reduce((sum, inv) => {
    const m = getInvoiceMoney(inv, payments, company.taxEnabled);
    return sum + m.balanceDue;
  }, 0);
  const history = invoices.flatMap((inv) =>
    getInvoiceMoney(inv, payments, company.taxEnabled).payments.map((p) => ({
      ...p,
      invoiceNumber: inv.number,
    })),
  );

  return (
    <div>
      <PageHeader
        title={customerDisplayName(customer)}
        description={`${customer.code} · ${customer.active ? "Active" : "Inactive"}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEdit(true)}>
              Edit
            </Button>
            <Button asChild>
              <Link to="/quotations/new">New quotation</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4 text-sm lg:col-span-1">
          <h2 className="font-semibold">Profile</h2>
          <dl className="mt-3 space-y-2">
            <Row label="Phone" value={customer.phone} />
            <Row label="Email" value={customer.email} />
            <Row label="City" value={customer.city} />
            <Row label="Country" value={customer.country} />
            <Row label="Tax number" value={customer.taxNumber} />
            <Row label="Physical address" value={customer.physicalAddress} />
            <Row label="Postal address" value={customer.postalAddress} />
            <Row label="Notes" value={customer.notes} />
          </dl>
          <p className="mt-4 text-lg font-semibold tabular-nums">
            Outstanding: {money(outstanding, company)}
          </p>
        </section>
        <div className="space-y-4 lg:col-span-2">
          <section>
            <h2 className="mb-2 font-semibold">Quotations</h2>
            {quotations.length === 0 ? (
              <p className="text-sm text-muted">No quotations for this customer.</p>
            ) : (
              <DataTable columns={["Number", "Date", "Status", "Total"]}>
                {quotations.map((q) => {
                  const m = getQuotationMoney(q, company.taxEnabled);
                  return (
                    <tr key={q.id}>
                      <Td>
                        <Link
                          className="text-brand hover:underline"
                          to="/quotations/$quotationId"
                          params={{ quotationId: q.id }}
                        >
                          {q.number}
                        </Link>
                      </Td>
                      <Td>{formatDate(q.date, app.dateFormat)}</Td>
                      <Td>
                        <Badge tone={statusTone(m.status)}>
                          {quotationStatusLabel(m.status)}
                        </Badge>
                      </Td>
                      <Td className="tabular-nums">{money(m.totals.grandTotal, company)}</Td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </section>
          <section>
            <h2 className="mb-2 font-semibold">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted">No invoices for this customer.</p>
            ) : (
              <DataTable columns={["Number", "Date", "Status", "Balance"]}>
                {invoices.map((inv) => {
                  const m = getInvoiceMoney(inv, payments, company.taxEnabled);
                  return (
                    <tr key={inv.id}>
                      <Td>
                        <Link
                          className="text-brand hover:underline"
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                        >
                          {inv.number}
                        </Link>
                      </Td>
                      <Td>{formatDate(inv.date, app.dateFormat)}</Td>
                      <Td>
                        <Badge tone={statusTone(m.status)}>{invoiceStatusLabel(m.status)}</Badge>
                      </Td>
                      <Td className="tabular-nums">{money(m.balanceDue, company)}</Td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </section>
          <section>
            <h2 className="mb-2 font-semibold">Payment history</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No payments recorded.</p>
            ) : (
              <DataTable columns={["Date", "Invoice", "Amount"]}>
                {history.map((p) => (
                  <tr key={p.id}>
                    <Td>{formatDate(p.date, app.dateFormat)}</Td>
                    <Td>{p.invoiceNumber}</Td>
                    <Td className="tabular-nums">{money(p.amount, company)}</Td>
                  </tr>
                ))}
              </DataTable>
            )}
          </section>
        </div>
      </div>

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent title="Edit customer" className="max-w-2xl">
          <CustomerForm
            initial={customer}
            busy={busy}
            onCancel={() => setEdit(false)}
            onSubmit={async (data) => {
              setBusy(true);
              try {
                await saveCustomer({ ...data, id: customer.id });
                toast.success("Customer updated.");
                setEdit(false);
              } finally {
                setBusy(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
