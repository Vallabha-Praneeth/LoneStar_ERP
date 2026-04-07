import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { motionTokens } from "@/lib/tokens/motion-tokens";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const fadeIn = motionTokens.variants.fadeIn;
const fadeUp = motionTokens.variants.fadeUp;

interface StopRow {
  venue_name: string;
  address: string;
}

interface RouteData {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  route_stops: { id: string; stop_order: number; venue_name: string; address: string | null }[];
}

async function fetchRoute(id: string): Promise<RouteData> {
  const { data, error } = await supabase
    .from("routes")
    .select("id, name, city, is_active, route_stops ( id, stop_order, venue_name, address )")
    .eq("id", id)
    .single();
  if (error) throw error;
  // Sort stops by stop_order
  const route = data as RouteData;
  route.route_stops = (route.route_stops ?? []).sort((a, b) => a.stop_order - b.stop_order);
  return route;
}

export default function AdminRouteForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [stops, setStops] = useState<StopRow[]>([]);

  const routeQuery = useQuery({
    queryKey: ["route-edit", id],
    queryFn: () => fetchRoute(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (routeQuery.data) {
      const r = routeQuery.data;
      setName(r.name);
      setCity(r.city ?? "");
      setIsActive(r.is_active);
      setStops(
        r.route_stops.map((s) => ({
          venue_name: s.venue_name,
          address: s.address ?? "",
        }))
      );
    }
  }, [routeQuery.data]);

  function addStop() {
    setStops((prev) => [...prev, { venue_name: "", address: "" }]);
  }

  function removeStop(index: number) {
    setStops((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStop(index: number, field: keyof StopRow, value: string) {
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function moveStop(index: number, direction: "up" | "down") {
    setStops((prev) => {
      const arr = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        // Update route
        const { error: routeErr } = await supabase
          .from("routes")
          .update({
            name: name.trim(),
            city: city.trim() || null,
            is_active: isActive,
          })
          .eq("id", id!);
        if (routeErr) throw routeErr;

        // Delete old stops, insert new
        const { error: delErr } = await supabase
          .from("route_stops")
          .delete()
          .eq("route_id", id!);
        if (delErr) throw delErr;

        const validStops = stops.filter((s) => s.venue_name.trim());
        if (validStops.length > 0) {
          const { error: stopsErr } = await supabase
            .from("route_stops")
            .insert(
              validStops.map((s, i) => ({
                route_id: id!,
                stop_order: i + 1,
                venue_name: s.venue_name.trim(),
                address: s.address.trim() || null,
              }))
            );
          if (stopsErr) throw stopsErr;
        }
      } else {
        // Create route
        const { data: newRoute, error: routeErr } = await supabase
          .from("routes")
          .insert({
            name: name.trim(),
            city: city.trim() || null,
            is_active: isActive,
          })
          .select("id")
          .single();
        if (routeErr) throw routeErr;

        // Insert stops
        const validStops = stops.filter((s) => s.venue_name.trim());
        if (validStops.length > 0) {
          const { error: stopsErr } = await supabase
            .from("route_stops")
            .insert(
              validStops.map((s, i) => ({
                route_id: newRoute.id,
                stop_order: i + 1,
                venue_name: s.venue_name.trim(),
                address: s.address.trim() || null,
              }))
            );
          if (stopsErr) throw stopsErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-routes"] });
      queryClient.invalidateQueries({ queryKey: ["routes-active"] });
      toast.success(isEdit ? "Route updated" : "Route created");
      navigate("/admin/routes");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Route name is required");
      return;
    }
    mutation.mutate();
  }

  if (isEdit && routeQuery.isLoading) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="max-w-2xl space-y-4 py-4"
        aria-busy
        aria-label="Loading route"
      >
        <Skeleton className="h-10 w-3/4 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/routes")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? "Edit Route" : "Create Route"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update route details and stops" : "Set up a new route with stops"}
          </p>
        </div>
      </div>

      <motion.form
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        {/* Route details */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Route Details</h2>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Route Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downtown Loop"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Houston (optional)"
                  className="h-10 rounded-xl bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-sm text-muted-foreground">
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Stops{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({stops.length})
              </span>
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={addStop}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Stop
            </Button>
          </div>

          {stops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No stops added yet. Click "Add Stop" to begin.
            </p>
          )}

          <div className="space-y-3">
            {stops.map((stop, i) => (
              <div key={i} className="flex items-start gap-2">
                {/* Order number */}
                <div className="w-8 h-10 flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                  {i + 1}
                </div>

                {/* Venue name */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={stop.venue_name}
                    onChange={(e) => updateStop(i, "venue_name", e.target.value)}
                    placeholder="Venue name"
                    className="h-10 rounded-xl bg-secondary/50 border-border"
                  />
                </div>

                {/* Address */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={stop.address}
                    onChange={(e) => updateStop(i, "address", e.target.value)}
                    placeholder="Address (optional)"
                    className="h-10 rounded-xl bg-secondary/50 border-border"
                  />
                </div>

                {/* Move buttons */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveStop(i, "up")}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === stops.length - 1}
                    onClick={() => moveStop(i, "down")}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeStop(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/routes")}
            className="rounded-xl"
          >
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
            {isEdit ? "Save Changes" : "Create Route"}
          </Button>
        </div>
      </motion.form>
    </div>
  );
}
