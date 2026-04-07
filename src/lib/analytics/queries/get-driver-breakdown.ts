import { supabase } from "@/lib/supabase";
import type { AnalyticsFilters, DriverBreakdownRow } from "../types";
import { avgPayoutPerHour, num, workedHours } from "../calculations";
import { DRIVER_WAGE_COST_TYPE, TOP_N } from "../constants";
import { applyFilters, type RawCampaignRow } from "./shared";

export async function getDriverBreakdown(filters: AnalyticsFilters): Promise<DriverBreakdownRow[]> {
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
  return aggregateByDriver(rows);
}

interface Accumulator {
  driverName: string;
  hours: number;
  payout: number;
  campaignCount: number;
}

function aggregateByDriver(rows: RawCampaignRow[]): DriverBreakdownRow[] {
  const map = new Map<string, Accumulator>();

  for (const row of rows) {
    const driverId = row.driver_profile_id;
    if (!driverId) continue; // unassigned campaign — skip

    const driverName = row.driver_profile?.display_name ?? "Unknown";

    let acc = map.get(driverId);
    if (!acc) {
      acc = { driverName, hours: 0, payout: 0, campaignCount: 0 };
      map.set(driverId, acc);
    }

    acc.campaignCount++;

    for (const cc of row.campaign_costs ?? []) {
      if (cc.cost_types?.name === DRIVER_WAGE_COST_TYPE) {
        acc.payout += num(cc.amount);
      }
    }

    for (const shift of row.driver_shifts ?? []) {
      if (shift.shift_status === "completed" && shift.ended_at) {
        acc.hours += workedHours(shift.started_at, shift.ended_at);
      }
    }
  }

  const results: DriverBreakdownRow[] = [];
  for (const [driverId, acc] of map) {
    results.push({
      driverId,
      driverName: acc.driverName,
      workedHours: acc.hours,
      payout: acc.payout,
      avgPayoutPerHour: avgPayoutPerHour(acc.payout, acc.hours),
      campaignCount: acc.campaignCount,
    });
  }

  // Sort descending by payout, take top N
  results.sort((a, b) => b.payout - a.payout);
  return results.slice(0, TOP_N);
}
