import { calculateDocument, invoiceBalances } from "./calculations";
import { daysBetween, effectiveInvoiceStatus, effectiveQuotationStatus } from "./numbering";
import type { Invoice, Payment, Quotation } from "./types";

export interface DateRange {
  from: Date;
  to: Date;
}

export function rangeFromPreset(
  preset: "today" | "week" | "month" | "year" | "custom",
  custom?: DateRange,
): DateRange {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (preset === "today") return { from: start, to: end };
  if (preset === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { from: start, to: end };
  }
  if (preset === "month") {
    start.setDate(1);
    return { from: start, to: end };
  }
  if (preset === "year") {
    start.setMonth(0, 1);
    return { from: start, to: end };
  }
  return custom ?? { from: start, to: end };
}

function inRange(iso: string, range: DateRange) {
  const t = new Date(iso).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

export function salesReport(
  invoices: Invoice[],
  payments: Payment[],
  taxEnabled: boolean,
  range: DateRange,
) {
  const rows = invoices.filter(
    (i) => i.status !== "cancelled" && i.status !== "draft" && inRange(i.date, range),
  );
  let invoiced = 0;
  let paid = 0;
  let outstanding = 0;
  for (const inv of rows) {
    const totals = calculateDocument(inv.items, { taxEnabled });
    const bal = invoiceBalances(
      totals.grandTotal,
      payments.filter((p) => p.invoiceId === inv.id),
    );
    invoiced += totals.grandTotal;
    paid += bal.amountPaid;
    outstanding += bal.balanceDue;
  }
  return {
    invoiceCount: rows.length,
    invoiced,
    paid,
    outstanding,
    average: rows.length ? invoiced / rows.length : 0,
  };
}

export function outstandingRows(
  invoices: Invoice[],
  payments: Payment[],
  taxEnabled: boolean,
) {
  const now = new Date().toISOString();
  return invoices
    .filter((i) => i.status !== "cancelled" && i.status !== "draft")
    .map((inv) => {
      const totals = calculateDocument(inv.items, { taxEnabled });
      const bal = invoiceBalances(
        totals.grandTotal,
        payments.filter((p) => p.invoiceId === inv.id),
      );
      const status = effectiveInvoiceStatus(inv, bal.balanceDue, bal.amountPaid);
      return {
        invoice: inv,
        ...totals,
        ...bal,
        status,
        daysOverdue: bal.balanceDue > 0 ? Math.max(0, daysBetween(inv.dueDate, now)) : 0,
      };
    })
    .filter((r) => r.balanceDue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function customerSales(
  invoices: Invoice[],
  payments: Payment[],
  taxEnabled: boolean,
) {
  const map = new Map<
    string,
    {
      customerId: string;
      name: string;
      count: number;
      invoiced: number;
      paid: number;
      outstanding: number;
    }
  >();
  for (const inv of invoices) {
    if (inv.status === "cancelled" || inv.status === "draft") continue;
    const totals = calculateDocument(inv.items, { taxEnabled });
    const bal = invoiceBalances(
      totals.grandTotal,
      payments.filter((p) => p.invoiceId === inv.id),
    );
    const current = map.get(inv.customerId) ?? {
      customerId: inv.customerId,
      name: inv.customerSnapshot.companyName || inv.customerSnapshot.name,
      count: 0,
      invoiced: 0,
      paid: 0,
      outstanding: 0,
    };
    current.count += 1;
    current.invoiced += totals.grandTotal;
    current.paid += bal.amountPaid;
    current.outstanding += bal.balanceDue;
    map.set(inv.customerId, current);
  }
  return Array.from(map.values()).sort((a, b) => b.invoiced - a.invoiced);
}

export function quotationReport(quotations: Quotation[], range: DateRange) {
  const rows = quotations.filter((q) => inRange(q.date, range));
  const counts = {
    total: rows.length,
    accepted: 0,
    rejected: 0,
    expired: 0,
    converted: 0,
    draft: 0,
    sent: 0,
  };
  for (const q of rows) {
    const status = effectiveQuotationStatus(q);
    if (status === "accepted") counts.accepted += 1;
    else if (status === "rejected") counts.rejected += 1;
    else if (status === "expired") counts.expired += 1;
    else if (status === "converted") counts.converted += 1;
    else if (status === "sent") counts.sent += 1;
    else counts.draft += 1;
  }
  const relevant = counts.total - counts.draft;
  const conversionRate = relevant > 0 ? (counts.converted / relevant) * 100 : 0;
  return { ...counts, conversionRate };
}
