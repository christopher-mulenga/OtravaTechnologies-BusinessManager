import { format as formatDateFns, parseISO } from "date-fns";
import type { AppSettings, CompanySettings, PaymentMethod } from "./types";
import { formatMoney } from "./money";

export function formatDate(iso: string, dateFormat: AppSettings["dateFormat"]): string {
  if (!iso) return "—";
  try {
    const d = iso.length <= 10 ? parseISO(`${iso}T12:00:00`) : parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    if (dateFormat === "yyyy-MM-dd") return formatDateFns(d, "yyyy-MM-dd");
    if (dateFormat === "dd/MM/yyyy") return formatDateFns(d, "dd/MM/yyyy");
    return formatDateFns(d, "dd MMM yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    return formatDateFns(parseISO(iso), "dd MMM yyyy HH:mm");
  } catch {
    return iso;
  }
}

export function money(amount: number, company: CompanySettings): string {
  return formatMoney(amount, {
    symbol: company.currencySymbol || "K",
    decimalPlaces: company.decimalPlaces ?? 2,
    code: company.currencyCode,
  });
}

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "bank_transfer":
      return "Bank Transfer";
    case "mobile_money":
      return "Mobile Money";
    case "card":
      return "Card";
    default:
      return "Other";
  }
}

export function quotationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    converted: "Converted",
  };
  return map[status] ?? status;
}

export function invoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    issued: "Issued",
    partially_paid: "Partially Paid",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export function customerDisplayName(c: {
  name: string;
  companyName?: string;
}): string {
  if (c.companyName && c.companyName !== c.name) {
    return `${c.name} · ${c.companyName}`;
  }
  return c.name || c.companyName || "Unnamed customer";
}

export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid.replace(/-/g, "").slice(0, 16)}`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  downloadBlob(filename, new Blob([text], { type }));
}

export function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}
