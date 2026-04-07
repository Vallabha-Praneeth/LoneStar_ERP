import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { CampaignPerformanceRow } from "@/lib/analytics/types";
import {
  formatCurrencyDetail,
  formatPercent,
  formatHours,
  formatRouteName,
} from "@/lib/analytics/formatters";

type SortField = "campaignDate" | "revenue" | "grossProfit" | "marginPct" | "workedHours";
type SortDir = "asc" | "desc";

interface CampaignPerformanceTableProps {
  data: CampaignPerformanceRow[];
}

const columns: { key: SortField | null; label: string; align?: "right" | "center"; hideOnMobile?: boolean }[] = [
  { key: null, label: "Campaign" },
  { key: null, label: "Client", hideOnMobile: true },
  { key: null, label: "Driver", hideOnMobile: true },
  { key: null, label: "Route", hideOnMobile: true },
  { key: "campaignDate", label: "Date", hideOnMobile: true },
  { key: "revenue", label: "Revenue", align: "right" },
  { key: null, label: "Driver Cost", align: "right", hideOnMobile: true },
  { key: null, label: "Internal Cost", align: "right", hideOnMobile: true },
  { key: "grossProfit", label: "Profit", align: "right" },
  { key: "marginPct", label: "Margin", align: "right", hideOnMobile: true },
  { key: "workedHours", label: "Hours", align: "right", hideOnMobile: true },
  { key: null, label: "Status", align: "center" },
];

export function CampaignPerformanceTable({ data }: CampaignPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>("campaignDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        No campaign data for the selected period
      </p>
    );
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const diff = (av as number) - (bv as number);
    return sortDir === "asc" ? diff : -diff;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                } ${col.hideOnMobile ? "hidden md:table-cell" : ""}`}
              >
                {col.key ? (
                  <button
                    onClick={() => handleSort(col.key!)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.campaignId}
              className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2.5 font-medium text-foreground max-w-[180px] truncate">
                {row.campaignName}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                {row.clientName}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                {row.driverName}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                {formatRouteName(row.routeName)}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                {row.campaignDate}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatCurrencyDetail(row.revenue)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                {formatCurrencyDetail(row.driverCost)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                {formatCurrencyDetail(row.internalCost)}
              </td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                row.grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}>
                {formatCurrencyDetail(row.grossProfit)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                {formatPercent(row.marginPct)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                {formatHours(row.workedHours)}
              </td>
              <td className="px-3 py-2.5 text-center">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
