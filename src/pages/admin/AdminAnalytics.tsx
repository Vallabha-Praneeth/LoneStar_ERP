import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { duration } from "@/lib/tokens";
import { parseFilters } from "@/lib/analytics/filters";
import { getSummary } from "@/lib/analytics/queries/get-summary";
import { getTimeseries } from "@/lib/analytics/queries/get-timeseries";
import { getClientBreakdown } from "@/lib/analytics/queries/get-client-breakdown";
import { getDriverBreakdown } from "@/lib/analytics/queries/get-driver-breakdown";
import { getCampaignRows } from "@/lib/analytics/queries/get-campaign-rows";
import type { AnalyticsFilters, AnalyticsSummary } from "@/lib/analytics/types";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { ChartCard } from "@/components/analytics/ChartCard";
import { RevenueCostProfitChart } from "@/components/analytics/RevenueCostProfitChart";
import { TopClientsChart } from "@/components/analytics/TopClientsChart";
import { TopDriversChart } from "@/components/analytics/TopDriversChart";
import { MarginWaterfallChart } from "@/components/analytics/MarginWaterfallChart";
import { CampaignPerformanceTable } from "@/components/analytics/CampaignPerformanceTable";
import { AnalyticsExportButton } from "@/components/analytics/AnalyticsExportButton";

export default function AdminAnalytics() {
  const [searchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  // Core data queries — all keyed on the serialized filters
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ["analytics-summary", filterKey],
    queryFn: () => getSummary(filters),
  });

  const { data: timeseries, isLoading: timeseriesLoading } = useQuery({
    queryKey: ["analytics-timeseries", filterKey],
    queryFn: () => getTimeseries(filters),
  });

  const { data: clientBreakdown, isLoading: clientsLoading } = useQuery({
    queryKey: ["analytics-clients", filterKey],
    queryFn: () => getClientBreakdown(filters),
  });

  const { data: driverBreakdown, isLoading: driversLoading } = useQuery({
    queryKey: ["analytics-drivers", filterKey],
    queryFn: () => getDriverBreakdown(filters),
  });

  const { data: campaignRows, isLoading: campaignsLoading } = useQuery({
    queryKey: ["analytics-campaigns", filterKey],
    queryFn: () => getCampaignRows(filters),
  });

  // Mutable filter state — pushed into URL by the filter bar
  function handleFiltersChange(next: AnalyticsFilters) {
    // AnalyticsFilterBar handles URL sync via setSearchParams;
    // the searchParams change triggers useMemo(filters) re-parse above.
    // This is a no-op here since URL is the source of truth,
    // but we keep the prop contract for AnalyticsFilterBar.
    void next;
  }

  const isAnyLoading = summaryLoading;
  const isEmpty = !isAnyLoading && summary && summary.activeCampaigns === 0 && summary.revenue === 0 && summary.billableHours === 0;

  if (summaryError) {
    return (
      <div className="space-y-6">
        <PageHeader filters={filters} />
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load analytics data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader filters={filters} />

      <DataCompletenessNotice summary={summary} loading={summaryLoading} />

      <AnalyticsFilterBar filters={filters} onChange={handleFiltersChange} />

      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast }}
          >
            <AnalyticsEmptyState
              onReset={() => {
                window.history.replaceState(null, "", "/admin/analytics");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast }}
            className="space-y-6"
          >
            <AnalyticsKpiGrid summary={summary} loading={summaryLoading} />

            {/* Chart row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Revenue / Cost / Profit Trend" loading={timeseriesLoading}>
                <RevenueCostProfitChart data={timeseries ?? []} />
              </ChartCard>
              <ChartCard title="Top Clients" subtitle="By revenue" loading={clientsLoading}>
                <TopClientsChart data={clientBreakdown ?? []} />
              </ChartCard>
            </div>

            {/* Chart row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Top Drivers" subtitle="By payout" loading={driversLoading}>
                <TopDriversChart data={driverBreakdown ?? []} />
              </ChartCard>
              <ChartCard title="Margin Waterfall" loading={summaryLoading}>
                {summary && <MarginWaterfallChart summary={summary} />}
              </ChartCard>
            </div>

            {/* Campaign performance table */}
            <ChartCard title="Campaign Performance" loading={campaignsLoading}>
              <CampaignPerformanceTable data={campaignRows ?? []} />
            </ChartCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageHeader({ filters }: { filters: AnalyticsFilters }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Financial and operational performance overview
        </p>
      </div>
      <AnalyticsExportButton filters={filters} />
    </div>
  );
}

function DataCompletenessNotice({
  summary,
  loading,
}: {
  summary: AnalyticsSummary | undefined;
  loading: boolean;
}) {
  if (loading || !summary) return null;
  if (summary.missingBillingCount === 0) return null;

  const pct = summary.totalCampaigns > 0
    ? Math.round((summary.missingBillingCount / summary.totalCampaigns) * 100)
    : 0;

  return (
    <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>
        <span className="font-semibold">{summary.missingBillingCount}</span> of{" "}
        {summary.totalCampaigns} campaigns ({pct}%) have no{" "}
        <span className="font-medium">Client Billed Amount</span> set.
        These show as $0 revenue in analytics.
      </span>
    </div>
  );
}

