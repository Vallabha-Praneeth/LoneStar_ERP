import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ImagePlus, ChevronLeft, Upload, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fadeUp } from "@/lib/motion/pageMotion";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { compressImage } from "@/lib/compressImage";
const quickFadeUp = {
  ...fadeUp,
  visible: {
    ...fadeUp.visible,
    transition: { ...fadeUp.visible.transition, duration: motionTokens.duration.fast },
  },
} as const;

interface ActiveCampaign {
  id: string;
  title: string;
}

async function fetchActiveCampaign(driverId: string): Promise<ActiveCampaign | null> {
  // Find active/pending campaign first, then fallback to most recent
  const { data: activeCampaign } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("driver_profile_id", driverId)
    .in("status", ["active", "pending", "draft"])
    .order("campaign_date", { ascending: false })
    .limit(1)
    .single();

  if (activeCampaign) return activeCampaign as ActiveCampaign;

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("driver_profile_id", driverId)
    .order("campaign_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ActiveCampaign;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

function validatePhoto(file: File): string | null {
  if (!ALLOWED_MIME_TYPES[file.type]) {
    return "Only JPEG, PNG, HEIC, and WebP images are allowed.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 15 MB.";
  }
  return null;
}

async function uploadPhoto(
  campaignId: string,
  driverId: string,
  file: File,
  note: string
): Promise<string> {
  const ext = ALLOWED_MIME_TYPES[file.type] ?? "jpg";
  const photoId = crypto.randomUUID();
  const storagePath = `campaigns/${campaignId}/photos/${photoId}/original.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("campaign-photos")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("campaign_photos").insert({
    id: photoId,
    campaign_id: campaignId,
    uploaded_by: driverId,
    storage_path: storagePath,
    note: note.trim() || null,
    submitted_at: new Date().toISOString(),
    captured_at: new Date().toISOString(),
  });

  if (insertError) {
    // Clean up orphaned storage object if DB insert fails
    await supabase.storage.from("campaign-photos").remove([storagePath]);
    throw insertError;
  }

  return photoId;
}

export default function DriverUpload() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: campaign } = useQuery({
    queryKey: ["driver-campaign", profile?.id],
    queryFn: () => fetchActiveCampaign(profile!.id),
    enabled: !!profile?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const compressed = await compressImage(selectedFile!);
      return uploadPhoto(campaign!.id, profile!.id, compressed, note);
    },
    onSuccess: (photoId: string) => {
      queryClient.invalidateQueries({ queryKey: ["driver-campaign"] });
      // Fire-and-forget WhatsApp notification to client
      supabase.functions
        .invoke("send-whatsapp-photo", {
          body: { campaignId: campaign!.id, photoId },
        })
        .catch(() => {}); // silent — don't block the driver flow
      // Fire-and-forget: sync photo to Google Drive
      supabase.functions
        .invoke("sync-photo-to-drive", {
          body: { campaignId: campaign!.id, photoId },
        })
        .catch(() => {});
      navigate("/driver/upload-success");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleFileSelect(file: File) {
    const error = validatePhoto(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleClear() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  return (
    <motion.div
      key="content"
      className="min-h-screen bg-background"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={quickFadeUp}
    >
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2">
        <Link to="/driver/campaign" className="text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="font-semibold text-sm text-foreground">Upload Photo</span>
      </div>

      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-w-md mx-auto space-y-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={quickFadeUp}
          className="bg-card rounded-2xl border border-border shadow-card p-5 space-y-5"
        >
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />

          {/* Upload area */}
          {!previewUrl ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Take a photo or choose from gallery</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  onClick={() => galleryInputRef.current?.click()}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Gallery
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this photo..."
              className="rounded-xl bg-secondary/50 border-border resize-none text-base"
              rows={2}
            />
          </div>

          {/* Upload progress */}
          {uploadMutation.isPending && (
            <motion.div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: motionTokens.duration.fast }}
            >
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: motionTokens.duration.base,
                  ease: motionTokens.easing.smooth,
                }}
              />
            </motion.div>
          )}

          {/* Submit */}
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!selectedFile || !campaign || uploadMutation.isPending}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium disabled:opacity-40"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Submit Photo
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
