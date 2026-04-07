import { supabase } from "@/lib/supabase";
import type { AnalyticsFilters, AnalyticsSummary } from "../types";
import { grossProfit, marginPct, num, workedHours } from "../calculations";
import { DRIVER_WAGE_COST_TYPE } from "../constants";
import { applyFilters, type RawCampaignRow } from "./shared";

export async function getSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary> {
  const rows = await fetchFilteredCampaigns(filters);

  let revenue = 0;
  let driverCost = 0;
  let internalCost = 0;
  let billableHours = 0;
  let activeCampaigns = 0;
  let missingBillingCount = 0;

  for (const row of rows) {
    revenue += num(row.client_billed_amount);

    if (row.client_billed_amount == null) {
      missingBillingCount++;
    }

    for (const cc of row.campaign_costs ?? []) {
      if (cc.cost_types?.name === DRIVER_WAGE_COST_TYPE) {
        driverCost += num(cc.amount);
      } else {
        internalCost += num(cc.amount);
      }
    }

    for (const shift of row.driver_shifts ?? []) {
      if (shift.shift_status === "completed" && shift.ended_at) {
        billableHours += workedHours(shift.started_at, shift.ended_at);
      }
    }

    if (row.status === "active") activeCampaigns++;
  }

  const profit = grossProfit(revenue, driverCost, internalCost);

  return {
    revenue,
    driverCost,
    internalCost,
    grossProfit: profit,
    marginPct: marginPct(revenue, profit),
    billableHours,
    activeCampaigns,
    totalCampaigns: rows.length,
    missingBillingCount,
  };
}

async function fetchFilteredCampaigns(filters: AnalyticsFilters): Promise<RawCampaignRow[]> {
  let query = supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status, client_billed_amount,
      client_id,
      driver_profile_id,
      route_id,
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
  return (data ?? []) as unknown as RawCampaignRow[];
}
