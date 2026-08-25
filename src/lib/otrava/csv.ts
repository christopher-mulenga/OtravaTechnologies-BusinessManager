import { calculateDocument, invoiceBalances } from "./calculations";
import { formatDate, money, paymentMethodLabel, toCsv } from "./format";
import { effectiveInvoiceStatus, effectiveQuotationStatus } from "./numbering";
import type { OtravaData } from "./types";

export function customersCsv(data: OtravaData): string {
  return toCsv([
    [
      "Code",
      "Name",
      "Company",
      "Phone",
      "Email",
      "City",
      "Country",
      "Tax Number",
      "Active",
    ],
    ...data.customers.map((c) => [
      c.code,
      c.name,
      c.companyName,
      c.phone,
      c.email,
      c.city,
      c.country,
      c.taxNumber,
      c.active ? "Yes" : "No",
    ]),
  ]);
}

export function catalogueCsv(data: OtravaData): string {
  return toCsv([
    ["Code", "Name", "Type", "Category", "Unit", "Price", "Tax Rate", "Active"],
    ...data.items.map((i) => [
      i.code,
      i.name,
      i.type,
      i.category,
      i.unit,
      i.price,
      i.taxRate,
      i.active ? "Yes" : "No",
    ]),
  ]);
}

export function quotationsCsv(data: OtravaData): string {
  const fmt = data.app.dateFormat;
  return toCsv([
    ["Number", "Date", "Customer", "Status", "Total", "Valid Until"],
    ...data.quotations.map((q) => {
      const totals = calculateDocument(q.items, {
        taxEnabled: data.company.taxEnabled,
      });
      return [
        q.number,
        formatDate(q.date, fmt),
        q.customerSnapshot.name,
        effectiveQuotationStatus(q),
        money(totals.grandTotal, data.company),
        formatDate(q.validUntil, fmt),
      ];
    }),
  ]);
}

export function invoicesCsv(data: OtravaData): string {
  const fmt = data.app.dateFormat;
  return toCsv([
    [
      "Number",
      "Date",
      "Due Date",
      "Customer",
      "Status",
      "Total",
      "Paid",
      "Balance",
      "Quotation",
    ],
    ...data.invoices.map((inv) => {
      const totals = calculateDocument(inv.items, {
        taxEnabled: data.company.taxEnabled,
      });
      const bal = invoiceBalances(
        totals.grandTotal,
        data.payments.filter((p) => p.invoiceId === inv.id),
      );
      return [
        inv.number,
        formatDate(inv.date, fmt),
        formatDate(inv.dueDate, fmt),
        inv.customerSnapshot.name,
        effectiveInvoiceStatus(inv, bal.balanceDue, bal.amountPaid),
        money(totals.grandTotal, data.company),
        money(bal.amountPaid, data.company),
        money(bal.balanceDue, data.company),
        inv.quotationNumber ?? "",
      ];
    }),
  ]);
}

export function paymentsCsv(data: OtravaData): string {
  const fmt = data.app.dateFormat;
  return toCsv([
    ["Date", "Invoice", "Customer", "Method", "Reference", "Amount"],
    ...data.payments.map((p) => {
      const inv = data.invoices.find((i) => i.id === p.invoiceId);
      return [
        formatDate(p.date, fmt),
        inv?.number ?? "",
        inv?.customerSnapshot.name ?? "",
        paymentMethodLabel(p.method),
        p.reference,
        money(p.amount, data.company),
      ];
    }),
  ]);
}
