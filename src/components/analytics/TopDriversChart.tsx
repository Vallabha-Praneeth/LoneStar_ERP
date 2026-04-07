import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { chartThemeColors } from "@/lib/tokens";
import type { DriverBreakdownRow } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/analytics/formatters";

const chartConfig = {
  payout: { label: "Payout", theme: chartThemeColors.drivers },
} satisfies ChartConfig;

interface TopDriversChartProps {
  data: DriverBreakdownRow[];
}

export function TopDriversChart({ data }: TopDriversChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        No driver data for the selected period
      </p>
    );
  }

  const chartData = data.slice(0, 8).map((d) => ({
    name: truncate(d.driverName, 14),
    payout: d.payout,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[220px] sm:h-[250px] w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={90}
          tickMargin={4}
          fontSize={11}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Bar
          dataKey="payout"
          fill="var(--color-payout)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}
