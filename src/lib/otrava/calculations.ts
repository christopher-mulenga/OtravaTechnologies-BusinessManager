import type { DocumentTotals, LineItem, LineTotals } from "./types.ts";
import { fromCents, toCents } from "./money.ts";

export interface CalculationOptions {
  taxEnabled: boolean;
}

function lineDiscountCents(lineGrossCents: number, item: LineItem): number {
  if (item.discountValue <= 0 || lineGrossCents <= 0) return 0;
  if (item.discountType === "percent") {
    const pct = Math.min(Math.max(item.discountValue, 0), 100);
    return Math.round((lineGrossCents * pct) / 100);
  }
  const fixed = toCents(item.discountValue);
  return Math.min(Math.max(fixed, 0), lineGrossCents);
}

export function calculateLine(
  item: LineItem,
  options: CalculationOptions,
): LineTotals {
  const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
  const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
  const lineGrossCents = Math.round(quantity * unitPrice * 100);
  const discountCents = lineDiscountCents(lineGrossCents, item);
  const taxableCents = lineGrossCents - discountCents;
  const rate = options.taxEnabled
    ? Math.min(Math.max(item.taxRate || 0, 0), 100)
    : 0;
  const taxCents = Math.round((taxableCents * rate) / 100);
  const amountCents = taxableCents + taxCents;

  return {
    quantity,
    unitPrice,
    lineSubtotal: fromCents(lineGrossCents),
    discount: fromCents(discountCents),
    taxable: fromCents(taxableCents),
    tax: fromCents(taxCents),
    amount: fromCents(amountCents),
  };
}

export function calculateDocument(
  items: LineItem[],
  options: CalculationOptions,
): DocumentTotals {
  const lines = items.map((item) => calculateLine(item, options));
  const subtotalCents = lines.reduce((s, l) => s + toCents(l.lineSubtotal), 0);
  const discountCents = lines.reduce((s, l) => s + toCents(l.discount), 0);
  const taxCents = lines.reduce((s, l) => s + toCents(l.tax), 0);
  const grandCents = lines.reduce((s, l) => s + toCents(l.amount), 0);

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    tax: fromCents(taxCents),
    grandTotal: fromCents(grandCents),
    lines,
  };
}

export function invoiceBalances(
  grandTotal: number,
  payments: { amount: number }[],
): { amountPaid: number; balanceDue: number } {
  const paidCents = payments.reduce((s, p) => s + toCents(p.amount), 0);
  const totalCents = toCents(grandTotal);
  const paid = fromCents(Math.min(Math.max(paidCents, 0), totalCents));
  const balance = fromCents(Math.max(totalCents - toCents(paid), 0));
  return { amountPaid: paid, balanceDue: balance };
}
