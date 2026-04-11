import type { AnalyticsRange, AnalyticsGranularity, CampaignStatus } from "./types";

/** Ranges measured in days (short presets) */
export const RANGE_DAYS: Partial<Record<Exclude<AnalyticsRange, "custom">, number>> = {
  "1w": 7,
};

/** How many months each month-based preset covers */
export const RANGE_MONTHS: Partial<Record<Exclude<AnalyticsRange, "custom">, number>> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "9m": 9,
  "1y": 12,
};

/** Default granularity per range preset */
export const RANGE_GRANULARITY: Record<Exclude<AnalyticsRange, "custom">, AnalyticsGranularity> = {
  "1w": "day",
  "1m": "day",
  "3m": "week",
  "6m": "week",
  "9m": "month",
  "1y": "month",
};

export const DEFAULT_RANGE: AnalyticsRange = "3m";

export const VALID_RANGES: AnalyticsRange[] = ["1w", "1m", "3m", "6m", "9m", "1y", "custom"];

export const VALID_STATUSES: CampaignStatus[] = ["draft", "pending", "active", "completed"];

export const VALID_GRANULARITIES: AnalyticsGranularity[] = ["day", "week", "month"];

/** Number of top clients/drivers to show in breakdown charts */
export const TOP_N = 10;

/** Cost type name used to identify driver wage costs in campaign_costs */
export const DRIVER_WAGE_COST_TYPE = "Driver Wage";
