import { supabase } from "@/lib/supabase";
import { format, parseISO, startOfWeek } from "date-fns";
import type { AnalyticsFilters, AnalyticsGranularity, TimeseriesPoint } from "../types";
import { grossProfit, num, workedHours } from "../calculations";
import { DRIVER_WAGE_COST_TYPE } from "../constants";
import { applyFilters, type RawCampaignRow } from "./shared";

export async function getTimeseries(filters: AnalyticsFilters): Promise<TimeseriesPoint[]> {
  let query = supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status, client_billed_amount,
      client_id, driver_profile_id, route_id,
      clients ( id, name ),
      driver_profile:profiles!driver_profile_id ( id, display_name ),
      routes:route_id ( name ),
      campaign_costs ( amount, cost_types ( name ) ),
      driver_shifts ( started_at, ended_at, shift_status )
    `)
    .order("campaign_date", { ascending: true });

  query = applyFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawCampaignRow[];
  return aggregateByBucket(rows, filters.granularity);
}

function bucketKey(campaignDate: string, granularity: AnalyticsGranularity): string {
  const d = parseISO(campaignDate);
  switch (granularity) {
    case "day":
      return format(d, "yyyy-MM-dd");
    case "week": {
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      return format(weekStart, "yyyy-'W'II");
    }
    case "month":
      return format(d, "yyyy-MM");
  }
}

function aggregateByBucket(
  rows: RawCampaignRow[],
  granularity: AnalyticsGranularity,
): TimeseriesPoint[] {
  const map = new Map<string, TimeseriesPoint>();

  for (const row of rows) {
    const key = bucketKey(row.campaign_date, granularity);
    let point = map.get(key);
    if (!point) {
      point = { bucket: key, revenue: 0, driverCost: 0, internalCost: 0, grossProfit: 0, billableHours: 0 };
      map.set(key, point);
    }

    point.revenue += num(row.client_billed_amount);

    for (const cc of row.campaign_costs ?? []) {
      if (cc.cost_types?.name === DRIVER_WAGE_COST_TYPE) {
        point.driverCost += num(cc.amount);
      } else {
        point.internalCost += num(cc.amount);
      }
    }

    for (const shift of row.driver_shifts ?? []) {
      if (shift.shift_status === "completed" && shift.ended_at) {
        point.billableHours += workedHours(shift.started_at, shift.ended_at);
      }
    }
  }

  // Compute grossProfit for each bucket
  for (const point of map.values()) {
    point.grossProfit = grossProfit(point.revenue, point.driverCost, point.internalCost);
  }

  // Return sorted ascending by bucket key
  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}
