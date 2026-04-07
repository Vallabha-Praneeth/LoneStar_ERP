import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DateRangeTabs } from "./DateRangeTabs";
import { parseFilters, filtersToSearchParams } from "@/lib/analytics/filters";
import { VALID_STATUSES } from "@/lib/analytics/constants";
import type { AnalyticsFilters, AnalyticsRange, CampaignStatus } from "@/lib/analytics/types";

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
}

export function AnalyticsFilterBar({ filters, onChange }: AnalyticsFilterBarProps) {
  const [, setSearchParams] = useSearchParams();

  // Sync filters to URL whenever they change
  useEffect(() => {
    setSearchParams(filtersToSearchParams(filters), { replace: true });
  }, [filters, setSearchParams]);

  // Fetch clients and drivers for select dropdowns
  const { data: clients = [] } = useQuery({
    queryKey: ["analytics-filter-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["analytics-filter-drivers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("role", "driver")
        .eq("is_active", true)
        .order("display_name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  function update(patch: Partial<AnalyticsFilters>) {
    // Re-parse to ensure granularity + date bounds are recomputed
    const merged = { ...filters, ...patch };
    const reparse = parseFilters({
      range: merged.range,
      from: merged.from,
      to: merged.to,
      clientId: merged.clientId,
      driverId: merged.driverId,
      campaignId: merged.campaignId,
      status: merged.status,
      granularity: merged.granularity,
    });
    onChange(reparse);
  }

  function handleRangeChange(range: AnalyticsRange) {
    update({ range, from: undefined, to: undefined, granularity: undefined });
  }

  function handleClear() {
    onChange(parseFilters(new URLSearchParams()));
  }

  const hasActiveFilters = !!(filters.clientId || filters.driverId || filters.status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <DateRangeTabs value={filters.range} onChange={handleRangeChange} />

        {filters.range === "custom" && (
          <>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => update({ from: e.target.value })}
              className="w-[150px] h-9 text-sm rounded-lg"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => update({ to: e.target.value })}
              className="w-[150px] h-9 text-sm rounded-lg"
            />
          </>
        )}

        <Select
          value={filters.clientId ?? "__all__"}
          onValueChange={(v) => update({ clientId: v === "__all__" ? undefined : v })}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm rounded-lg">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.driverId ?? "__all__"}
          onValueChange={(v) => update({ driverId: v === "__all__" ? undefined : v })}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm rounded-lg">
            <SelectValue placeholder="All Drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Drivers</SelectItem>
            {drivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "__all__"}
          onValueChange={(v) =>
            update({ status: v === "__all__" ? undefined : (v as CampaignStatus) })
          }
        >
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm rounded-lg">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            {VALID_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-9 px-2 text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
