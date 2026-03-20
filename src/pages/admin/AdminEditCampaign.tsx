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
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ClientOption {
  id: string;
  name: string;
}

interface DriverOption {
  id: string;
  display_name: string;
}

interface CampaignData {
  id: string;
  title: string;
  campaign_date: string;
  status: string;
  route_code: string | null;
  internal_notes: string | null;
  client_id: string;
  driver_profile_id: string | null;
  driver_daily_wage: number | null;
  transport_cost: number | null;
  other_cost: number | null;
}

async function fetchCampaign(id: string): Promise<CampaignData> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, campaign_date, status, route_code, internal_notes, client_id, driver_profile_id, driver_daily_wage, transport_cost, other_cost")
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

export default function AdminEditCampaign() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [campaignDate, setCampaignDate] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [driverWage, setDriverWage] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [otherCost, setOtherCost] = useState("");

  const campaignQuery = useQuery({
    queryKey: ["campaign-edit", id],
    queryFn: () => fetchCampaign(id!),
    enabled: !!id,
  });

  const clientsQuery = useQuery({ queryKey: ["clients-active"], queryFn: fetchClients });
  const driversQuery = useQuery({ queryKey: ["drivers-active"], queryFn: fetchDrivers });

  useEffect(() => {
    if (campaignQuery.data && clientsQuery.data && driversQuery.data) {
      const c = campaignQuery.data;
      setTitle(c.title);
      setClientId(c.client_id);
      setDriverId(c.driver_profile_id ?? "");
      setCampaignDate(c.campaign_date);
      setRouteCode(c.route_code ?? "");
      setInternalNotes(c.internal_notes ?? "");
      setDriverWage(c.driver_daily_wage?.toString() ?? "");
      setTransportCost(c.transport_cost?.toString() ?? "");
      setOtherCost(c.other_cost?.toString() ?? "");
    }
  }, [campaignQuery.data, clientsQuery.data, driversQuery.data]);

  const mutation = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { error } = await supabase.from("campaigns").update(input).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign updated");
      navigate(`/admin/campaigns/${id}`);
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

    mutation.mutate({
      title: title.trim(),
      campaign_date: campaignDate,
      client_id: clientId,
      driver_profile_id: driverId || null,
      route_code: routeCode.trim() || null,
      internal_notes: internalNotes.trim() || null,
      driver_daily_wage: parseOptionalNumber(driverWage),
      transport_cost: parseOptionalNumber(transportCost),
      other_cost: parseOptionalNumber(otherCost),
    });
  }

  const clients = clientsQuery.data ?? [];
  const drivers = driversQuery.data ?? [];

  if (campaignQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
                <Label>Route Code</Label>
                <Input
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value)}
                  placeholder="e.g. A-7"
                  className="h-10 rounded-xl bg-secondary/50 border-border"
                />
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

        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">
            Cost Breakdown <span className="text-xs text-muted-foreground font-normal">(internal)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Driver Daily Wage</Label>
              <Input
                type="number" step="0.01" min="0"
                value={driverWage}
                onChange={(e) => setDriverWage(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Transport Cost</Label>
              <Input
                type="number" step="0.01" min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Other Cost</Label>
              <Input
                type="number" step="0.01" min="0"
                value={otherCost}
                onChange={(e) => setOtherCost(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
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
    </div>
  );
}
