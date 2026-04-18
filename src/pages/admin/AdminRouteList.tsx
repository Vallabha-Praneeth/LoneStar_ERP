import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Search, MapPin, ArrowRight, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeIn, listStaggerParent, slideIn, skeletonPulse } from "@/lib/motion/pageMotion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface RouteRow {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  route_stops: { id: string }[];
}

async function fetchRoutes(): Promise<RouteRow[]> {
  const { data, error } = await supabase
    .from("routes")
    .select("id, name, city, is_active, route_stops ( id )")
    .order("name");
  if (error) throw error;
  return (data ?? []) as RouteRow[];
}

export default function AdminRouteList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: routes = [], isLoading, error } = useQuery({
    queryKey: ["admin-routes"],
    queryFn: fetchRoutes,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("routes")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-routes"] });
      queryClient.invalidateQueries({ queryKey: ["routes-active"] });
      toast.success("Route status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q)
    );
  }, [routes, search]);

  return (
    <motion.div
      key="content"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Routes</h1>
          <p className="text-sm text-muted-foreground">
            {routes.length} total &middot;{" "}
            {routes.filter((r) => r.is_active).length} active
          </p>
        </div>
        <Link to="/admin/routes/create">
          <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Create Route
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or city..."
          className="pl-9 h-10 rounded-xl bg-card border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* States */}
      {isLoading && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeIn}
          className="grid gap-3"
          aria-busy
          aria-label="Loading routes"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} animate={skeletonPulse.animate} transition={skeletonPulse.transition}>
              <Skeleton className="h-24 w-full rounded-xl" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
          Failed to load routes.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm text-muted-foreground">
            {search ? "No routes match your search." : "No routes yet."}
          </p>
          {!search && (
            <Link to="/admin/routes/create">
              <Button variant="outline" size="sm" className="rounded-lg mt-2">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create your first route
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Route cards */}
      <motion.div
        className="grid gap-3"
        initial="hidden"
        animate="visible"
        variants={listStaggerParent}
      >
        {filtered.map((r) => {
          const stopCount = r.route_stops?.length ?? 0;

          return (
            <motion.div key={r.id} variants={slideIn}>
              <div className="group flex items-center bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Active accent bar */}
                <div
                  className={`w-1 self-stretch shrink-0 ${
                    r.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                />

                {/* Content */}
                <Link
                  to={`/admin/routes/${r.id}/edit`}
                  className="flex-1 p-4 min-w-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground text-[15px] leading-snug truncate">
                      {r.name}
                    </h3>
                    {!r.is_active && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                    {r.city && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {r.city}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      {stopCount} {stopCount === 1 ? "stop" : "stops"}
                    </span>
                  </div>
                </Link>

                {/* Toggle + arrow */}
                <div className="flex items-center gap-3 pr-4 pl-2">
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={() =>
                      toggleMutation.mutate({ id: r.id, is_active: r.is_active })
                    }
                    disabled={toggleMutation.isPending}
                  />
                  <Link to={`/admin/routes/${r.id}/edit`}>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
