import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { fadeIn as pageFadeIn } from "@/lib/motion/pageMotion";
import { CampaignCostEditor, CostRow } from "@/components/CampaignCostEditor";
import { RiveToggle } from "@/components/ui/rive-toggle";
import { riveAssets } from "@/assets/rive/rive-assets";

const fadeIn = motionTokens.variants.fadeIn;
const fadeUp = motionTokens.variants.fadeUp;

interface ClientOption {
  id: string;
  name: string;
}

interface DriverOption {
  id: string;
  display_name: string;
}

interface RouteOption {
  id: string;
  name: string;
  city: string | null;
}

interface CostTypeOption {
  id: string;
  name: string;
}

interface ExistingCost {
  id: string;
  cost_type_id: string;
  amount: number;
  notes: string | null;
}

interface CampaignData {
  id: string;
  title: string;
  campaign_date: string;
  status: string;
  route_id: string | null;
  internal_notes: string | null;
  client_id: string;
  driver_profile_id: string | null;
  client_billed_amount: number | null;
  driver_can_modify_route: boolean;
  campaign_costs: ExistingCost[];
}

async function fetchCampaign(id: string): Promise<CampaignData> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id, title, campaign_date, status, route_id,
      internal_notes, client_id, driver_profile_id, client_billed_amount,
      driver_can_modify_route,
      campaign_costs ( id, cost_type_id, amount, notes )
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as CampaignData;
}

async function fetchClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ClientOption[];
}

async function fetchDrivers(): Promise<DriverOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "driver")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw error;
  return (data ?? []) as DriverOption[];
}

async function fetchRoutes(): Promise<RouteOption[]> {
  const { data, error } = await supabase
    .from("routes")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as RouteOption[];
}

async function fetchCostTypes(): Promise<CostTypeOption[]> {
  const { data, error } = await supabase
    .from("cost_types")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CostTypeOption[];
}

