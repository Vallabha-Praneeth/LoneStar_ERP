import { Bar, BarChart, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { chartColors } from "@/lib/tokens";
import type { AnalyticsSummary } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/analytics/formatters";

const chartConfig = {
  value: { label: "Amount", color: chartColors.revenue },
} satisfies ChartConfig;

const COLORS = {
  revenue: chartColors.revenue,
  driverCost: chartColors.cost,
  internalCost: chartColors.internalCost,
  profit: chartColors.profit,
  profitNeg: chartColors.profitNeg,
};

interface MarginWaterfallChartProps {
  summary: AnalyticsSummary;
}

export function MarginWaterfallChart({ summary }: MarginWaterfallChartProps) {
  if (summary.revenue === 0 && summary.driverCost === 0 && summary.internalCost === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        No financial data for the selected period
      </p>
    );
  }

  // Stacked waterfall approximation using invisible base + visible segment
  // Revenue starts at 0. Costs subtract from revenue. Profit is what remains.
  const data = [
    {
      name: "Revenue",
      base: 0,
      value: summary.revenue,
      color: COLORS.revenue,
    },
    {
      name: "Driver Cost",
      base: summary.revenue - summary.driverCost,
      value: summary.driverCost,
      color: COLORS.driverCost,
    },
    {
      name: "Internal Cost",
      base: summary.grossProfit,
      value: summary.internalCost,
      color: COLORS.internalCost,
    },
    {
      name: "Profit",
      base: 0,
      value: summary.grossProfit,
      color: summary.grossProfit >= 0 ? COLORS.profit : COLORS.profitNeg,
    },
  ];

  return (
    <ChartContainer config={chartConfig} className="h-[220px] sm:h-[250px] w-full">
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={65}
          fontSize={11}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
              hideLabel={false}
            />
          }
        />
        {/* Invisible base bar */}
        <Bar dataKey="base" stackId="waterfall" fill="transparent" radius={0} />
        {/* Visible value bar */}
        <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
