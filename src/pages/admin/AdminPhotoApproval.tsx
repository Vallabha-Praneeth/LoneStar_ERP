import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PhotoCard } from "@/components/PhotoCard";
import { ArrowLeft, CheckCheck, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

interface PhotoRow {
  id: string;
  storage_path: string;
  note: string | null;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
}

interface CampaignInfo {
  title: string;
}

async function fetchPhotos(campaignId: string): Promise<PhotoRow[]> {
  const { data, error } = await supabase
    .from("campaign_photos")
    .select("id, storage_path, note, submitted_at, status")
    .eq("campaign_id", campaignId)
    .order("submitted_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PhotoRow[];
}

async function fetchCampaignTitle(campaignId: string): Promise<CampaignInfo> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("title")
    .eq("id", campaignId)
    .single();
  if (error) throw error;
  return data as CampaignInfo;
}

async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("campaign-photos")
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function updatePhotoStatus(
  photoId: string,
  status: "approved" | "rejected",
  reviewerId: string
): Promise<void> {
  const { error } = await supabase
    .from("campaign_photos")
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", photoId);
  if (error) throw error;
}

export default function AdminPhotoApproval() {
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const photosQuery = useQuery({
    queryKey: ["campaign-photos", campaignId],
    queryFn: () => fetchPhotos(campaignId!),
    enabled: !!campaignId,
  });

  const campaignQuery = useQuery({
    queryKey: ["campaign-title", campaignId],
    queryFn: () => fetchCampaignTitle(campaignId!),
    enabled: !!campaignId,
  });

  // Fetch signed URLs for all photos
  const signedUrlsQuery = useQuery({
    queryKey: ["campaign-photo-urls", campaignId, photosQuery.data?.map((p) => p.id)],
    queryFn: async () => {
      const photos = photosQuery.data ?? [];
      const entries = await Promise.all(
        photos.map(async (p) => {
          const url = await getSignedUrl(p.storage_path);
          return [p.id, url] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, string>;
    },
    enabled: (photosQuery.data?.length ?? 0) > 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ photoId, status }: { photoId: string; status: "approved" | "rejected" }) =>
      updatePhotoStatus(photoId, status, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-photos", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function approveAll() {
    const pending = (photosQuery.data ?? []).filter((p) => p.status === "pending");
    await Promise.all(
      pending.map((p) => updatePhotoStatus(p.id, "approved", profile!.id))
    );
    queryClient.invalidateQueries({ queryKey: ["campaign-photos", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    toast.success(`${pending.length} photo${pending.length !== 1 ? "s" : ""} approved`);
  }

  const photos = photosQuery.data ?? [];
  const pendingCount = photos.filter((p) => p.status === "pending").length;
  const signedUrls = signedUrlsQuery.data ?? {};

  if (photosQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (photosQuery.error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
        Failed to load photos.{" "}
        <button onClick={() => navigate(-1)} className="underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Photo Approval</h1>
          <p className="text-sm text-muted-foreground">
            {campaignQuery.data?.title ?? "Campaign"} • {pendingCount} pending review
          </p>
        </div>
        {pendingCount > 0 && (
          <Button
            onClick={approveAll}
            className="rounded-xl bg-success text-success-foreground hover:bg-success/90 hidden sm:flex"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Approve All
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-16">
          No photos submitted for this campaign yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <PhotoCard
                imageUrl={signedUrls[photo.id] ?? ""}
                time={format(new Date(photo.submitted_at), "h:mm a")}
                note={photo.note ?? undefined}
                status={photo.status}
                showActions
                onApprove={() =>
                  updateMutation.mutate({ photoId: photo.id, status: "approved" })
                }
                onReject={() =>
                  updateMutation.mutate({ photoId: photo.id, status: "rejected" })
                }
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Mobile approve all */}
      {pendingCount > 0 && (
        <div className="sm:hidden">
          <Button
            onClick={approveAll}
            className="w-full h-12 rounded-xl bg-success text-success-foreground hover:bg-success/90"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Approve All ({pendingCount})
          </Button>
        </div>
      )}
    </div>
  );
}
