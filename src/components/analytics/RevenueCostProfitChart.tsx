import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { chartThemeColors } from "@/lib/tokens";
import type { TimeseriesPoint } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/analytics/formatters";

const chartConfig = {
  revenue: { label: "Revenue", theme: chartThemeColors.revenue },
  totalCost: { label: "Total Cost", theme: chartThemeColors.cost },
  grossProfit: { label: "Gross Profit", theme: chartThemeColors.profit },
} satisfies ChartConfig;

interface RevenueCostProfitChartProps {
  data: TimeseriesPoint[];
}

export function RevenueCostProfitChart({ data }: RevenueCostProfitChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        No trend data for the selected period
      </p>
    );
  }

  // Map to chart shape: merge driverCost + internalCost into totalCost
  const chartData = data.map((d) => ({
    bucket: d.bucket,
    revenue: d.revenue,
    totalCost: d.driverCost + d.internalCost,
    grossProfit: d.grossProfit,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[220px] sm:h-[250px] w-full">
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => formatBucketLabel(v)}
          interval="preserveStartEnd"
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(v) => formatCurrency(v)}
          width={65}
          fontSize={11}
          className="hidden sm:block"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          fill="var(--color-revenue)"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="totalCost"
          stroke="var(--color-totalCost)"
          fill="var(--color-totalCost)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="grossProfit"
          stroke="var(--color-grossProfit)"
          fill="var(--color-grossProfit)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Shorten bucket labels for axis readability */
function formatBucketLabel(bucket: string): string {
  // "2026-04-03" → "Apr 3"
  if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) {
    const [, m, d] = bucket.split("-");
    return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
  }
  // "2026-W14" → "W14"
  if (/^\d{4}-W\d{2}$/.test(bucket)) {
    return bucket.slice(5);
  }
  // "2026-04" → "Apr"
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    const m = parseInt(bucket.slice(5), 10);
    return MONTH_ABBR[m - 1] ?? bucket;
  }
  return bucket;
}
