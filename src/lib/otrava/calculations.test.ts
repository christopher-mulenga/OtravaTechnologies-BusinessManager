import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDocument, calculateLine, invoiceBalances } from "./calculations.ts";
import { formatDocumentNumber } from "./numbering.ts";
import type { LineItem } from "./types.ts";

function line(partial: Partial<LineItem>): LineItem {
  return {
    id: "1",
    catalogueItemId: null,
    description: "Item",
    quantity: 1,
    unitPrice: 0,
    discountType: "percent",
    discountValue: 0,
    taxRate: 0,
    ...partial,
  };
}

describe("calculations", () => {
  it("multiplies quantity by unit price", () => {
    const result = calculateLine(line({ quantity: 2, unitPrice: 1500 }), {
      taxEnabled: false,
    });
    assert.equal(result.lineSubtotal, 3000);
    assert.equal(result.amount, 3000);
  });

  it("applies a fixed discount then tax", () => {
    const result = calculateLine(
      line({
        quantity: 2,
        unitPrice: 1500,
        discountType: "fixed",
        discountValue: 300,
        taxRate: 16,
      }),
      { taxEnabled: true },
    );
    assert.equal(result.lineSubtotal, 3000);
    assert.equal(result.discount, 300);
    assert.equal(result.taxable, 2700);
    assert.equal(result.tax, 432);
    assert.equal(result.amount, 3132);
  });

  it("applies a percentage discount", () => {
    const result = calculateLine(
      line({
        quantity: 1,
        unitPrice: 1000,
        discountType: "percent",
        discountValue: 10,
        taxRate: 16,
      }),
      { taxEnabled: true },
    );
    assert.equal(result.discount, 100);
    assert.equal(result.taxable, 900);
    assert.equal(result.tax, 144);
    assert.equal(result.amount, 1044);
  });

  it("handles zero values", () => {
    const result = calculateLine(line({ quantity: 0, unitPrice: 100 }), {
      taxEnabled: true,
    });
    assert.equal(result.amount, 0);
  });

  it("handles decimal quantities", () => {
    const result = calculateLine(line({ quantity: 1.5, unitPrice: 200 }), {
      taxEnabled: false,
    });
    assert.equal(result.lineSubtotal, 300);
  });

  it("rounds monetary values to two decimals", () => {
    const result = calculateLine(
      line({ quantity: 1, unitPrice: 10.125, taxRate: 16 }),
      { taxEnabled: true },
    );
    assert.equal(result.lineSubtotal, 10.13);
    assert.equal(Number(result.amount.toFixed(2)), result.amount);
  });

  it("handles large amounts", () => {
    const result = calculateLine(line({ quantity: 1000, unitPrice: 9999.99 }), {
      taxEnabled: false,
    });
    assert.equal(result.lineSubtotal, 9_999_990);
  });

  it("skips tax when tax is disabled", () => {
    const result = calculateLine(
      line({ quantity: 1, unitPrice: 100, taxRate: 16 }),
      { taxEnabled: false },
    );
    assert.equal(result.tax, 0);
    assert.equal(result.amount, 100);
  });

  it("sums a document from multiple lines", () => {
    const totals = calculateDocument(
      [
        line({ quantity: 2, unitPrice: 100, taxRate: 16 }),
        line({ quantity: 1, unitPrice: 50, discountType: "fixed", discountValue: 10, taxRate: 16 }),
      ],
      { taxEnabled: true },
    );
    assert.equal(totals.subtotal, 250);
    assert.equal(totals.discount, 10);
    assert.equal(totals.tax, 38.4);
    assert.equal(totals.grandTotal, 278.4);
  });

  it("computes invoice balances from payments", () => {
    const bal = invoiceBalances(1000, [{ amount: 250 }, { amount: 250 }]);
    assert.equal(bal.amountPaid, 500);
    assert.equal(bal.balanceDue, 500);
  });
});

describe("numbering", () => {
  it("formats quotation and invoice numbers", () => {
    assert.equal(formatDocumentNumber("QT", 2026, 1), "QT-2026-0001");
    assert.equal(formatDocumentNumber("INV", 2026, 12), "INV-2026-0012");
  });
});
