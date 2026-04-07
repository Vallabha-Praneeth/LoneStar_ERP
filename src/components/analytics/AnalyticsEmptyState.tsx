import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duration, easing } from "@/lib/tokens";

// Pass B: lazy-load Lottie + animation JSON so they're split into a separate chunk
const LottieCharts = lazy(() =>
  import("./LottieChartsIcon").then((m) => ({ default: m.LottieChartsIcon }))
);

interface AnalyticsEmptyStateProps {
  onReset: () => void;
}

export function AnalyticsEmptyState({ onReset }: AnalyticsEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration.base }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: duration.base, ease: easing.reveal }}
        className="w-24 h-24 mb-4"
      >
        <Suspense
          fallback={
            <div className="w-24 h-24 flex items-center justify-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/40" />
            </div>
          }
        >
          <LottieCharts />
        </Suspense>
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: duration.base }}
        className="text-base font-semibold text-foreground mb-1"
      >
        No analytics data
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: duration.base }}
        className="text-sm text-muted-foreground mb-4 max-w-sm"
      >
        No campaigns matched the selected filters. Try adjusting the date range
        or clearing filters.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: duration.base }}
      >
        <Button variant="outline" className="rounded-xl" onClick={onReset}>
          Reset Filters
        </Button>
      </motion.div>
    </motion.div>
  );
}
