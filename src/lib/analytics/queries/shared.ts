/**
 * Shared query helpers for analytics — raw row type and common filter application.
 * Each query file imports from here to avoid duplicating the Supabase filter logic.
 */
import type { AnalyticsFilters } from "../types";

/** Shape returned by the common Supabase .select() used across analytics queries. */
export interface RawCampaignRow {
  id: string;
  title: string;
  campaign_date: string;
  status: string;
  client_billed_amount: number | null;
  client_id: string;
  driver_profile_id: string | null;
  route_id: string | null;
  clients: { id: string; name: string } | null;
  driver_profile: { id: string; display_name: string } | null;
  routes: { name: string } | null;
  campaign_costs: { amount: number; cost_types: { name: string } | null }[];
  driver_shifts: { started_at: string; ended_at: string | null; shift_status: string }[];
}

/**
 * Apply AnalyticsFilters to a Supabase query builder on the campaigns table.
 * Mutates and returns the query (Supabase builder is fluent/chainable).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters(query: any, filters: AnalyticsFilters) {
  query = query.gte("campaign_date", filters.from).lte("campaign_date", filters.to);

  if (filters.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters.driverId) {
    query = query.eq("driver_profile_id", filters.driverId);
  }
  if (filters.campaignId) {
    query = query.eq("id", filters.campaignId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  return query;
}
