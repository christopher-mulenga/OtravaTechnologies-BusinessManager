/** Integer minor units (cents / ngwee) for financial arithmetic. */

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(amount: number, places = 2): number {
  const f = 10 ** places;
  return Math.round((amount + Number.EPSILON) * f) / f;
}

export function formatMoney(
  amount: number,
  options: { symbol: string; decimalPlaces?: number; code?: string },
): string {
  const places = options.decimalPlaces ?? 2;
  const safe = Number.isFinite(amount) ? amount : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  const fixed = abs.toFixed(places);
  const [intPart, decPart] = fixed.split(".");
  const grouped = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  const signed = negative ? `-${body}` : body;
  return `${options.symbol}${signed}`;
}

export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
