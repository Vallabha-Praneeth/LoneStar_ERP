import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Camera, LogIn, LogOut, Clock, ChevronDown, Loader2, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  fadeUp,
  scaleIn,
  listStaggerParent,
  sectionStaggerParent,
  skeletonPulse,
} from "@/lib/motion/pageMotion";
import { motionTokens } from "@/lib/tokens/motion-tokens";

const quickFadeUp = {
  ...fadeUp,
  visible: {
    ...fadeUp.visible,
    transition: { ...fadeUp.visible.transition, duration: motionTokens.duration.fast },
  },
} as const;

interface DriverCampaignData {
  id: string;
  title: string;
  campaign_date: string;
  routes: { name: string } | null;
  status: "draft" | "pending" | "active" | "completed";
  driver_shifts: { id: string; started_at: string; ended_at: string | null }[];
  campaign_photos: { id: string; submitted_at: string }[];
}

async function fetchDriverCampaign(driverId: string): Promise<DriverCampaignData | null> {
  // First try to find an active/pending campaign (any date)
  const { data: activeCampaign, error: activeErr } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      routes:route_id ( name ),
      driver_shifts ( id, started_at, ended_at ),
      campaign_photos ( id, submitted_at )
    `)
    .eq("driver_profile_id", driverId)
    .in("status", ["active", "pending", "draft"])
    .order("campaign_date", { ascending: false })
    .limit(1)
    .single();

  if (activeCampaign) return activeCampaign as DriverCampaignData;

  // Fallback: most recent campaign assigned to this driver
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      routes:route_id ( name ),
      driver_shifts ( id, started_at, ended_at ),
      campaign_photos ( id, submitted_at )
    `)
    .eq("driver_profile_id", driverId)
    .order("campaign_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }
  return data as DriverCampaignData;
}

interface DriverHistoryItem {
  id: string;
  title: string;
  campaign_date: string;
  status: string;
  photo_count: number;
}

async function fetchDriverHistory(driverId: string, currentCampaignId?: string): Promise<DriverHistoryItem[]> {
  let query = supabase
    .from("campaigns")
    .select("id, title, campaign_date, status, campaign_photos ( id )")
    .eq("driver_profile_id", driverId)
    .eq("status", "completed")
    .order("campaign_date", { ascending: false })
    .limit(20);

  if (currentCampaignId) {
    query = query.neq("id", currentCampaignId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((c: { id: string; title: string; campaign_date: string; status: string; campaign_photos: { id: string }[] | null }) => ({
    id: c.id,
    title: c.title,
    campaign_date: c.campaign_date,
    status: c.status,
    photo_count: c.campaign_photos?.length ?? 0,
  }));
}

async function startShift(campaignId: string, driverId: string): Promise<void> {
  const { error } = await supabase.from("driver_shifts").insert({
    campaign_id: campaignId,
    driver_profile_id: driverId,
    started_at: new Date().toISOString(),
    shift_status: "active",
  });
  if (error) throw error;
}

async function endShift(shiftId: string): Promise<void> {
  const { error } = await supabase
    .from("driver_shifts")
    .update({ ended_at: new Date().toISOString(), shift_status: "completed" })
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

  const [showHistory, setShowHistory] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["driver-history", profile?.id, campaign?.id],
    queryFn: () => fetchDriverHistory(profile!.id, campaign?.id),
    enabled: !!profile?.id,
  });

  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const activeShift = campaign?.driver_shifts.find((s) => !s.ended_at);
  const recentPhotos = [...(campaign?.campaign_photos ?? [])]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <motion.div
        key="loading"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={quickFadeUp}
        className="min-h-screen bg-background"
        aria-busy
        aria-label="Loading campaign"
      >
        <div className="bg-card border-b border-border px-4 py-3">
          <motion.div animate={skeletonPulse.animate} transition={skeletonPulse.transition}>
            <Skeleton className="h-6 w-40" />
          </motion.div>
        </div>
        <div className="p-4 space-y-4">
          <motion.div animate={skeletonPulse.animate} transition={skeletonPulse.transition}>
            <Skeleton className="h-32 w-full rounded-xl" />
          </motion.div>
          <motion.div animate={skeletonPulse.animate} transition={skeletonPulse.transition}>
            <Skeleton className="h-12 w-full rounded-xl" />
          </motion.div>
          <motion.div animate={skeletonPulse.animate} transition={skeletonPulse.transition}>
            <Skeleton className="h-12 w-full rounded-xl" />
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-[10px]">AD</span>
            </div>
            <span className="font-semibold text-sm text-foreground">My Campaign</span>
          </div>
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
        <div className="p-4 max-w-md mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No active campaign assigned to you.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-background" key="content" initial="hidden" animate="visible" exit="exit" variants={quickFadeUp}>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-[10px]">AD</span>
          </div>
          <span className="font-semibold text-sm text-foreground">My Campaign</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={activeShift ? "active" : campaign.status} />
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionStaggerParent}
        className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-w-md mx-auto space-y-4"
      >
        {/* Campaign Card */}
        <motion.div
          variants={quickFadeUp}
          className="bg-card rounded-2xl border border-border shadow-card p-5 space-y-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">{campaign.title}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(campaign.campaign_date), "MMMM d, yyyy")}
              {campaign.routes?.name && ` \u2022 Route ${campaign.routes.name}`}
            </p>
          </div>

          {activeShift && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span>Shift started at {format(new Date(activeShift.started_at), "h:mm a")}</span>
            </div>
          )}

          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={listStaggerParent}
          >
            {!activeShift ? (
              <motion.div variants={scaleIn} className="w-full">
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
              </motion.div>
            ) : (
              <>
                <motion.div variants={scaleIn} className="w-full">
                  <Button
                    onClick={() => navigate("/driver/upload")}
                    className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Upload Photo
                  </Button>
                </motion.div>
                <motion.div variants={scaleIn} className="w-full">
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
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Recent uploads */}
        {recentPhotos.length > 0 && (
          <motion.div variants={quickFadeUp} className="bg-card rounded-2xl border border-border shadow-card p-5">
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
                  <span className="text-xs text-muted-foreground">Uploaded</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Past campaigns */}
        {(historyQuery.data?.length ?? 0) > 0 && (
          <motion.div variants={quickFadeUp} className="bg-card rounded-2xl border border-border shadow-card">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-5"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Past Campaigns</h3>
                <span className="text-xs text-muted-foreground">({historyQuery.data!.length})</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>
            {showHistory && (
              <div className="px-5 pb-5 space-y-2">
                {historyQuery.data!.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.campaign_date), "MMM d, yyyy")} · {item.photo_count} photos
                      </p>
                    </div>
                    <StatusBadge status={item.status as "completed"} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
