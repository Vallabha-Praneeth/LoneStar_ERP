import { motion } from "framer-motion";
import {
  DollarSign,
  Truck,
  Settings,
  TrendingUp,
  Percent,
  Clock,
  BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { duration, easing } from "@/lib/tokens";
import { cardReveal, gridStaggerParent } from "@/lib/motion/pageMotion";
import type { AnalyticsSummary } from "@/lib/analytics/types";
import {
  formatCurrency,
  formatPercent,
  formatHours,
  formatNumber,
} from "@/lib/analytics/formatters";

const kpiCards = [
  {
    key: "revenue" as const,
    label: "Revenue",
    icon: DollarSign,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueColor: "text-emerald-700 dark:text-emerald-300",
    format: (s: AnalyticsSummary) => formatCurrency(s.revenue),
  },
  {
    key: "driverCost" as const,
    label: "Driver Cost",
    icon: Truck,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    valueColor: "text-blue-700 dark:text-blue-300",
    format: (s: AnalyticsSummary) => formatCurrency(s.driverCost),
  },
  {
    key: "internalCost" as const,
    label: "Internal Cost",
    icon: Settings,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueColor: "text-amber-700 dark:text-amber-300",
    format: (s: AnalyticsSummary) => formatCurrency(s.internalCost),
  },
  {
    key: "grossProfit" as const,
    label: "Gross Profit",
    icon: TrendingUp,
    bg: "bg-primary/8 dark:bg-primary/15",
    iconColor: "text-primary",
    valueColor: "text-primary",
    format: (s: AnalyticsSummary) => formatCurrency(s.grossProfit),
  },
  {
    key: "marginPct" as const,
    label: "Margin %",
    icon: Percent,
    bg: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    valueColor: "text-violet-700 dark:text-violet-300",
    format: (s: AnalyticsSummary) => formatPercent(s.marginPct),
  },
  {
    key: "billableHours" as const,
    label: "Billable Hours",
    icon: Clock,
    bg: "bg-rose-50 dark:bg-rose-950/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    valueColor: "text-rose-700 dark:text-rose-300",
    format: (s: AnalyticsSummary) => formatHours(s.billableHours),
  },
  {
    key: "activeCampaigns" as const,
    label: "Active Campaigns",
    icon: BarChart3,
    bg: "bg-sky-50 dark:bg-sky-950/30",
    iconColor: "text-sky-600 dark:text-sky-400",
    valueColor: "text-sky-700 dark:text-sky-300",
    format: (s: AnalyticsSummary) => formatNumber(s.activeCampaigns),
  },
];

interface AnalyticsKpiGridProps {
  summary: AnalyticsSummary | undefined;
  loading: boolean;
}

export function AnalyticsKpiGrid({ summary, loading }: AnalyticsKpiGridProps) {
  return (
    <motion.div
      variants={gridStaggerParent}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3"
    >
      {kpiCards.map((card) => (
        <motion.div
          key={card.key}
          variants={cardReveal}
          className="bg-card rounded-xl border border-border shadow-sm p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {card.label}
            </span>
            <div
              className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
            >
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
          </div>
          {loading || !summary ? (
            <Skeleton className="h-8 w-24 rounded" />
          ) : (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: duration.fast, ease: easing.smooth }}
              className={`text-2xl font-bold tracking-tight ${card.valueColor}`}
            >
              {card.format(summary)}
            </motion.p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
