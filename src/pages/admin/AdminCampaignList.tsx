import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface CampaignRow {
  id: string;
  title: string;
  campaign_date: string;
  status: "draft" | "pending" | "active" | "completed";
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
}

async function fetchCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      clients ( name ),
      driver_profile:profiles!driver_profile_id ( display_name )
    `)
    .order("campaign_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CampaignRow[];
}

export default function AdminCampaignList() {
  const [search, setSearch] = useState("");

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.clients?.name ?? "").toLowerCase().includes(q) ||
        (c.driver_profile?.display_name ?? "").toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage your ad truck campaigns</p>
        </div>
        <Link to="/admin/campaigns/create">
          <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          className="pl-9 h-10 rounded-xl bg-card border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
          Failed to load campaigns.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-16">
          {search ? "No campaigns match your search." : "No campaigns yet."}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/admin/campaigns/${c.id}`}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all group"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{c.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Client: {c.clients?.name ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Driver: {c.driver_profile?.display_name ?? "Unassigned"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.campaign_date), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <StatusBadge status={c.status} />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
