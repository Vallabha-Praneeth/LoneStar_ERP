import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileDown, Loader2, Camera, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface ReportCampaign {
  id: string;
  title: string;
  campaign_date: string;
  status: string;
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
  campaign_photos: { id: string; status: string }[];
  driver_shifts: { id: string; started_at: string; ended_at: string | null }[];
}

async function fetchReportData(): Promise<ReportCampaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      clients ( name ),
      driver_profile:profiles!driver_profile_id ( display_name ),
      campaign_photos ( id, status ),
      driver_shifts ( id, started_at, ended_at )
    `)
    .order("campaign_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReportCampaign[];
}

export default function AdminReports() {
  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["reports-campaigns"],
    queryFn: fetchReportData,
  });

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === "active").length;
    const completed = campaigns.filter((c) => c.status === "completed").length;
    const totalPhotos = campaigns.reduce((acc, c) => acc + c.campaign_photos.length, 0);
    const totalShiftHours = campaigns.reduce((acc, c) => {
      return (
        acc +
        c.driver_shifts.reduce((shiftAcc, s) => {
          if (!s.ended_at) return shiftAcc;
          const diff = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 3600000;
          return shiftAcc + diff;
        }, 0)
      );
    }, 0);
    return { total, active, completed, totalPhotos, totalShiftHours };
  }, [campaigns]);

  function exportCsv() {
    const header = "Campaign,Client,Driver,Date,Status,Photos,Shift Hours\n";
    const rows = campaigns
      .map((c) => {
        const hours = c.driver_shifts.reduce((acc, s) => {
          if (!s.ended_at) return acc;
          return acc + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 3600000;
        }, 0);
        return `"${c.title}","${c.clients?.name ?? "—"}","${c.driver_profile?.display_name ?? "—"}",${c.campaign_date},${c.status},${c.campaign_photos.length},${hours.toFixed(1)}`;
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Campaign performance overview</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={exportCsv}
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Campaigns", value: stats.total, icon: CheckCircle2, color: "text-primary" },
          { label: "Active", value: stats.active, icon: Clock, color: "text-success" },
          { label: "Total Photos", value: stats.totalPhotos, icon: Camera, color: "text-primary" },
          { label: "Shift Hours", value: stats.totalShiftHours.toFixed(1), icon: Clock, color: "text-muted-foreground" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border shadow-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Campaign table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Campaign</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Photos</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.clients?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.driver_profile?.display_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(c.campaign_date), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === "active"
                            ? "bg-success/10 text-success"
                            : c.status === "completed"
                            ? "bg-primary/10 text-primary"
                            : c.status === "draft"
                            ? "bg-muted text-muted-foreground"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {c.campaign_photos.length}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
