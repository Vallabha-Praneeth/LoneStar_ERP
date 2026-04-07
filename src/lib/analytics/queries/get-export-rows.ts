import type { CampaignPerformanceRow, ExportRow } from "../types";
import type { AnalyticsFilters } from "../types";
import { formatCurrencyDetail, formatPercent, formatRouteName } from "../formatters";
import { getCampaignRows } from "./get-campaign-rows";

/** Fetch campaign rows and flatten to CSV-safe export format. */
export async function getExportRows(filters: AnalyticsFilters): Promise<ExportRow[]> {
  const rows = await getCampaignRows(filters);
  return rows.map(toExportRow);
}

function toExportRow(row: CampaignPerformanceRow): ExportRow {
  return {
    campaignName: row.campaignName,
    campaignDate: row.campaignDate,
    clientName: row.clientName,
    driverName: row.driverName,
    routeName: formatRouteName(row.routeName),
    status: row.status,
    revenue: formatCurrencyDetail(row.revenue),
    driverCost: formatCurrencyDetail(row.driverCost),
    internalCost: formatCurrencyDetail(row.internalCost),
    grossProfit: formatCurrencyDetail(row.grossProfit),
    marginPct: formatPercent(row.marginPct),
    workedHours: row.workedHours.toFixed(1),
  };
}

/** CSV header row matching ExportRow keys. */
export const EXPORT_HEADERS = [
  "Campaign",
  "Date",
  "Client",
  "Driver",
  "Route",
  "Status",
  "Revenue",
  "Driver Cost",
  "Internal Cost",
  "Gross Profit",
  "Margin %",
  "Worked Hours",
] as const;

/** Convert ExportRow[] to a downloadable CSV string. */
export function exportRowsToCsv(rows: ExportRow[]): string {
  const header = EXPORT_HEADERS.join(",");
  const lines = rows.map((r) =>
    [
      csvWrap(r.campaignName),
      csvWrap(r.campaignDate),
      csvWrap(r.clientName),
      csvWrap(r.driverName),
      csvWrap(r.routeName),
      csvWrap(r.status),
      csvWrap(r.revenue),
      csvWrap(r.driverCost),
      csvWrap(r.internalCost),
      csvWrap(r.grossProfit),
      csvWrap(r.marginPct),
      csvWrap(r.workedHours),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

function csvWrap(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
