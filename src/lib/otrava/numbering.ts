import type { Invoice, InvoiceStatus, Quotation, QuotationStatus } from "./types.ts";

export function formatDocumentNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  const clean = (prefix || "DOC").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "DOC";
  return `${clean}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function sequenceKey(kind: "quotation" | "invoice", year: number): string {
  return `${kind}-${year}`;
}

export function masterSequenceKey(
  kind: "customer" | "item" | "quotation" | "invoice",
): string {
  return kind;
}

export function formatMasterCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function startOfDayIso(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function toDateInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateInput(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function isPastDate(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return a.getTime() < b.getTime();
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function effectiveQuotationStatus(
  quotation: Quotation,
  now = new Date(),
): QuotationStatus {
  if (
    quotation.status === "converted" ||
    quotation.status === "accepted" ||
    quotation.status === "rejected"
  ) {
    return quotation.status;
  }
  if (
    (quotation.status === "draft" || quotation.status === "sent") &&
    isPastDate(quotation.validUntil, now)
  ) {
    return "expired";
  }
  return quotation.status;
}

export function effectiveInvoiceStatus(
  invoice: Invoice,
  balanceDue: number,
  amountPaid: number,
  now = new Date(),
): InvoiceStatus {
  if (invoice.status === "cancelled" || invoice.status === "draft") {
    return invoice.status;
  }
  if (balanceDue <= 0 && amountPaid > 0) return "paid";
  if (amountPaid > 0 && balanceDue > 0) {
    if (isPastDate(invoice.dueDate, now)) return "overdue";
    return "partially_paid";
  }
  if (isPastDate(invoice.dueDate, now) && balanceDue > 0) return "overdue";
  return "issued";
}
