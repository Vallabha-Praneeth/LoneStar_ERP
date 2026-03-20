import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface ShiftData {
  id: string;
  started_at: string;
  ended_at: string | null;
  campaign: { title: string; campaign_date: string } | null;
  first_photo_at: string | null;
}

async function fetchClientTimingData(clientId: string): Promise<ShiftData | null> {
  // Get the most recent campaign for this client
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id, title, campaign_date")
    .eq("client_id", clientId)
    .order("campaign_date", { ascending: false })
    .limit(1)
    .single();

  if (campErr) {
    if (campErr.code === "PGRST116") return null;
    throw campErr;
  }

  // Get the shift for this campaign
  const { data: shift, error: shiftErr } = await supabase
    .from("driver_shifts")
    .select("id, started_at, ended_at")
    .eq("campaign_id", campaign.id)
    .order("started_at", { ascending: true })
    .limit(1)
    .single();

  if (shiftErr && shiftErr.code !== "PGRST116") throw shiftErr;

  // Get the first approved photo time
  const { data: firstPhoto } = await supabase
    .from("campaign_photos")
    .select("submitted_at")
    .eq("campaign_id", campaign.id)
    .eq("status", "approved")
    .order("submitted_at", { ascending: true })
    .limit(1)
    .single();

  if (!shift) {
    return { id: "", started_at: "", ended_at: null, campaign, first_photo_at: firstPhoto?.submitted_at ?? null };
  }

  return {
    id: shift.id,
    started_at: shift.started_at,
    ended_at: shift.ended_at,
    campaign,
    first_photo_at: firstPhoto?.submitted_at ?? null,
  };
}

export default function ClientTimingSheet() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const { data, isLoading } = useQuery({
    queryKey: ["client-timing", profile?.client_id],
    queryFn: () => fetchClientTimingData(profile!.client_id!),
    enabled: !!profile?.client_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const shiftStarted = !!data?.started_at;
  const shiftEnded = !!data?.ended_at;

  function formatDuration(startIso: string, endIso: string): string {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    const totalMins = Math.round(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }

  const shiftDuration = shiftStarted && shiftEnded
    ? formatDuration(data!.started_at, data!.ended_at!)
    : null;

  const timingRows = [
    {
      label: "Shift Start",
      time: shiftStarted ? format(new Date(data!.started_at), "h:mm a") : "—",
      done: shiftStarted,
    },
    {
      label: "First Photo",
      time: data?.first_photo_at ? format(new Date(data.first_photo_at), "h:mm a") : "—",
      done: !!data?.first_photo_at,
    },
    {
      label: "Shift End",
      time: shiftEnded ? format(new Date(data!.ended_at!), "h:mm a") : "—",
      done: shiftEnded,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/client/campaign" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold text-foreground">Timing Sheet</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!data?.campaign ? (
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center mt-4">
            <p className="text-sm text-muted-foreground">No campaign data available.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border shadow-card p-6"
          >
            <h2 className="font-semibold text-foreground mb-1">{data.campaign.title}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {format(new Date(data.campaign.campaign_date), "MMMM d, yyyy")}
            </p>

            <div className="space-y-0">
              {timingRows.map((item, i) => (
                <div key={i} className="flex items-center gap-4 relative">
                  {i < timingRows.length - 1 && (
                    <div className="absolute left-[15px] top-8 w-0.5 h-8 bg-border" />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.done ? "bg-success/10" : "bg-muted"
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 py-3 border-b border-border last:border-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {shiftDuration && (
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total Shift Duration</span>
                <span className="text-sm font-semibold text-primary">{shiftDuration}</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
