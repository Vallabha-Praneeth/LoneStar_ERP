import { supabase } from "@/lib/supabase";
import type { AnalyticsFilters, CampaignPerformanceRow, CampaignStatus } from "../types";
import { grossProfit, marginPct, num, workedHours } from "../calculations";
import { DRIVER_WAGE_COST_TYPE } from "../constants";
import { applyFilters, type RawCampaignRow } from "./shared";

export async function getCampaignRows(filters: AnalyticsFilters): Promise<CampaignPerformanceRow[]> {
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
    .order("campaign_date", { ascending: false });

  query = applyFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawCampaignRow[]).map(mapRow);
}

function mapRow(row: RawCampaignRow): CampaignPerformanceRow {
  const revenue = num(row.client_billed_amount);

  let driverCost = 0;
  let internalCost = 0;
  for (const cc of row.campaign_costs ?? []) {
    if (cc.cost_types?.name === DRIVER_WAGE_COST_TYPE) {
      driverCost += num(cc.amount);
    } else {
      internalCost += num(cc.amount);
    }
  }

  let hours = 0;
  for (const shift of row.driver_shifts ?? []) {
    if (shift.shift_status === "completed" && shift.ended_at) {
      hours += workedHours(shift.started_at, shift.ended_at);
    }
  }

  const profit = grossProfit(revenue, driverCost, internalCost);

  return {
    campaignId: row.id,
    campaignName: row.title,
    campaignDate: row.campaign_date,
    clientName: row.clients?.name ?? "Unknown",
    driverName: row.driver_profile?.display_name ?? "Unassigned",
    routeName: row.routes?.name ?? null,
    revenue,
    driverCost,
    internalCost,
    grossProfit: profit,
    marginPct: marginPct(revenue, profit),
    workedHours: hours,
    status: row.status as CampaignStatus,
  };
}
