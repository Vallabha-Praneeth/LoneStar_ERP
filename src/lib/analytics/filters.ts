import { subMonths, format, differenceInDays, parseISO, isValid } from "date-fns";
import type { AnalyticsFilters, AnalyticsRange, AnalyticsGranularity, CampaignStatus } from "./types";
import {
  DEFAULT_RANGE,
  RANGE_MONTHS,
  RANGE_GRANULARITY,
  VALID_RANGES,
  VALID_STATUSES,
  VALID_GRANULARITIES,
} from "./constants";

/** Parse a URLSearchParams (or plain object) into a fully resolved AnalyticsFilters. */
export function parseFilters(
  params: URLSearchParams | Record<string, string | undefined>,
  now: Date = new Date(),
): AnalyticsFilters {
  const get = (key: string): string | undefined =>
    params instanceof URLSearchParams ? (params.get(key) ?? undefined) : params[key];

  const range = parseRange(get("range"));
  const { from, to } = resolveDateBounds(range, get("from"), get("to"), now);
  const granularity = resolveGranularity(range, get("granularity"), from, to);

  return {
    range,
    from,
    to,
    granularity,
    clientId: get("clientId") || undefined,
    driverId: get("driverId") || undefined,
    campaignId: get("campaignId") || undefined,
    status: parseStatus(get("status")),
  };
}

function parseRange(raw: string | undefined): AnalyticsRange {
  if (raw && VALID_RANGES.includes(raw as AnalyticsRange)) return raw as AnalyticsRange;
  return DEFAULT_RANGE;
}

function parseStatus(raw: string | undefined): CampaignStatus | undefined {
  if (raw && VALID_STATUSES.includes(raw as CampaignStatus)) return raw as CampaignStatus;
  return undefined;
}

function isValidDate(s: string | undefined): s is string {
  if (!s) return false;
  const d = parseISO(s);
  return isValid(d);
}

/** Resolve from/to ISO date strings based on range preset or custom values. */
export function resolveDateBounds(
  range: AnalyticsRange,
  rawFrom: string | undefined,
  rawTo: string | undefined,
  now: Date,
): { from: string; to: string } {
  const today = format(now, "yyyy-MM-dd");

  if (range === "custom") {
    let from = isValidDate(rawFrom) ? rawFrom : format(subMonths(now, 3), "yyyy-MM-dd");
    let to = isValidDate(rawTo) ? rawTo : today;
    if (from > to) [from, to] = [to, from];
    return { from, to };
  }

  const months = RANGE_MONTHS[range];
  return {
    from: format(subMonths(now, months), "yyyy-MM-dd"),
    to: today,
  };
}

/** Resolve granularity — use explicit if valid, else infer from range or date span. */
export function resolveGranularity(
  range: AnalyticsRange,
  rawGranularity: string | undefined,
  from: string,
  to: string,
): AnalyticsGranularity {
  if (rawGranularity && VALID_GRANULARITIES.includes(rawGranularity as AnalyticsGranularity)) {
    return rawGranularity as AnalyticsGranularity;
  }

  if (range !== "custom") {
    return RANGE_GRANULARITY[range];
  }

  // Custom range: infer from span
  const days = differenceInDays(parseISO(to), parseISO(from));
  if (days <= 45) return "day";
  if (days <= 200) return "week";
  return "month";
}

/** Serialize AnalyticsFilters back to URLSearchParams for URL sync. */
export function filtersToSearchParams(filters: AnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("range", filters.range);
  if (filters.range === "custom") {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.driverId) params.set("driverId", filters.driverId);
  if (filters.campaignId) params.set("campaignId", filters.campaignId);
  if (filters.status) params.set("status", filters.status);
  if (filters.granularity) params.set("granularity", filters.granularity);
  return params;
}
