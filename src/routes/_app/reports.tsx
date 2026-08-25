import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { DataTable, PageHeader, StatCard, Td } from "@/components/otrava/primitives";
import { downloadText, formatDate, money, toCsv } from "@/lib/otrava/format";
import {
  customerSales,
  outstandingRows,
  quotationReport,
  rangeFromPreset,
  salesReport,
} from "@/lib/otrava/reports";
import { useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const invoices = useOtravaStore((s) => s.invoices);
  const payments = useOtravaStore((s) => s.payments);
  const quotations = useOtravaStore((s) => s.quotations);
  const [preset, setPreset] = useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo(
    () =>
      rangeFromPreset(
        preset,
        from && to
          ? { from: new Date(`${from}T00:00:00`), to: new Date(`${to}T23:59:59`) }
          : undefined,
      ),
    [preset, from, to],
  );

  const sales = salesReport(invoices, payments, company.taxEnabled, range);
  const outstanding = outstandingRows(invoices, payments, company.taxEnabled);
  const customers = customerSales(invoices, payments, company.taxEnabled);
  const quotes = quotationReport(quotations, range);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, outstanding balances, customer totals, and quotation conversion."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              const csv = toCsv([
                ["Report", "Value"],
                ["Invoices", sales.invoiceCount],
                ["Invoiced", money(sales.invoiced, company)],
                ["Paid", money(sales.paid, company)],
                ["Outstanding", money(sales.outstanding, company)],
                ["Average invoice", money(sales.average, company)],
                ["Quotation conversion %", quotes.conversionRate.toFixed(1)],
              ]);
              downloadText("otrava-report.csv", csv, "text/csv");
            }}
          >
            Export CSV
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <NativeSelect
          className="max-w-48"
          value={preset}
          onChange={(e) => setPreset(e.target.value as typeof preset)}
        >
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
          <option value="custom">Custom range</option>
        </NativeSelect>
        {preset === "custom" ? (
          <>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        ) : null}
      </div>

      <h2 className="mb-3 font-semibold">Sales report</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Invoices" value={String(sales.invoiceCount)} />
        <StatCard label="Total sales" value={money(sales.invoiced, company)} />
        <StatCard label="Paid" value={money(sales.paid, company)} />
        <StatCard label="Outstanding" value={money(sales.outstanding, company)} />
        <StatCard label="Average invoice" value={money(sales.average, company)} />
      </div>

      <h2 className="mt-8 mb-3 font-semibold">Quotation report</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Quotations" value={String(quotes.total)} />
        <StatCard label="Converted" value={String(quotes.converted)} />
        <StatCard label="Rejected / expired" value={String(quotes.rejected + quotes.expired)} />
        <StatCard label="Conversion rate" value={`${quotes.conversionRate.toFixed(1)}%`} />
      </div>

      <h2 className="mt-8 mb-3 font-semibold">Outstanding invoices</h2>
      {outstanding.length === 0 ? (
        <p className="text-sm text-muted">No outstanding invoices.</p>
      ) : (
        <DataTable
          columns={["Customer", "Invoice", "Date", "Due", "Total", "Paid", "Balance", "Days overdue"]}
        >
          {outstanding.map((row) => (
            <tr key={row.invoice.id}>
              <Td>{row.invoice.customerSnapshot.name}</Td>
              <Td>{row.invoice.number}</Td>
              <Td>{formatDate(row.invoice.date, app.dateFormat)}</Td>
              <Td>{formatDate(row.invoice.dueDate, app.dateFormat)}</Td>
              <Td className="tabular-nums">{money(row.grandTotal, company)}</Td>
              <Td className="tabular-nums">{money(row.amountPaid, company)}</Td>
              <Td className="tabular-nums">{money(row.balanceDue, company)}</Td>
              <Td className="tabular-nums">{row.daysOverdue}</Td>
            </tr>
          ))}
        </DataTable>
      )}

      <h2 className="mt-8 mb-3 font-semibold">Customer sales</h2>
      {customers.length === 0 ? (
        <p className="text-sm text-muted">No customer sales yet.</p>
      ) : (
        <DataTable columns={["Customer", "Invoices", "Invoiced", "Paid", "Outstanding"]}>
          {customers.map((row) => (
            <tr key={row.customerId}>
              <Td>{row.name}</Td>
              <Td className="tabular-nums">{row.count}</Td>
              <Td className="tabular-nums">{money(row.invoiced, company)}</Td>
              <Td className="tabular-nums">{money(row.paid, company)}</Td>
              <Td className="tabular-nums">{money(row.outstanding, company)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
