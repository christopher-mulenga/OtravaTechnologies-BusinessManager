import { calculateDocument, invoiceBalances } from "./calculations";
import { formatDate, money, paymentMethodLabel } from "./format";
import type {
  AppSettings,
  CompanySettings,
  DocumentTotals,
  Invoice,
  Payment,
  Quotation,
} from "./types";

export type DocumentKind = "quotation" | "invoice";

interface PdfDocInput {
  kind: DocumentKind;
  number: string;
  date: string;
  secondDateLabel: string;
  secondDate: string;
  status: string;
  customerName: string;
  customerCompany: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerTax: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    amount: number;
  }>;
  totals: DocumentTotals;
  notes: string;
  terms: string;
  preparedBy: string;
  amountPaid?: number;
  balanceDue?: number;
  payments?: Payment[];
  relatedNumber?: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildPdfInputFromQuotation(
  quotation: Quotation,
  company: CompanySettings,
  app: AppSettings,
  status: string,
): PdfDocInput {
  const totals = calculateDocument(quotation.items, { taxEnabled: company.taxEnabled });
  return {
    kind: "quotation",
    number: quotation.number,
    date: formatDate(quotation.date, app.dateFormat),
    secondDateLabel: "Valid until",
    secondDate: formatDate(quotation.validUntil, app.dateFormat),
    status,
    customerName: quotation.customerSnapshot.name,
    customerCompany: quotation.customerSnapshot.companyName,
    customerAddress: [
      quotation.customerSnapshot.physicalAddress,
      quotation.customerSnapshot.city,
      quotation.customerSnapshot.country,
    ]
      .filter(Boolean)
      .join(", "),
    customerPhone: quotation.customerSnapshot.phone,
    customerEmail: quotation.customerSnapshot.email,
    customerTax: quotation.customerSnapshot.taxNumber,
    items: quotation.items.map((item, i) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: totals.lines[i]?.discount ?? 0,
      tax: totals.lines[i]?.tax ?? 0,
      amount: totals.lines[i]?.amount ?? 0,
    })),
    totals,
    notes: quotation.notes,
    terms: quotation.terms,
    preparedBy: quotation.preparedBy,
  };
}

export function buildPdfInputFromInvoice(
  invoice: Invoice,
  payments: Payment[],
  company: CompanySettings,
  app: AppSettings,
  status: string,
): PdfDocInput {
  const totals = calculateDocument(invoice.items, { taxEnabled: company.taxEnabled });
  const bal = invoiceBalances(totals.grandTotal, payments);
  return {
    kind: "invoice",
    number: invoice.number,
    date: formatDate(invoice.date, app.dateFormat),
    secondDateLabel: "Due date",
    secondDate: formatDate(invoice.dueDate, app.dateFormat),
    status,
    customerName: invoice.customerSnapshot.name,
    customerCompany: invoice.customerSnapshot.companyName,
    customerAddress: [
      invoice.customerSnapshot.physicalAddress,
      invoice.customerSnapshot.city,
      invoice.customerSnapshot.country,
    ]
      .filter(Boolean)
      .join(", "),
    customerPhone: invoice.customerSnapshot.phone,
    customerEmail: invoice.customerSnapshot.email,
    customerTax: invoice.customerSnapshot.taxNumber,
    items: invoice.items.map((item, i) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: totals.lines[i]?.discount ?? 0,
      tax: totals.lines[i]?.tax ?? 0,
      amount: totals.lines[i]?.amount ?? 0,
    })),
    totals,
    notes: invoice.notes,
    terms: invoice.terms,
    preparedBy: invoice.preparedBy,
    amountPaid: bal.amountPaid,
    balanceDue: bal.balanceDue,
    payments,
    relatedNumber: invoice.quotationNumber,
  };
}

