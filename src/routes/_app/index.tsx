import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate, money } from "@/lib/otrava/format";
import { rangeFromPreset, salesReport } from "@/lib/otrava/reports";
import { getInvoiceMoney, useOtravaStore } from "@/lib/otrava/store";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { invoiceStatusLabel, quotationStatusLabel } from "@/lib/otrava/format";
import { getQuotationMoney } from "@/lib/otrava/store";
import { PageHeader, StatCard } from "@/components/otrava/primitives";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const customers = useOtravaStore((s) => s.customers);
  const items = useOtravaStore((s) => s.items);
  const quotations = useOtravaStore((s) => s.quotations);
  const invoices = useOtravaStore((s) => s.invoices);
  const payments = useOtravaStore((s) => s.payments);

  const month = rangeFromPreset("month");
  const sales = salesReport(invoices, payments, company.taxEnabled, month);
  const outstanding = invoices.filter((inv) => {
    const m = getInvoiceMoney(inv, payments, company.taxEnabled);
    return m.balanceDue > 0 && inv.status !== "cancelled" && inv.status !== "draft";
  });
  const paidCount = invoices.filter(
    (inv) => getInvoiceMoney(inv, payments, company.taxEnabled).status === "paid",
  ).length;
  const now = new Date();
  const thisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const recentQuotations = [...quotations]
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 5);
  const recentInvoices = [...invoices]
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 5);
  const recentCustomers = [...customers]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const recentPayments = [...payments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Local workspace for ${company.name}.`}
        actions={
          <>
            <Button asChild>
              <Link to="/quotations/new">New quotation</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/invoices/new">New invoice</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total sales this month" value={money(sales.invoiced, company)} />
        <StatCard
          label="Outstanding invoices"
          value={String(outstanding.length)}
          hint={money(sales.outstanding, company)}
        />
        <StatCard label="Paid invoices" value={String(paidCount)} />
        <StatCard label="Unpaid invoices" value={String(outstanding.length)} />
        <StatCard label="Customers" value={String(customers.filter((c) => c.active).length)} />
        <StatCard label="Products & services" value={String(items.filter((i) => i.active).length)} />
        <StatCard
          label="Quotations this month"
          value={String(quotations.filter((q) => thisMonth(q.date)).length)}
        />
        <StatCard
          label="Invoices this month"
          value={String(invoices.filter((q) => thisMonth(q.date)).length)}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to="/customers">Add customer</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/catalogue">Add product/service</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/backup">Backup data</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ActivityCard title="Recent quotations">
          {recentQuotations.length === 0 ? (
            <p className="text-sm text-muted">No quotations yet.</p>
          ) : (
            recentQuotations.map((q) => {
              const m = getQuotationMoney(q, company.taxEnabled);
              return (
                <Link
                  key={q.id}
                  to="/quotations/$quotationId"
                  params={{ quotationId: q.id }}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-brand-light"
                >
                  <span>
                    <span className="block font-medium">{q.number}</span>
                    <span className="text-xs text-muted">{q.customerSnapshot.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={statusTone(m.status)}>{quotationStatusLabel(m.status)}</Badge>
                    <span className="tabular-nums text-sm">{money(m.totals.grandTotal, company)}</span>
                  </span>
                </Link>
              );
            })
          )}
        </ActivityCard>
        <ActivityCard title="Recent invoices">
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted">No invoices yet.</p>
          ) : (
            recentInvoices.map((inv) => {
              const m = getInvoiceMoney(inv, payments, company.taxEnabled);
              return (
                <Link
                  key={inv.id}
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: inv.id }}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-brand-light"
                >
                  <span>
                    <span className="block font-medium">{inv.number}</span>
                    <span className="text-xs text-muted">{inv.customerSnapshot.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={statusTone(m.status)}>{invoiceStatusLabel(m.status)}</Badge>
                    <span className="tabular-nums text-sm">{money(m.totals.grandTotal, company)}</span>
                  </span>
                </Link>
              );
            })
          )}
        </ActivityCard>
        <ActivityCard title="Recently added customers">
          {recentCustomers.length === 0 ? (
            <p className="text-sm text-muted">No customers yet.</p>
          ) : (
            recentCustomers.map((c) => (
              <Link
                key={c.id}
                to="/customers/$customerId"
                params={{ customerId: c.id }}
                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-brand-light"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted">{formatDate(c.createdAt, app.dateFormat)}</span>
              </Link>
            ))
          )}
        </ActivityCard>
        <ActivityCard title="Recently paid invoices">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          ) : (
            recentPayments.map((p) => {
              const inv = invoices.find((i) => i.id === p.invoiceId);
              return (
                <div key={p.id} className="flex items-center justify-between px-2 py-2">
                  <span>
                    <span className="block font-medium">{inv?.number ?? "Invoice"}</span>
                    <span className="text-xs text-muted">{formatDate(p.date, app.dateFormat)}</span>
                  </span>
                  <span className="tabular-nums text-sm">{money(p.amount, company)}</span>
                </div>
              );
            })
          )}
        </ActivityCard>
      </div>
    </div>
  );
}

function ActivityCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
