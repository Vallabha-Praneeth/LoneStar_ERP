import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { FileDown, Loader2 } from "lucide-react";
import successAnimation from "@/assets/lottie/success-check.json";
import { Button } from "@/components/ui/button";
import { duration } from "@/lib/tokens";
import { format } from "date-fns";
import type { AnalyticsFilters } from "@/lib/analytics/types";
import { getExportRows, exportRowsToCsv } from "@/lib/analytics/queries/get-export-rows";

type ExportState = "idle" | "exporting" | "done";

interface AnalyticsExportButtonProps {
  filters: AnalyticsFilters;
}

export function AnalyticsExportButton({ filters }: AnalyticsExportButtonProps) {
  const [state, setState] = useState<ExportState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleExport() {
    setState("exporting");
    try {
      const rows = await getExportRows(filters);
      const csv = exportRowsToCsv(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${filters.range}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 200);
      setState("done");
      timerRef.current = setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }

  return (
    <Button
      variant="outline"
      className="rounded-xl min-w-[130px]"
      onClick={handleExport}
      disabled={state !== "idle"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "exporting" && (
          <motion.span
            key="exporting"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: duration.instant }}
            className="flex items-center"
          >
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting…
          </motion.span>
        )}
        {state === "done" && (
          <motion.span
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: duration.instant }}
            className="flex items-center text-emerald-600 dark:text-emerald-400"
          >
            <Lottie animationData={successAnimation} loop={false} className="w-5 h-5 mr-1.5" />
            Exported
          </motion.span>
        )}
        {state === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: duration.instant }}
            className="flex items-center"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
