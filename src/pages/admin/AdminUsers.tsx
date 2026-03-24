import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, UserCheck, UserX, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserRow {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  role: "admin" | "driver" | "client";
  is_active: boolean;
  created_at: string;
  client_name?: string;
}

async function fetchUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, email, role, is_active, created_at, clients:client_id ( name )")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((u: { id: string; display_name: string; username: string; email: string | null; role: "admin" | "driver" | "client"; is_active: boolean; created_at: string; clients: { name: string } | null }) => ({
    id: u.id,
    display_name: u.display_name,
    username: u.username,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    client_name: u.clients?.name ?? undefined,
  }));
}

async function toggleUserActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !isActive })
    .eq("id", userId);
  if (error) throw error;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    let result = users;
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (u) =>
          u.display_name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, search, roleFilter]);

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-primary/10 text-primary",
      driver: "bg-success/10 text-success",
      client: "bg-accent/10 text-accent",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[role] ?? "bg-muted text-muted-foreground"}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage drivers, clients, and admin accounts</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 h-10 rounded-xl bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-auto min-w-[130px] h-10 rounded-xl bg-card border-border">
            <Users className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-4">
          Failed to load users.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-16">
          {search ? "No users match your search." : "No users found."}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-card"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-muted-foreground">
                {u.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{u.display_name}</h3>
                {roleBadge(u.role)}
                {!u.is_active && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span className="text-xs text-muted-foreground">@{u.username}</span>
                {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                {u.client_name && <span className="text-xs text-muted-foreground">Client: {u.client_name}</span>}
                <span className="text-xs text-muted-foreground">
                  Joined {format(new Date(u.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`rounded-lg text-xs ${
                u.is_active
                  ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                  : "border-success/30 text-success hover:bg-success/5"
              }`}
              disabled={toggleMutation.isPending || u.role === "admin"}
              onClick={() => toggleMutation.mutate({ id: u.id, isActive: u.is_active })}
            >
              {u.is_active ? (
                <>
                  <UserX className="w-3.5 h-3.5 mr-1" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Activate
                </>
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
