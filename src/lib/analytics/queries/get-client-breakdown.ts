import { supabase } from "@/lib/supabase";
import type { AnalyticsFilters, ClientBreakdownRow } from "../types";
import { grossProfit, marginPct, num } from "../calculations";
import { DRIVER_WAGE_COST_TYPE, TOP_N } from "../constants";
import { applyFilters, type RawCampaignRow } from "./shared";

export async function getClientBreakdown(filters: AnalyticsFilters): Promise<ClientBreakdownRow[]> {
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

  const rows = (data ?? []) as unknown as RawCampaignRow[];
  return aggregateByClient(rows);
}

interface Accumulator {
  clientName: string;
  revenue: number;
  driverCost: number;
  internalCost: number;
  campaignCount: number;
}

function aggregateByClient(rows: RawCampaignRow[]): ClientBreakdownRow[] {
  const map = new Map<string, Accumulator>();

  for (const row of rows) {
    const clientId = row.client_id;
    const clientName = row.clients?.name ?? "Unknown";

    let acc = map.get(clientId);
    if (!acc) {
      acc = { clientName, revenue: 0, driverCost: 0, internalCost: 0, campaignCount: 0 };
      map.set(clientId, acc);
    }

    acc.revenue += num(row.client_billed_amount);
    acc.campaignCount++;

    for (const cc of row.campaign_costs ?? []) {
      if (cc.cost_types?.name === DRIVER_WAGE_COST_TYPE) {
        acc.driverCost += num(cc.amount);
      } else {
        acc.internalCost += num(cc.amount);
      }
    }
  }

  const results: ClientBreakdownRow[] = [];
  for (const [clientId, acc] of map) {
    const totalCost = acc.driverCost + acc.internalCost;
    const profit = grossProfit(acc.revenue, acc.driverCost, acc.internalCost);
    results.push({
      clientId,
      clientName: acc.clientName,
      revenue: acc.revenue,
      totalCost,
      grossProfit: profit,
      marginPct: marginPct(acc.revenue, profit),
      campaignCount: acc.campaignCount,
    });
  }

  // Sort descending by revenue, take top N
  results.sort((a, b) => b.revenue - a.revenue);
  return results.slice(0, TOP_N);
}
