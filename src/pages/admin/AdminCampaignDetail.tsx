import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, FileDown, Clock, User, Building2, StickyNote, Loader2, Image, Pencil, Trash2, ExternalLink, FolderPlus, DollarSign, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { generateCampaignPdf } from "@/lib/generateCampaignPdf";
import { toast } from "sonner";
import type { ShiftStatus } from "@/lib/types";

const fadeIn = motionTokens.variants.fadeIn;
const fadeUp = motionTokens.variants.fadeUp;
const gridStaggerParent = { hidden: {}, visible: { transition: { staggerChildren: motionTokens.stagger.grid } } } as const;
const sectionStaggerParent = { hidden: {}, visible: { transition: { staggerChildren: motionTokens.stagger.section } } } as const;

interface CampaignCostItem {
  id: string;
  amount: number;
  notes: string | null;
  cost_types: { name: string } | null;
}

interface CampaignDetail {
  id: string;
  title: string;
  campaign_date: string;
  status: "draft" | "pending" | "active" | "completed";
  route_id: string | null;
  routes: { name: string; city: string | null } | null;
  internal_notes: string | null;
  client_billed_amount: number | null;
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
  drive_folder_url: string | null;
  campaign_costs: CampaignCostItem[];
  driver_shifts: { id: string; started_at: string; ended_at: string | null; shift_status: ShiftStatus }[];
  campaign_photos: { id: string; submitted_at: string; note: string | null; storage_path: string }[];
}

async function fetchCampaign(id: string): Promise<CampaignDetail | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status, route_id,
      internal_notes, client_billed_amount, drive_folder_url,
      routes:route_id ( name, city ),
      clients ( name ),
      driver_profile:profiles!driver_profile_id ( display_name ),
      campaign_costs ( id, amount, notes, cost_types ( name ) ),
      driver_shifts ( id, started_at, ended_at, shift_status ),
      campaign_photos ( id, submitted_at, note, storage_path )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CampaignDetail;
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return "\u2014";
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

const shiftStatusColors: Record<ShiftStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-gray-100 text-gray-800",
  no_show: "bg-red-100 text-red-800",
  cancelled: "bg-amber-100 text-amber-800",
};

