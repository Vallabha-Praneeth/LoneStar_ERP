import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/lib/analytics/types";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "9m", label: "9M" },
  { value: "1y", label: "1Y" },
  { value: "custom", label: "Custom" },
];

interface DateRangeTabsProps {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
