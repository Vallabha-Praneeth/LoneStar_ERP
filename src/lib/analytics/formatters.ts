/** Display formatting helpers for analytics values. */

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdDetailFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format as USD with no decimals for KPI cards (e.g. "$12,500") */
export function formatCurrency(value: number): string {
  return usdFormatter.format(value);
}

/** Format as USD with 2 decimals for table cells (e.g. "$12,500.00") */
export function formatCurrencyDetail(value: number): string {
  return usdDetailFormatter.format(value);
}

/** Format hours to 1 decimal (e.g. "42.5 hrs") */
export function formatHours(value: number): string {
  return `${value.toFixed(1)} hrs`;
}

/** Format as percentage (e.g. "58.3%") */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Format a number with commas (e.g. "1,234") */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** Safe route name display — returns fallback for null/empty */
export function formatRouteName(name: string | null | undefined): string {
  return name || "No Route";
}

/** Format CSV-safe string value (escapes quotes) */
export function csvSafe(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
