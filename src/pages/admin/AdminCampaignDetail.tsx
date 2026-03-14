import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, FileDown, Clock, User, Building2, StickyNote, Loader2, Image } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { generateCampaignPdf } from "@/lib/generateCampaignPdf";

interface CampaignDetail {
  id: string;
  title: string;
  campaign_date: string;
  status: "draft" | "pending" | "active" | "completed";
  route_code: string | null;
  internal_notes: string | null;
  driver_daily_wage: number | null;
  transport_cost: number | null;
  other_cost: number | null;
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
  driver_shifts: { id: string; started_at: string; ended_at: string | null }[];
  campaign_photos: { id: string; status: string; submitted_at: string; note: string | null }[];
}

async function fetchCampaign(id: string): Promise<CampaignDetail | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status, route_code,
      internal_notes, driver_daily_wage, transport_cost, other_cost,
      clients ( name ),
      driver_profile:profiles!driver_profile_id ( display_name ),
      driver_shifts ( id, started_at, ended_at ),
      campaign_photos ( id, status, submitted_at, note )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CampaignDetail;
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return "—";
  return format(new Date(ts), "h:mm a");
}

export default function AdminCampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaign(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
        Failed to load campaign. <button onClick={() => navigate(-1)} className="underline">Go back</button>
      </div>
    );
  }

  const activeShift = campaign.driver_shifts.find((s) => !s.ended_at);
  const latestShift = campaign.driver_shifts.sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )[0];

  const pendingCount = campaign.campaign_photos.filter((p) => p.status === "pending").length;
  const approvedCount = campaign.campaign_photos.filter((p) => p.status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{campaign.title}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(campaign.campaign_date), "MMMM d, yyyy")}
            {campaign.route_code && ` • Route ${campaign.route_code}`}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl hidden sm:flex"
          onClick={() => generateCampaignPdf(campaign)}
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Building2, label: "Client", value: campaign.clients?.name ?? "—" },
          { icon: User, label: "Driver", value: campaign.driver_profile?.display_name ?? "Unassigned" },
          { icon: Clock, label: "Login Time", value: latestShift ? formatTime(latestShift.started_at) : "—" },
          { icon: Clock, label: "Logout Time", value: latestShift?.ended_at ? formatTime(latestShift.ended_at) : activeShift ? "Active" : "—" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border shadow-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="font-semibold text-foreground">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Internal notes */}
      {campaign.internal_notes && (
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Internal Notes</h3>
          </div>
          <p className="text-sm text-muted-foreground">{campaign.internal_notes}</p>
        </div>
      )}

      {/* Cost section */}
      {(campaign.driver_daily_wage || campaign.transport_cost || campaign.other_cost) && (
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-medium text-foreground mb-3">
            Cost Breakdown <span className="text-xs text-muted-foreground font-normal">(internal)</span>
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Driver Wage</p>
              <p className="font-semibold text-foreground">
                {campaign.driver_daily_wage ? `$${campaign.driver_daily_wage.toFixed(2)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Transport</p>
              <p className="font-semibold text-foreground">
                {campaign.transport_cost ? `$${campaign.transport_cost.toFixed(2)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Other</p>
              <p className="font-semibold text-foreground">
                {campaign.other_cost ? `$${campaign.other_cost.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground text-lg">Campaign Photos</h3>
            <p className="text-xs text-muted-foreground">
              {approvedCount} approved · {pendingCount} pending review
            </p>
          </div>
          <Link to={`/admin/campaigns/${id}/photos`} className="text-sm text-primary hover:underline">
            View All →
          </Link>
        </div>

        {campaign.campaign_photos.length === 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
            <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaign.campaign_photos.slice(0, 6).map((photo) => (
              <div
                key={photo.id}
                className="bg-card rounded-xl border border-border shadow-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={photo.status as "pending" | "approved"} />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(photo.submitted_at), "h:mm a")}
                  </span>
                </div>
                {photo.note && (
                  <p className="text-xs text-muted-foreground truncate">{photo.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile PDF button */}
      <div className="sm:hidden">
        <Button
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => generateCampaignPdf(campaign)}
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF Report
        </Button>
      </div>
    </div>
  );
}
