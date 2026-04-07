import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Save, Loader2, UserPlus, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { CreateDriverDialog } from "@/components/CreateDriverDialog";
import { CampaignCostEditor, CostRow } from "@/components/CampaignCostEditor";

const fadeUp = motionTokens.variants.fadeUp;

interface ClientOption {
  id: string;
  name: string;
}

interface DriverOption {
  id: string;
  display_name: string;
  base_daily_wage: number | null;
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
    .select("id, display_name, drivers ( base_daily_wage )")
    .eq("role", "driver")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw error;
  return (data ?? []).map((d: { id: string; display_name: string; drivers: { base_daily_wage: number | null }[] | { base_daily_wage: number | null } | null }) => ({
    id: d.id,
    display_name: d.display_name,
    base_daily_wage: d.drivers?.[0]?.base_daily_wage ?? d.drivers?.base_daily_wage ?? null,
  }));
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

export default function AdminCreateCampaign() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [campaignDate, setCampaignDate] = useState("");
  const [routeId, setRouteId] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [clientBilledAmount, setClientBilledAmount] = useState("");
  const [costs, setCosts] = useState<CostRow[]>([]);

  const clientsQuery = useQuery({
    queryKey: ["clients-active"],
    queryFn: fetchClients,
  });

  const driversQuery = useQuery({
    queryKey: ["drivers-active"],
    queryFn: fetchDrivers,
  });

  const routesQuery = useQuery({
    queryKey: ["routes-active"],
    queryFn: fetchRoutes,
  });

  const costTypesQuery = useQuery({
    queryKey: ["cost-types-active"],
    queryFn: fetchCostTypes,
  });

  // Auto-populate Driver Wage cost when driver is selected
  useEffect(() => {
    if (!driverId) return;
    const driver = (driversQuery.data ?? []).find((d) => d.id === driverId);
    if (!driver?.base_daily_wage) return;
    const costTypes = costTypesQuery.data ?? [];
    const driverWageType = costTypes.find((ct) => ct.name === "Driver Wage");
    if (!driverWageType) return;

    // Check if there's already a Driver Wage row
    const hasWageRow = costs.some((c) => c.cost_type_id === driverWageType.id);
    if (!hasWageRow) {
      setCosts((prev) => [
        ...prev,
        {
          cost_type_id: driverWageType.id,
          amount: driver.base_daily_wage!.toString(),
          notes: "",
        },
      ]);
    }
  }, [driverId]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Insert campaign
      const { data: campaign, error: campaignErr } = await supabase
        .from("campaigns")
        .insert({
          title: title.trim(),
          campaign_date: campaignDate,
          client_id: clientId,
          driver_profile_id: driverId || null,
          route_id: finalRouteId,
          internal_notes: internalNotes.trim() || null,
          client_billed_amount: parseOptionalNumber(clientBilledAmount),
          created_by: profile!.id,
          status: "draft",
        })
        .select("id")
        .single();
      if (campaignErr) throw campaignErr;

      // Batch insert campaign costs
      const validCosts = costs.filter(
        (c) => c.cost_type_id && c.amount && parseFloat(c.amount) >= 0
      );
      if (validCosts.length > 0) {
        const { error: costsErr } = await supabase
          .from("campaign_costs")
          .insert(
            validCosts.map((c) => ({
              campaign_id: campaign.id,
              cost_type_id: c.cost_type_id,
              amount: parseFloat(c.amount),
              notes: c.notes.trim() || null,
            }))
          );
        if (costsErr) throw costsErr;
      }

      return campaign.id;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["routes-active"] });
      toast.success("Campaign created");
      navigate(`/admin/campaigns/${newId}`);
      // Fire-and-forget: create Google Drive folder for this campaign
      supabase.functions
        .invoke("create-drive-folder", { body: { campaignId: newId } })
        .catch(() => {});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return null;
    return n;
  }

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

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Campaign</h1>
          <p className="text-sm text-muted-foreground">Set up a new ad truck campaign</p>
        </div>
      </div>

      <motion.form
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        {/* Basic info */}
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
                <div className="flex items-center justify-between">
                  <Label>Client</Label>
                  <button
                    type="button"
                    onClick={() => setShowCreateClient(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add New
                  </button>
                </div>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {clients.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No clients found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Driver</Label>
                  <button
                    type="button"
                    onClick={() => setShowCreateDriver(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add New
                  </button>
                </div>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                    <SelectValue placeholder="Assign driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.display_name}
                      </SelectItem>
                    ))}
                    {drivers.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No drivers found
                      </div>
                    )}
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
            Create Campaign
          </Button>
        </div>
      </motion.form>

      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onCreated={(client) => {
          queryClient.invalidateQueries({ queryKey: ["clients-active"] });
          setClientId(client.id);
        }}
      />

      <CreateDriverDialog
        open={showCreateDriver}
        onOpenChange={setShowCreateDriver}
        onCreated={(driver) => {
          queryClient.invalidateQueries({ queryKey: ["drivers-active"] });
          setDriverId(driver.id);
        }}
      />
    </div>
  );
}
