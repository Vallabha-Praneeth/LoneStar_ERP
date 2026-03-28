import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, Clock, LogOut, Loader2, Image, FileDown, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { generateClientPdf } from "@/lib/generateClientPdf";

interface ClientCampaignData {
  id: string;
  title: string;
  campaign_date: string;
  status: "draft" | "pending" | "active" | "completed";
  campaign_photos: { id: string; storage_path: string; submitted_at: string }[];
}

interface ClientCampaignOption {
  id: string;
  title: string;
  campaign_date: string;
}

async function fetchClientCampaigns(clientId: string): Promise<ClientCampaignOption[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, campaign_date")
    .eq("client_id", clientId)
    .order("campaign_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClientCampaignOption[];
}

async function fetchClientCampaign(clientId: string, campaignId?: string): Promise<ClientCampaignData | null> {
  let query = supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status,
      campaign_photos ( id, storage_path, submitted_at )
    `)
    .eq("client_id", clientId)
    .order("campaign_date", { ascending: false });

  if (campaignId) {
    query = query.eq("id", campaignId);
  } else {
    query = query.limit(1);
  }

  const { data, error } = await query.single();

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>();
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);

  const campaignListQuery = useQuery({
    queryKey: ["client-campaigns-list", profile?.client_id],
    queryFn: () => fetchClientCampaigns(profile!.client_id!),
    enabled: !!profile?.client_id,
  });

  const campaignQuery = useQuery({
    queryKey: ["client-campaign", profile?.client_id, selectedCampaignId],
    queryFn: () => fetchClientCampaign(profile!.client_id!, selectedCampaignId),
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
              <>
                <button
                  onClick={() =>
                    generateClientPdf({
                      title: campaign.title,
                      campaign_date: campaign.campaign_date,
                      status: campaign.status,
                      photos: photos.map((p) => ({ submitted_at: p.submitted_at })),
                    })
                  }
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 hidden sm:flex"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </button>
                <Link
                  to="/client/campaign/timing"
                  className="text-sm text-primary hover:underline hidden sm:inline"
                >
                  Timing Sheet
                </Link>
              </>
            )}
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
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

              {/* Campaign switcher */}
              {(campaignListQuery.data?.length ?? 0) > 1 && (
                <div className="relative mb-4">
                  <button
                    onClick={() => setShowCampaignPicker(!showCampaignPicker)}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Switch Campaign
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCampaignPicker ? "rotate-180" : ""}`} />
                  </button>
                  {showCampaignPicker && (
                    <div className="absolute top-8 left-0 z-10 bg-card border border-border rounded-xl shadow-lg py-1 w-72">
                      {campaignListQuery.data!.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCampaignId(c.id);
                            setShowCampaignPicker(false);
                            setLightboxIndex(null);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 ${
                            c.id === campaign.id ? "text-primary font-medium" : "text-foreground"
                          }`}
                        >
                          {c.title}
                          <span className="block text-xs text-muted-foreground">
                            {format(new Date(c.campaign_date), "MMM d, yyyy")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Link
                to="/client/campaign/timing"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline sm:hidden"
              >
                <Clock className="w-4 h-4" />
                View Timing Sheet
              </Link>
            </motion.div>

            {/* Photo gallery */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Campaign Photos
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({photos.length})
                </span>
              </h2>

              {photos.length === 0 ? (
                <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
                  <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-card rounded-xl border border-border overflow-hidden shadow-card cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => signedUrls[photo.id] && setLightboxIndex(i)}
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
                          {format(new Date(photo.submitted_at), "h:mm a")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            {/* Mobile PDF button */}
            <div className="sm:hidden">
              <Button
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() =>
                  generateClientPdf({
                    title: campaign.title,
                    campaign_date: campaign.campaign_date,
                    status: campaign.status,
                    photos: photos.map((p) => ({ submitted_at: p.submitted_at })),
                  })
                }
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF Report
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && signedUrls[photos[lightboxIndex]?.id] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white z-50"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="w-8 h-8" />
            </button>
            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 text-white/70 hover:text-white z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(lightboxIndex - 1);
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
            {lightboxIndex < photos.length - 1 && (
              <button
                className="absolute right-4 text-white/70 hover:text-white z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(lightboxIndex + 1);
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
            <img
              src={signedUrls[photos[lightboxIndex].id]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 text-white/60 text-sm">
              {lightboxIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