export default function AdminEditCampaign() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [campaignDate, setCampaignDate] = useState("");
  const [routeId, setRouteId] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [clientBilledAmount, setClientBilledAmount] = useState("");
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [driverCanModifyRoute, setDriverCanModifyRoute] = useState(false);

  const campaignQuery = useQuery({
    queryKey: ["campaign-edit", id],
    queryFn: () => fetchCampaign(id!),
    enabled: !!id,
  });

  const clientsQuery = useQuery({ queryKey: ["clients-active"], queryFn: fetchClients });
  const driversQuery = useQuery({ queryKey: ["drivers-active"], queryFn: fetchDrivers });
  const routesQuery = useQuery({ queryKey: ["routes-active"], queryFn: fetchRoutes });
  const costTypesQuery = useQuery({ queryKey: ["cost-types-active"], queryFn: fetchCostTypes });

  useEffect(() => {
    if (campaignQuery.data && clientsQuery.data && driversQuery.data) {
      const c = campaignQuery.data;
      setTitle(c.title);
      setClientId(c.client_id);
      setDriverId(c.driver_profile_id ?? "");
      setCampaignDate(c.campaign_date);
      setRouteId(c.route_id ?? "");
      setInternalNotes(c.internal_notes ?? "");
      setClientBilledAmount(c.client_billed_amount?.toString() ?? "");
      setDriverCanModifyRoute(!!c.driver_can_modify_route);

      // Populate cost rows from existing campaign_costs
      if (c.campaign_costs && c.campaign_costs.length > 0) {
        setCosts(
          c.campaign_costs.map((cc) => ({
            cost_type_id: cc.cost_type_id,
            amount: cc.amount.toString(),
            notes: cc.notes ?? "",
          }))
        );
      }
    }
  }, [campaignQuery.data, clientsQuery.data, driversQuery.data]);

  function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return null;
    return n;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      // Create route if needed
      let finalRouteId: string | null = routeId || null;
      if (showNewRoute && newRouteName.trim()) {
        const { data: newRoute, error: routeErr } = await supabase
          .from("routes")
          .insert({ name: newRouteName.trim() })
          .select("id")
          .single();
        if (routeErr) throw routeErr;
        finalRouteId = newRoute.id;
      }

      // Update campaign
      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({
          title: title.trim(),
          campaign_date: campaignDate,
          client_id: clientId,
          driver_profile_id: driverId || null,
          route_id: finalRouteId,
          internal_notes: internalNotes.trim() || null,
          client_billed_amount: parseOptionalNumber(clientBilledAmount),
          driver_can_modify_route: driverCanModifyRoute,
        })
        .eq("id", id!);
      if (updateErr) throw updateErr;

      // Replace campaign costs: delete old, insert new
      const { error: delErr } = await supabase
        .from("campaign_costs")
        .delete()
        .eq("campaign_id", id!);
      if (delErr) throw delErr;

      const validCosts = costs.filter(
        (c) => c.cost_type_id && c.amount && parseFloat(c.amount) >= 0
      );
      if (validCosts.length > 0) {
        const { error: costsErr } = await supabase
          .from("campaign_costs")
          .insert(
            validCosts.map((c) => ({
              campaign_id: id!,
              cost_type_id: c.cost_type_id,
              amount: parseFloat(c.amount),
              notes: c.notes.trim() || null,
            }))
          );
        if (costsErr) throw costsErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-edit", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["routes-active"] });
      toast.success("Campaign updated");
      navigate(`/admin/campaigns/${id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (!campaignDate) {
      toast.error("Please select a date");
      return;
    }

    mutation.mutate();
  }

  const clients = clientsQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const costTypes = costTypesQuery.data ?? [];

  if (campaignQuery.isLoading) {
    return (
      <motion.div
        key="loading"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeIn}
        className="max-w-2xl space-y-4 py-4"
        aria-busy
        aria-label="Loading campaign"
      >
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </motion.div>
    );
  }

  return (
    <motion.div
      key="content"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageFadeIn}
      className="max-w-2xl space-y-6"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Campaign</h1>
          <p className="text-sm text-muted-foreground">Update campaign details</p>
        </div>
      </div>

      <motion.form
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Campaign Details</h2>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Campaign Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Downtown Billboard Route"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Driver</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                    <SelectValue placeholder="Assign driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Date</Label>
                <Input
                  type="date"
                  value={campaignDate}
                  onChange={(e) => setCampaignDate(e.target.value)}
                  className="h-10 rounded-xl bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Route</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewRoute(!showNewRoute);
                      if (!showNewRoute) setRouteId("");
                      else setNewRouteName("");
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {showNewRoute ? "Select Existing" : "Create New"}
                  </button>
                </div>
                {showNewRoute ? (
                  <Input
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    placeholder="New route name"
                    className="h-10 rounded-xl bg-secondary/50 border-border"
                  />
                ) : (
                  <Select value={routeId} onValueChange={setRouteId}>
                    <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                      <SelectValue placeholder="Select route (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}{r.city ? ` (${r.city})` : ""}
                        </SelectItem>
                      ))}
                      {routes.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No routes found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal notes about this campaign..."
                className="rounded-xl bg-secondary/50 border-border resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/30 p-4">
              <div className="space-y-1">
                <Label htmlFor="driver-can-modify-route-edit" className="text-sm font-medium">
                  Let driver reorder & skip stops
                </Label>
                <p className="text-xs text-muted-foreground">
                  When off, the driver follows the route in order and cannot skip stops.
                </p>
              </div>
              <RiveToggle
                id="driver-can-modify-route-edit"
                src={riveAssets.unlock}
                checked={driverCanModifyRoute}
                onCheckedChange={setDriverCanModifyRoute}
                aria-label="Let driver reorder and skip stops"
                width={72}
                height={42}
              />
            </div>
          </div>
        </div>

        {/* Cost section */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">
            Cost Breakdown <span className="text-xs text-muted-foreground font-normal">(internal)</span>
          </h2>
          <CampaignCostEditor
            costs={costs}
            onChange={setCosts}
            costTypes={costTypes}
          />
        </div>

        {/* Client billing */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Client Billing</h2>
          <div className="space-y-2">
            <Label>Client Billed Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={clientBilledAmount}
              onChange={(e) => setClientBilledAmount(e.target.value)}
              placeholder="0.00"
              className="h-10 rounded-xl bg-secondary/50 border-border max-w-xs"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
