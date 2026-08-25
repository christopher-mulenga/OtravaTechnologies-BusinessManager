import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, statusTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { DataTable, EmptyState, PageHeader, Td, Toolbar } from "@/components/otrava/primitives";
import { formatDate, invoiceStatusLabel, money, quotationStatusLabel } from "@/lib/otrava/format";
import { getInvoiceMoney, getQuotationMoney, useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const quotations = useOtravaStore((s) => s.quotations);
  const invoices = useOtravaStore((s) => s.invoices);
  const payments = useOtravaStore((s) => s.payments);
  const customers = useOtravaStore((s) => s.customers);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [customerId, setCustomerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const qRows = quotations.map((doc) => {
      const m = getQuotationMoney(doc, company.taxEnabled);
      return {
        id: doc.id,
        kind: "quotation" as const,
        number: doc.number,
        date: doc.date,
        customerId: doc.customerId,
        customer: doc.customerSnapshot.name,
        status: m.status,
        total: m.totals.grandTotal,
        path: `/quotations/${doc.id}`,
      };
    });
    const iRows = invoices.map((doc) => {
      const m = getInvoiceMoney(doc, payments, company.taxEnabled);
      return {
        id: doc.id,
        kind: "invoice" as const,
        number: doc.number,
        date: doc.date,
        customerId: doc.customerId,
        customer: doc.customerSnapshot.name,
        status: m.status,
        total: m.totals.grandTotal,
        path: `/invoices/${doc.id}`,
      };
    });
    let all = [...qRows, ...iRows];
    if (tab === "quotations") all = all.filter((r) => r.kind === "quotation");
    if (tab === "invoices") all = all.filter((r) => r.kind === "invoice");
    if (tab === "drafts") all = all.filter((r) => r.status === "draft");
    if (tab === "paid") all = all.filter((r) => r.status === "paid");
    if (tab === "unpaid")
      all = all.filter(
        (r) => r.kind === "invoice" && ["issued", "partially_paid", "overdue"].includes(r.status),
      );
    if (tab === "overdue") all = all.filter((r) => r.status === "overdue");
    if (tab === "cancelled") all = all.filter((r) => r.status === "cancelled");
    if (tab === "converted") all = all.filter((r) => r.status === "converted");
    if (customerId !== "all") all = all.filter((r) => r.customerId === customerId);
    if (from) all = all.filter((r) => r.date.slice(0, 10) >= from);
    if (to) all = all.filter((r) => r.date.slice(0, 10) <= to);
    const n = q.trim().toLowerCase();
    if (n) {
      all = all.filter((r) =>
        [r.number, r.customer, r.status].some((f) => f.toLowerCase().includes(n)),
      );
    }
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [quotations, invoices, payments, company.taxEnabled, tab, q, customerId, from, to]);

  const tabs = [
    "all",
    "quotations",
    "invoices",
    "drafts",
    "paid",
    "unpaid",
    "overdue",
    "cancelled",
    "converted",
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Search and filter quotations and invoices in one place."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted hover:bg-brand-light"
            }
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Toolbar>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <NativeSelect value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="all">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Toolbar>
      {rows.length === 0 ? (
        <EmptyState
          title="No documents match these filters."
          description="Try a different status, customer, or date range."
        />
      ) : (
        <DataTable columns={["Type", "Number", "Date", "Customer", "Status", "Total"]}>
          {rows.map((r) => (
            <tr key={r.kind + r.id} className="hover:bg-brand-light/60">
              <Td className="capitalize">{r.kind}</Td>
              <Td>
                {r.kind === "quotation" ? (
                  <Link
                    to="/quotations/$quotationId"
                    params={{ quotationId: r.id }}
                    className="font-medium text-brand hover:underline"
                  >
                    {r.number}
                  </Link>
                ) : (
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: r.id }}
                    className="font-medium text-brand hover:underline"
                  >
                    {r.number}
                  </Link>
                )}
              </Td>
              <Td>{formatDate(r.date, app.dateFormat)}</Td>
              <Td>{r.customer}</Td>
              <Td>
                <Badge tone={statusTone(r.status)}>
                  {r.kind === "invoice"
                    ? invoiceStatusLabel(r.status)
                    : quotationStatusLabel(r.status)}
                </Badge>
              </Td>
              <Td className="tabular-nums">{money(r.total, company)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
