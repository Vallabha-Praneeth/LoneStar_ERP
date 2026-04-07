import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus,
  Search,
  Filter,
  ArrowRight,
  Camera,
  DollarSign,
  User,
  Truck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

const fadeIn = motionTokens.variants.fadeIn;
const fadeUp = motionTokens.variants.fadeUp;
const listStaggerParent = { hidden: {}, visible: { transition: { staggerChildren: motionTokens.stagger.list } } } as const;

interface CampaignRow {
  id: string;
  title: string;
  campaign_date: string;
  status: "draft" | "pending" | "active" | "completed";
  client_billed_amount: number | null;
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
  campaign_photos: { id: string; storage_path: string }[];
  campaign_costs: { amount: number }[];
}

async function fetchCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status, client_billed_amount,
      clients ( name ),
      driver_profile:profiles!driver_profile_id ( display_name ),
      campaign_photos ( id, storage_path ),
      campaign_costs ( amount )
    `)
    .order("campaign_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CampaignRow[];
}

function totalCost(c: CampaignRow): number {
  return (c.campaign_costs ?? []).reduce((sum, cc) => sum + cc.amount, 0);
}

export default function AdminCampaignList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    data: campaigns = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });

  const filtered = useMemo(() => {
    let result = campaigns;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.clients?.name ?? "").toLowerCase().includes(q) ||
          (c.driver_profile?.display_name ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [campaigns, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            {campaigns.length} total &middot;{" "}
            {campaigns.filter((c) => c.status === "active").length} active
          </p>
        </div>
        <Link to="/admin/campaigns/create">
          <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-9 h-10 rounded-xl bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-auto min-w-[140px] h-10 rounded-xl bg-card border-border">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* States */}
      {isLoading && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="grid gap-3"
          aria-busy
          aria-label="Loading campaigns"
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </motion.div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
          Failed to load campaigns.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm text-muted-foreground">
            {search ? "No campaigns match your search." : "No campaigns yet."}
          </p>
          {!search && (
            <Link to="/admin/campaigns/create">
              <Button variant="outline" size="sm" className="rounded-lg mt-2">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create your first campaign
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Campaign cards */}
      <motion.div
        className="grid gap-3"
        initial="hidden"
        animate="visible"
        variants={listStaggerParent}
      >
        {filtered.map((c) => {
          const cost = totalCost(c);
          const photoCount = c.campaign_photos?.length ?? 0;

          return (
            <motion.div key={c.id} variants={fadeUp}>
              <Link
                to={`/admin/campaigns/${c.id}`}
                className="group flex items-stretch bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 overflow-hidden"
              >
                {/* Status accent bar */}
                <div
                  className={`w-1 shrink-0 ${
                    c.status === "active"
                      ? "bg-emerald-500"
                      : c.status === "completed"
                      ? "bg-primary"
                      : c.status === "pending"
                      ? "bg-amber-500"
                      : "bg-muted-foreground/30"
                  }`}
                />

                {/* Content */}
                <div className="flex-1 p-4 min-w-0">
                  {/* Top row: title + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground text-[15px] leading-snug truncate">
                      {c.title}
                    </h3>
                    <StatusBadge status={c.status} className="shrink-0" />
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {c.clients?.name ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      {c.driver_profile?.display_name ?? "Unassigned"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(c.campaign_date), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/60">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      {photoCount} {photoCount === 1 ? "photo" : "photos"}
                    </span>
                    {cost > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        {cost.toFixed(2)}
                      </span>
                    )}
                    {c.client_billed_amount != null && c.client_billed_amount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        Billed: ${c.client_billed_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center pr-4 pl-2">
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
