import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileDown, Clock, User, Building2, StickyNote, Loader2, Image, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { generateCampaignPdf } from "@/lib/generateCampaignPdf";
import { toast } from "sonner";

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
  campaign_photos: { id: string; submitted_at: string; note: string | null; storage_path: string }[];
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
      campaign_photos ( id, submitted_at, note, storage_path )
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

async function fetchPhotoUrls(photos: { id: string; storage_path: string }[]): Promise<Record<string, string>> {
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

export default function AdminCampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaign(id!),
    enabled: !!id,
  });

  const photoUrlsQuery = useQuery({
    queryKey: ["campaign-detail-photo-urls", id, campaign?.campaign_photos?.map((p) => p.id)],
    queryFn: () => fetchPhotoUrls(campaign!.campaign_photos.slice(0, 6)),
    enabled: (campaign?.campaign_photos?.length ?? 0) > 0,
  });

  const signedUrls = photoUrlsQuery.data ?? {};

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleDelete() {
    setDeleting(true);
    // Delete related records first, then the campaign
    await supabase.from("campaign_photos").delete().eq("campaign_id", id!);
    await supabase.from("driver_shifts").delete().eq("campaign_id", id!);
    const { error } = await supabase.from("campaigns").delete().eq("id", id!);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    toast.success("Campaign deleted");
    navigate("/admin/campaigns");
  }

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

  const photoCount = campaign.campaign_photos.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{campaign.title}</h1>
            <Select
              value={campaign.status}
              onValueChange={(val) => statusMutation.mutate(val)}
            >
              <SelectTrigger className="w-auto h-7 rounded-full text-xs px-3 border-0 gap-1.5 bg-transparent hover:bg-muted/50">
                <StatusBadge status={campaign.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(campaign.campaign_date), "MMMM d, yyyy")}
            {campaign.route_code && ` • Route ${campaign.route_code}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl hidden sm:flex"
            onClick={() => navigate(`/admin/campaigns/${id}/edit`)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 hidden sm:flex"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{campaign.title}" and all associated photos and shift records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Delete Campaign
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl hidden sm:flex"
            onClick={() => generateCampaignPdf(campaign)}
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            Export PDF
          </Button>
        </div>
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
              {photoCount} photo{photoCount !== 1 ? "s" : ""}
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
              <Link
                key={photo.id}
                to={`/admin/campaigns/${id}/photos`}
                className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-md transition-shadow"
              >
                {signedUrls[photo.id] ? (
                  <div className="aspect-[4/3]">
                    <img
                      src={signedUrls[photo.id]}
                      alt="Campaign photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(photo.submitted_at), "h:mm a")}
                  </span>
                </div>
                {photo.note && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-muted-foreground truncate">{photo.note}</p>
                  </div>
                )}
              </Link>
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