export async function exportDocumentPdf(
  company: CompanySettings,
  app: AppSettings,
  input: PdfDocInput,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const paper = app.paperSize === "Letter" ? "letter" : "a4";
  const doc = new jsPDF({ unit: "mm", format: paper });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const brand = hexToRgb(company.primaryColor || "#315B65");
  const dark = hexToRgb(company.secondaryColor || "#1E3E45");
  const m = (n: number) => money(n, company);

  const drawHeader = (page: number, pages: number) => {
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setFillColor(...brand);
    doc.rect(0, 28, pageW, 1.2, "F");
    if (company.logoDataUrl && company.logoDataUrl.startsWith("data:image")) {
      try {
        doc.addImage(company.logoDataUrl, "PNG", margin, 5, 18, 18);
      } catch {
        /* logo optional */
      }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(company.name, margin + (company.logoDataUrl ? 22 : 0), 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const contact = [company.phone, company.email, company.website].filter(Boolean).join("  ·  ");
    doc.text(contact || company.businessAddress, margin + (company.logoDataUrl ? 22 : 0), 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(input.kind === "invoice" ? "INVOICE" : "QUOTATION", pageW - margin, 12, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${input.number}   ·   Page ${page} of ${pages}`, pageW - margin, 18, {
      align: "right",
    });
  };

  const drawFooter = () => {
    doc.setFillColor(...dark);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text(
      company.footerText || "Thank you for your business.",
      pageW / 2,
      pageH - 5,
      { align: "center" },
    );
  };

  let y = 38;
  const ensure = (need: number) => {
    if (y + need > pageH - 18) {
      drawFooter();
      doc.addPage();
      y = 38;
    }
  };

  // We'll do a two-pass for page numbers by rendering then ignoring... simpler: just draw as we go
  // and put page numbers using jsPDF getNumberOfPages at the end.

  const body = () => {
    doc.setTextColor(30, 40, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Bill to", margin, y);
    doc.text("Document", pageW / 2 + 8, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const left = [
      input.customerName,
      input.customerCompany,
      input.customerAddress,
      input.customerPhone,
      input.customerEmail,
      input.customerTax ? `Tax: ${input.customerTax}` : "",
    ].filter(Boolean);
    const right = [
      `Number: ${input.number}`,
      `Date: ${input.date}`,
      `${input.secondDateLabel}: ${input.secondDate}`,
      `Status: ${input.status.toUpperCase()}`,
      input.relatedNumber ? `From quotation: ${input.relatedNumber}` : "",
      `Prepared by: ${input.preparedBy}`,
    ].filter(Boolean);
    const rows = Math.max(left.length, right.length);
    for (let i = 0; i < rows; i++) {
      if (left[i]) doc.text(left[i], margin, y);
      if (right[i]) doc.text(right[i], pageW / 2 + 8, y);
      y += 4.4;
    }
    y += 4;

    const cols = [
      { x: margin, w: 8, label: "#" },
      { x: margin + 8, w: 72, label: "Description" },
      { x: margin + 80, w: 16, label: "Qty" },
      { x: margin + 96, w: 24, label: "Unit" },
      { x: margin + 120, w: 22, label: "Disc." },
      { x: margin + 142, w: 20, label: company.taxLabel || "Tax" },
      { x: margin + 162, w: pageW - margin - 162, label: "Amount" },
    ];

    const headerRow = () => {
      ensure(10);
      doc.setFillColor(...brand);
      doc.rect(margin, y - 4.5, pageW - margin * 2, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      cols.forEach((c, idx) => {
        const align = idx >= 2 ? "right" : "left";
        doc.text(c.label, align === "right" ? c.x + c.w : c.x, y, { align });
      });
      y += 6;
      doc.setTextColor(30, 40, 42);
      doc.setFont("helvetica", "normal");
    };

    headerRow();
    input.items.forEach((item, idx) => {
      const descLines = wrap(item.description || "Item", 46);
      const h = Math.max(6, descLines.length * 4 + 2);
      if (y + h > pageH - 18) {
        drawFooter();
        doc.addPage();
        y = 38;
        headerRow();
      }
      if (idx % 2 === 1) {
        doc.setFillColor(232, 240, 242);
        doc.rect(margin, y - 3.5, pageW - margin * 2, h, "F");
      }
      doc.setFontSize(8);
      doc.text(String(idx + 1), cols[0].x, y);
      descLines.forEach((line, li) => doc.text(line, cols[1].x, y + li * 4));
      doc.text(String(item.quantity), cols[2].x + cols[2].w, y, { align: "right" });
      doc.text(m(item.unitPrice), cols[3].x + cols[3].w, y, { align: "right" });
      doc.text(m(item.discount), cols[4].x + cols[4].w, y, { align: "right" });
      doc.text(m(item.tax), cols[5].x + cols[5].w, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(m(item.amount), cols[6].x + cols[6].w, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += h;
    });

    y += 4;
    ensure(40);
    const boxX = pageW - margin - 70;
    const addTotal = (label: string, value: string, emphasize = false) => {
      if (emphasize) {
        doc.setFillColor(...brand);
        doc.rect(boxX - 4, y - 4, 74, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(30, 40, 42);
        doc.setFont("helvetica", emphasize ? "bold" : "normal");
      }
      doc.setFontSize(9);
      doc.text(label, boxX, y);
      doc.text(value, pageW - margin, y, { align: "right" });
      y += 7;
      doc.setTextColor(30, 40, 42);
    };
    addTotal("Subtotal", m(input.totals.subtotal));
    addTotal("Discount", m(input.totals.discount));
    addTotal(company.taxLabel || "Tax", m(input.totals.tax));
    addTotal("Grand total", m(input.totals.grandTotal), true);
    if (input.kind === "invoice") {
      addTotal("Amount paid", m(input.amountPaid ?? 0));
      addTotal("Balance due", m(input.balanceDue ?? 0), true);
    }

    if (input.kind === "invoice") {
      y += 2;
      ensure(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Payment information", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const payLines = [
        company.paymentInfo,
        company.bankName ? `Bank: ${company.bankName}` : "",
        company.bankAccountName ? `Account name: ${company.bankAccountName}` : "",
        company.bankAccountNumber ? `Account number: ${company.bankAccountNumber}` : "",
        company.bankBranch ? `Branch: ${company.bankBranch}` : "",
      ].filter(Boolean);
      for (const line of payLines) {
        ensure(5);
        doc.text(line, margin, y);
        y += 4.2;
      }
    }

    if (input.notes) {
      y += 3;
      ensure(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Notes", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const line of wrap(input.notes, 95)) {
        ensure(5);
        doc.text(line, margin, y);
        y += 4.2;
      }
    }
    if (input.terms) {
      y += 3;
      ensure(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Terms & conditions", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const line of wrap(input.terms, 95)) {
        ensure(5);
        doc.text(line, margin, y);
        y += 4.2;
      }
    }
  };

  body();
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    drawHeader(p, pages);
    drawFooter();
  }

  const filename = `${input.kind === "invoice" ? "Invoice" : "Quotation"}-${input.number}.pdf`;
  doc.save(filename);
}

export function printDocumentHtml(
  company: CompanySettings,
  app: AppSettings,
  input: PdfDocInput,
) {
  const m = (n: number) => money(n, company);
  const rows = input.items
    .map(
      (item, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${m(item.unitPrice)}</td>
        <td class="num">${m(item.discount)}</td>
        <td class="num">${m(item.tax)}</td>
        <td class="num">${m(item.amount)}</td>
      </tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>${input.kind === "invoice" ? "Invoice" : "Quotation"} ${input.number}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1a2426; margin: 0; }
  .bar { background: ${company.secondaryColor}; color: #fff; padding: 18px 28px; display: flex; justify-content: space-between; align-items: center; }
  .brand { background: ${company.primaryColor}; height: 6px; }
  h1 { margin: 0; font-size: 22px; letter-spacing: 0.08em; }
  .wrap { padding: 24px 28px 48px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 22px; }
  .muted { color: #5c6b70; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${company.primaryColor}; color: #fff; text-align: left; padding: 8px; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #d5dee1; font-size: 13px; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; width: 280px; margin-top: 16px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .grand { background: ${company.primaryColor}; color: #fff; padding: 8px 10px !important; }
  footer { margin-top: 32px; font-size: 12px; color: #5c6b70; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="bar">
    <div>
      <strong>${escapeHtml(company.name)}</strong><br/>
      <span style="font-size:12px">${escapeHtml([company.businessAddress, company.phone, company.email].filter(Boolean).join(" · "))}</span>
    </div>
    <h1>${input.kind === "invoice" ? "INVOICE" : "QUOTATION"}</h1>
  </div>
  <div class="brand"></div>
  <div class="wrap">
    <div class="grid">
      <div>
        <div class="muted">Bill to</div>
        <strong>${escapeHtml(input.customerName)}</strong><br/>
        ${escapeHtml(input.customerCompany)}<br/>
        ${escapeHtml(input.customerAddress)}<br/>
        ${escapeHtml(input.customerPhone)} ${escapeHtml(input.customerEmail)}
      </div>
      <div>
        <div class="muted">Document</div>
        Number: ${escapeHtml(input.number)}<br/>
        Date: ${escapeHtml(input.date)}<br/>
        ${escapeHtml(input.secondDateLabel)}: ${escapeHtml(input.secondDate)}<br/>
        Status: ${escapeHtml(input.status.toUpperCase())}
      </div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th>
        <th class="num">Discount</th><th class="num">${escapeHtml(company.taxLabel || "Tax")}</th><th class="num">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${m(input.totals.subtotal)}</span></div>
      <div><span>Discount</span><span>${m(input.totals.discount)}</span></div>
      <div><span>${escapeHtml(company.taxLabel || "Tax")}</span><span>${m(input.totals.tax)}</span></div>
      <div class="grand"><span>Grand total</span><span>${m(input.totals.grandTotal)}</span></div>
      ${
        input.kind === "invoice"
          ? `<div><span>Amount paid</span><span>${m(input.amountPaid ?? 0)}</span></div>
             <div class="grand"><span>Balance due</span><span>${m(input.balanceDue ?? 0)}</span></div>`
          : ""
      }
    </div>
    ${input.notes ? `<footer><strong>Notes</strong><br/>${escapeHtml(input.notes)}</footer>` : ""}
    ${input.terms ? `<footer><strong>Terms & conditions</strong><br/>${escapeHtml(input.terms)}</footer>` : ""}
    <footer>${escapeHtml(company.footerText)}</footer>
  </div>
</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}
