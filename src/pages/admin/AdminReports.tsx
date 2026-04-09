import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileDown,
  Camera,
  Clock,
  BarChart3,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeIn, fadeUp, gridStaggerParent, listStaggerParent, cardReveal } from "@/lib/motion/pageMotion";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface ReportCampaign {
  id: string;
  title: string;
  campaign_date: string;
  status: string;
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
  campaign_photos: { id: string }[];
  driver_shifts: { id: string; started_at: string; ended_at: string | null }[];
}

async function fetchReportData(): Promise<ReportCampaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      clients ( name ),
      driver_profile:profiles!driver_profile_id ( display_name ),
      campaign_photos ( id ),
      driver_shifts ( id, started_at, ended_at )
    `)
    .order("campaign_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReportCampaign[];
}

const statCards = [
  {
    key: "total",
    label: "Total Campaigns",
    icon: BarChart3,
    bg: "bg-primary/8",
    iconColor: "text-primary",
    valueColor: "text-primary",
  },
  {
    key: "active",
    label: "Active",
    icon: TrendingUp,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-700",
  },
  {
    key: "totalPhotos",
    label: "Total Photos",
    icon: Camera,
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    valueColor: "text-amber-700",
  },
  {
    key: "totalShiftHours",
    label: "Shift Hours",
    icon: Clock,
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    valueColor: "text-violet-700",
  },
] as const;

export default function AdminReports() {
  const {
    data: campaigns = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reports-campaigns"],
    queryFn: fetchReportData,
  });

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === "active").length;
    const totalPhotos = campaigns.reduce(
      (acc, c) => acc + c.campaign_photos.length,
      0
    );
    const totalShiftHours = campaigns.reduce((acc, c) => {
      return (
        acc +
        c.driver_shifts.reduce((shiftAcc, s) => {
          if (!s.ended_at) return shiftAcc;
          const diff =
            (new Date(s.ended_at).getTime() -
              new Date(s.started_at).getTime()) /
            3600000;
          return shiftAcc + diff;
        }, 0)
      );
    }, 0);
    return {
      total,
      active,
      totalPhotos,
      totalShiftHours: totalShiftHours.toFixed(1),
    };
  }, [campaigns]);

  function exportCsv() {
    const header = "Campaign,Client,Driver,Date,Status,Photos,Shift Hours\n";
    const rows = campaigns
      .map((c) => {
        const hours = c.driver_shifts.reduce((acc, s) => {
          if (!s.ended_at) return acc;
          return (
            acc +
            (new Date(s.ended_at).getTime() -
              new Date(s.started_at).getTime()) /
              3600000
          );
        }, 0);
        return `"${c.title}","${c.clients?.name ?? "—"}","${
          c.driver_profile?.display_name ?? "—"
        }",${c.campaign_date},${c.status},${
          c.campaign_photos.length
        },${hours.toFixed(1)}`;
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adtruck-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <motion.div
        key="loading"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="space-y-6"
        aria-busy
        aria-label="Loading reports"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Skeleton className="h-28 rounded-xl" />
            </motion.div>
          ))}
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Skeleton className="h-72 w-full rounded-xl" />
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
        Failed to load report data.
      </div>
    );
  }

  return (
    <motion.div
      key="content"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Campaign performance overview
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={exportCsv}>
          <FileDown className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial="hidden"
        animate="visible"
        variants={gridStaggerParent}
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.key}
            variants={cardReveal}
            className="bg-card rounded-xl border border-border shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
            </div>
            <p
              className={`text-3xl font-bold tracking-tight ${stat.valueColor}`}
            >
              {stats[stat.key]}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Campaign table */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            All Campaigns
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Campaign
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                  Driver
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Photos
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="visible"
              variants={listStaggerParent}
            >
              {campaigns.map((c) => (
                <motion.tr
                  key={c.id}
                  variants={fadeUp}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/campaigns/${c.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.clients?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {c.driver_profile?.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {format(new Date(c.campaign_date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={c.status as "active" | "completed" | "pending" | "draft"}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Camera className="w-3 h-3" />
                      {c.campaign_photos.length}
                    </span>
                  </td>
                  <td className="pr-3">
                    <Link
                      to={`/admin/campaigns/${c.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
