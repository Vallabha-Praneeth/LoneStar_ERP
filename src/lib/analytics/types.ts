// Analytics domain types — shared contracts consumed by queries, UI, and export.
// These are analytics-specific; domain entity types live in @/lib/types.

export type AnalyticsRange = "1w" | "1m" | "3m" | "6m" | "9m" | "1y" | "custom";
export type AnalyticsGranularity = "day" | "week" | "month";
export type CampaignStatus = "draft" | "pending" | "active" | "completed";

export interface AnalyticsFilters {
  range: AnalyticsRange;
  from: string; // ISO date YYYY-MM-DD, always resolved (never undefined after normalization)
  to: string;   // ISO date YYYY-MM-DD
  clientId?: string;
  driverId?: string;
  campaignId?: string;
  status?: CampaignStatus;
  granularity: AnalyticsGranularity; // always resolved after normalization
}

export interface AnalyticsSummary {
  revenue: number;
  driverCost: number;
  internalCost: number;
  grossProfit: number;
  marginPct: number;
  billableHours: number;
  activeCampaigns: number;
  totalCampaigns: number;
  missingBillingCount: number;
}

export interface TimeseriesPoint {
  bucket: string; // YYYY-MM-DD for day, YYYY-Www for week, YYYY-MM for month
  revenue: number;
  driverCost: number;
  internalCost: number;
  grossProfit: number;
  billableHours: number;
}

export interface ClientBreakdownRow {
  clientId: string;
  clientName: string;
  revenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
  campaignCount: number;
}

export interface DriverBreakdownRow {
  driverId: string;
  driverName: string;
  workedHours: number;
  payout: number;
  avgPayoutPerHour: number;
  campaignCount: number;
}

export interface CampaignPerformanceRow {
  campaignId: string;
  campaignName: string;
  campaignDate: string;
  clientName: string;
  driverName: string;
  routeName: string | null;
  revenue: number;
  driverCost: number;
  internalCost: number;
  grossProfit: number;
  marginPct: number;
  workedHours: number;
  status: CampaignStatus;
}

/** Flat row for CSV export — all strings for serialization safety */
export interface ExportRow {
  campaignName: string;
  campaignDate: string;
  clientName: string;
  driverName: string;
  routeName: string;
  status: string;
  revenue: string;
  driverCost: string;
  internalCost: string;
  grossProfit: string;
  marginPct: string;
  workedHours: string;
}
