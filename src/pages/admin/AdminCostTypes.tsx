import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CostTypeRow {
  id: string;
  name: string;
  is_active: boolean;
}

async function fetchCostTypes(): Promise<CostTypeRow[]> {
  const { data, error } = await supabase
    .from("cost_types")
    .select("id, name, is_active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as CostTypeRow[];
}

export default function AdminCostTypes() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: costTypes = [], isLoading, error } = useQuery({
    queryKey: ["admin-cost-types"],
    queryFn: fetchCostTypes,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("cost_types")
        .insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-types"] });
      queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
      setNewName("");
      toast.success("Cost type created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("cost_types")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-types"] });
      queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
      toast.success("Cost type updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    createMutation.mutate(newName);
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Cost Types
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage cost categories used in campaign cost breakdowns.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New cost type name..."
          className="h-10 rounded-xl bg-card border-border flex-1"
        />
        <Button
          type="submit"
          disabled={createMutation.isPending || !newName.trim()}
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Add
        </Button>
      </form>

      {/* States */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
          Failed to load cost types.
        </div>
      )}

      {!isLoading && !error && costTypes.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-16">
          No cost types yet. Add one above.
        </div>
      )}

      {/* List */}
      <div className="bg-card rounded-xl border border-border shadow-card divide-y divide-border">
        {costTypes.map((ct, i) => (
          <motion.div
            key={ct.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between px-5 py-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`font-medium text-[15px] ${
                  ct.is_active ? "text-foreground" : "text-muted-foreground line-through"
                }`}
              >
                {ct.name}
              </span>
              {!ct.is_active && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                  Inactive
                </span>
              )}
            </div>
            <Switch
              checked={ct.is_active}
              onCheckedChange={() =>
                toggleMutation.mutate({ id: ct.id, is_active: ct.is_active })
              }
              disabled={toggleMutation.isPending}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