function shiftStatusLabel(s: ShiftStatus): string {
  return s === "no_show" ? "No Show" : s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminCampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

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
    await supabase.from("campaign_photos").delete().eq("campaign_id", id!);
    await supabase.from("driver_shifts").delete().eq("campaign_id", id!);
    await supabase.from("campaign_costs").delete().eq("campaign_id", id!);
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
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="space-y-6 max-w-5xl"
        aria-busy
        aria-label="Loading campaign"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </motion.div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
        Failed to load campaign. <button onClick={() => navigate(-1)} className="underline">Go back</button>
      </div>
    );
  }

  const activeShift = campaign.driver_shifts.find((s) => s.shift_status === "active");
  const latestShift = campaign.driver_shifts.sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )[0];

  const photoCount = campaign.campaign_photos.length;

  // Cost calculations
  const totalInternalCost = campaign.campaign_costs.reduce((sum, c) => sum + c.amount, 0);
  const profitMargin =
    campaign.client_billed_amount != null
      ? campaign.client_billed_amount - totalInternalCost
      : null;

  const routeDisplay = campaign.routes
    ? `${campaign.routes.name}${campaign.routes.city ? ` (${campaign.routes.city})` : ""}`
    : null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionStaggerParent}
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-3">
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
            {routeDisplay && ` \u2022 Route: ${routeDisplay}`}
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
          {campaign.drive_folder_url ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl hidden sm:flex"
              asChild
            >
              <a href={campaign.drive_folder_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Google Drive
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl hidden sm:flex"
              disabled={creatingFolder}
              onClick={async () => {
                setCreatingFolder(true);
                const { error: fnErr } = await supabase.functions.invoke("create-drive-folder", {
                  body: { campaignId: id },
                });
                setCreatingFolder(false);
                if (fnErr) {
                  toast.error("Failed to create Drive folder");
                } else {
                  toast.success("Drive folder created");
                  queryClient.invalidateQueries({ queryKey: ["campaign", id] });
                }
              }}
            >
              {creatingFolder ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5 mr-1.5" />}
              Create Drive Folder
            </Button>
          )}
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
      </motion.div>

      {/* Info cards */}
      <motion.div
        variants={gridStaggerParent}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { icon: Building2, label: "Client", value: campaign.clients?.name ?? "\u2014" },
          { icon: User, label: "Driver", value: campaign.driver_profile?.display_name ?? "Unassigned" },
          { icon: Clock, label: "Login Time", value: latestShift ? formatTime(latestShift.started_at) : "\u2014" },
          { icon: Clock, label: "Logout Time", value: latestShift?.ended_at ? formatTime(latestShift.ended_at) : activeShift ? "Active" : "\u2014" },
        ].map((item) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            className="bg-card rounded-xl border border-border shadow-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="font-semibold text-foreground">{item.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Internal notes */}
      {campaign.internal_notes && (
        <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Internal Notes</h3>
          </div>
          <p className="text-sm text-muted-foreground">{campaign.internal_notes}</p>
        </motion.div>
      )}

      {/* Cost section */}
      {(campaign.campaign_costs.length > 0 || campaign.client_billed_amount != null) && (
        <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">
              Financial Summary <span className="text-xs text-muted-foreground font-normal">(internal)</span>
            </h3>
          </div>

          {campaign.campaign_costs.length > 0 && (
            <div className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Cost Item</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left py-2 pl-4 text-muted-foreground font-medium hidden sm:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.campaign_costs.map((cost) => (
                    <tr key={cost.id} className="border-b border-border/50">
                      <td className="py-2 text-foreground">{cost.cost_types?.name ?? "Unknown"}</td>
                      <td className="py-2 text-right font-medium text-foreground">${cost.amount.toFixed(2)}</td>
                      <td className="py-2 pl-4 text-muted-foreground hidden sm:table-cell">{cost.notes ?? "\u2014"}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="py-2 font-semibold text-foreground">Total Internal Cost</td>
                    <td className="py-2 text-right font-semibold text-foreground">${totalInternalCost.toFixed(2)}</td>
                    <td className="hidden sm:table-cell" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {campaign.client_billed_amount != null && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Client Billed</p>
                <p className="font-semibold text-foreground">${campaign.client_billed_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Internal Cost</p>
                <p className="font-semibold text-foreground">${totalInternalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className={`font-semibold ${profitMargin != null && profitMargin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {profitMargin != null ? `$${profitMargin.toFixed(2)}` : "\u2014"}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Driver shifts with status badges */}
      {campaign.driver_shifts.length > 0 && (
        <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Driver Shifts</h3>
          </div>
          <div className="space-y-2">
            {campaign.driver_shifts
              .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
              .map((shift) => (
                <div key={shift.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="text-sm text-foreground">
                    {formatTime(shift.started_at)} {"\u2014"} {shift.ended_at ? formatTime(shift.ended_at) : "Ongoing"}
                  </div>
                  <Badge variant="secondary" className={`text-xs ${shiftStatusColors[shift.shift_status]}`}>
                    {shiftStatusLabel(shift.shift_status)}
                  </Badge>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Photos */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground text-lg">Campaign Photos</h3>
            <p className="text-xs text-muted-foreground">
              {photoCount} photo{photoCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Link to={`/admin/campaigns/${id}/photos`} className="text-sm text-primary hover:underline">
            View All {"\u2192"}
          </Link>
        </div>

        {campaign.campaign_photos.length === 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
            <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={gridStaggerParent}
          >
            {campaign.campaign_photos.slice(0, 6).map((photo) => (
              <motion.div key={photo.id} variants={fadeUp}>
              <Link
                to={`/admin/campaigns/${id}/photos`}
                className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-md transition-shadow block h-full"
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
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Mobile PDF button */}
      <motion.div variants={fadeUp} className="sm:hidden">
        <Button
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => generateCampaignPdf(campaign)}
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF Report
        </Button>
      </motion.div>
    </motion.div>
  );
}
