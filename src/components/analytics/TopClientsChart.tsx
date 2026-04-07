import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { chartThemeColors } from "@/lib/tokens";
import type { ClientBreakdownRow } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/analytics/formatters";

const chartConfig = {
  revenue: { label: "Revenue", theme: chartThemeColors.clients },
} satisfies ChartConfig;

interface TopClientsChartProps {
  data: ClientBreakdownRow[];
}

export function TopClientsChart({ data }: TopClientsChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        No client data for the selected period
      </p>
    );
  }

  const chartData = data.slice(0, 8).map((d) => ({
    name: truncate(d.clientName, 14),
    revenue: d.revenue,
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
          dataKey="revenue"
          fill="var(--color-revenue)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}
