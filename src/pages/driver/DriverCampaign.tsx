import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Camera, LogIn, LogOut, Clock, ChevronLeft, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

interface DriverCampaignData {
  id: string;
  title: string;
  campaign_date: string;
  route_code: string | null;
  status: "draft" | "pending" | "active" | "completed";
  driver_shifts: { id: string; started_at: string; ended_at: string | null }[];
  campaign_photos: { id: string; status: string; submitted_at: string }[];
}

async function fetchDriverCampaign(driverId: string): Promise<DriverCampaignData | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, route_code, status,
      driver_shifts ( id, started_at, ended_at ),
      campaign_photos ( id, status, submitted_at )
    `)
    .eq("driver_profile_id", driverId)
    .gte("campaign_date", today)
    .order("campaign_date", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }
  return data as DriverCampaignData;
}

async function startShift(campaignId: string, driverId: string): Promise<void> {
  const { error } = await supabase.from("driver_shifts").insert({
    campaign_id: campaignId,
    driver_profile_id: driverId,
    started_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function endShift(shiftId: string): Promise<void> {
  const { error } = await supabase
    .from("driver_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", shiftId);
  if (error) throw error;
}

export default function DriverCampaign() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ["driver-campaign", profile?.id],
    queryFn: () => fetchDriverCampaign(profile!.id),
    enabled: !!profile?.id,
  });

  const startMutation = useMutation({
    mutationFn: () => startShift(campaign!.id, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-campaign"] });
      toast.success("Shift started");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const endMutation = useMutation({
    mutationFn: () => {
      const activeShift = campaign!.driver_shifts.find((s) => !s.ended_at);
      return endShift(activeShift!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-campaign"] });
      toast.success("Shift ended");
      navigate("/driver/login");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activeShift = campaign?.driver_shifts.find((s) => !s.ended_at);
  const recentPhotos = [...(campaign?.campaign_photos ?? [])]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2">
          <Link to="/" className="text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold text-sm text-foreground">My Campaign</span>
        </div>
        <div className="p-4 max-w-md mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No active campaign assigned to you today.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-[10px]">AD</span>
          </div>
          <span className="font-semibold text-sm text-foreground">My Campaign</span>
        </div>
        <StatusBadge status={activeShift ? "active" : campaign.status} />
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Campaign Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-card p-5 space-y-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">{campaign.title}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(campaign.campaign_date), "MMMM d, yyyy")}
              {campaign.route_code && ` • Route ${campaign.route_code}`}
            </p>
          </div>

          {activeShift && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span>Shift started at {format(new Date(activeShift.started_at), "h:mm a")}</span>
            </div>
          )}

          <div className="space-y-3">
            {!activeShift ? (
              <Button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="w-full h-14 rounded-xl bg-success text-success-foreground hover:bg-success/90 text-base font-medium"
              >
                {startMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Start Shift
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate("/driver/upload")}
                  className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Upload Photo
                </Button>
                <Button
                  onClick={() => endMutation.mutate()}
                  disabled={endMutation.isPending}
                  variant="outline"
                  className="w-full h-14 rounded-xl text-base font-medium border-destructive/30 text-destructive hover:bg-destructive/5"
                >
                  {endMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-5 h-5 mr-2" />
                      End Shift
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Recent uploads */}
        {recentPhotos.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <h3 className="font-medium text-foreground mb-3">Recent Uploads</h3>
            <div className="space-y-2">
              {recentPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(photo.submitted_at), "h:mm a")}
                    </span>
                  </div>
                  <StatusBadge status={photo.status as "pending" | "approved"} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
