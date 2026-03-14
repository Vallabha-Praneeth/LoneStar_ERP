import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, Clock, LogOut, Loader2, Image } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface ClientCampaignData {
  id: string;
  title: string;
  campaign_date: string;
  status: "draft" | "pending" | "active" | "completed";
  campaign_photos: { id: string; storage_path: string; submitted_at: string }[];
}

async function fetchClientCampaign(clientId: string): Promise<ClientCampaignData | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      campaign_photos ( id, storage_path, submitted_at )
    `)
    .eq("client_id", clientId)
    .order("campaign_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ClientCampaignData;
}

async function fetchSignedUrls(photos: { id: string; storage_path: string }[]): Promise<Record<string, string>> {
  if (photos.length === 0) return {};
  const entries = await Promise.all(
    photos.map(async (p) => {
      const { data, error } = await supabase.storage
        .from("campaign-photos")
        .createSignedUrl(p.storage_path, 3600);
      if (error) return [p.id, ""] as const;
      return [p.id, data.signedUrl] as const;
    })
  );
  return Object.fromEntries(entries);
}

export default function ClientCampaignView() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const campaignQuery = useQuery({
    queryKey: ["client-campaign", profile?.client_id],
    queryFn: () => fetchClientCampaign(profile!.client_id!),
    enabled: !!profile?.client_id,
  });

  const photos = campaignQuery.data?.campaign_photos ?? [];

  const urlsQuery = useQuery({
    queryKey: ["client-photo-urls", campaignQuery.data?.id, photos.map((p) => p.id)],
    queryFn: () => fetchSignedUrls(photos),
    enabled: photos.length > 0,
  });

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  if (campaignQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const campaign = campaignQuery.data;
  const signedUrls = urlsQuery.data ?? {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">AD</span>
            </div>
            <span className="font-semibold text-foreground">Campaign Portal</span>
          </div>
          <div className="flex items-center gap-3">
            {campaign && (
              <Link
                to="/client/campaign/timing"
                className="text-sm text-primary hover:underline hidden sm:inline"
              >
                Timing Sheet
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {!campaign ? (
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center mt-8">
            <p className="text-sm text-muted-foreground">No active campaign found for your account.</p>
          </div>
        ) : (
          <>
            {/* Campaign info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border shadow-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{campaign.title}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(campaign.campaign_date), "MMMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              <Link
                to="/client/campaign/timing"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline sm:hidden"
              >
                <Clock className="w-4 h-4" />
                View Timing Sheet
              </Link>
            </motion.div>

            {/* Photo gallery — approved only (enforced by RLS) */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Campaign Photos
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({photos.length} approved)
                </span>
              </h2>

              {photos.length === 0 ? (
                <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
                  <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No approved photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
                    >
                      <div className="aspect-[4/3]">
                        {signedUrls[photo.id] ? (
                          <img
                            src={signedUrls[photo.id]}
                            alt={`Campaign photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(photo.submitted_at), "h:mm a")} · Approved
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
