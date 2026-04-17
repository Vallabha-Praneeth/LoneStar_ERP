import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Loader2, UserCheck, UserX, Users, Shield, Truck, Eye,
  Plus, KeyRound, ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeIn, listStaggerParent, slideIn, skeletonPulse } from "@/lib/motion/pageMotion";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreateDriverDialog } from "@/components/CreateDriverDialog";
import { CreateClientUserDialog } from "@/components/CreateClientUserDialog";

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
    .select(
      "id, display_name, username, email, role, is_active, created_at, clients:client_id ( name )"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(
    (u: {
      id: string;
      display_name: string;
      username: string;
      email: string | null;
      role: "admin" | "driver" | "client";
      is_active: boolean;
      created_at: string;
      clients: { name: string } | null;
    }) => ({
      id: u.id,
      display_name: u.display_name,
      username: u.username,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at,
      client_name: u.clients?.name ?? undefined,
    })
  );
}

async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !isActive })
    .eq("id", userId);
  if (error) throw error;
}

const roleConfig: Record<
  string,
  { bg: string; text: string; avatarBg: string; avatarText: string; icon: typeof Shield }
> = {
  admin: {
    bg: "bg-primary/10",
    text: "text-primary",
    avatarBg: "bg-primary/15",
    avatarText: "text-primary",
    icon: Shield,
  },
  driver: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-700",
    icon: Truck,
  },
  client: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-700",
    icon: Eye,
  },
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const queryClient = useQueryClient();

  // Create dialogs
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showCreateClientUser, setShowCreateClientUser] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
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

  const roleCounts = useMemo(() => {
    const counts = { admin: 0, driver: 0, client: 0 };
    users.forEach((u) => {
      if (u.role in counts) counts[u.role]++;
    });
    return counts;
  }, [users]);

  async function handleResetPassword() {
    if (!resetTarget) return;
    if (resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResetLoading(true);
    const { data, error } = await supabase.functions.invoke("reset-user-password", {
      body: { user_id: resetTarget.id, new_password: resetPassword },
    });
    setResetLoading(false);

    if (error) {
      toast.error(error.message || "Failed to reset password");
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }

    toast.success(`Password reset for ${resetTarget.display_name}`);
    setResetTarget(null);
    setResetPassword("");
  }

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {users.length} users &middot; {roleCounts.driver} drivers &middot;{" "}
            {roleCounts.client} clients &middot; {roleCounts.admin} admins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateClientUser(true)}
            variant="outline"
            className="rounded-xl"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Client User
          </Button>
          <Button
            onClick={() => setShowCreateDriver(true)}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Driver
          </Button>
        </div>
      </div>

      {/* Filters */}
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

      {/* States */}
      {isLoading && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeIn}
          className="grid gap-2.5"
          aria-busy
          aria-label="Loading users"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div key={i} animate={skeletonPulse.animate} transition={skeletonPulse.transition}>
              <Skeleton className="h-20 w-full rounded-xl" />
            </motion.div>
          ))}
        </motion.div>
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

      {/* User cards */}
      <motion.div
        className="grid gap-2.5"
        initial="hidden"
        animate="visible"
        variants={listStaggerParent}
      >
        {filtered.map((u) => {
          const rc = roleConfig[u.role] ?? roleConfig.client;
          const RoleIcon = rc.icon;

          return (
            <motion.div
              key={u.id}
              variants={slideIn}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-sm"
            >
              {/* Avatar with role color */}
              <div
                className={`w-10 h-10 rounded-full ${rc.avatarBg} flex items-center justify-center shrink-0`}
              >
                <span className={`text-sm font-bold ${rc.avatarText}`}>
                  {u.display_name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-[15px] truncate">
                    {u.display_name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </span>
                  {!u.is_active && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  <span className="text-xs text-muted-foreground">
                    @{u.username}
                  </span>
                  {u.email && (
                    <span className="text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  )}
                  {u.client_name && (
                    <span className="text-xs text-muted-foreground">
                      Client: {u.client_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/60">
                    Joined {format(new Date(u.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {u.role === "driver" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    asChild
                  >
                    <Link to={`/admin/drivers/${u.id}`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden sm:inline">Details</span>
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                  disabled={u.role === "admin"}
                  onClick={() => {
                    setResetTarget(u);
                    setResetPassword("");
                  }}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Reset PW</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-lg text-xs ${
                    u.is_active
                      ? "border-destructive/20 text-destructive hover:bg-destructive/5"
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  }`}
                  disabled={toggleMutation.isPending || u.role === "admin"}
                  onClick={() =>
                    toggleMutation.mutate({ id: u.id, isActive: u.is_active })
                  }
                >
                  {u.is_active ? (
                    <>
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden sm:inline">Deactivate</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden sm:inline">Activate</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Create Driver Dialog */}
      <CreateDriverDialog
        open={showCreateDriver}
        onOpenChange={setShowCreateDriver}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        }}
      />

      {/* Create Client User Dialog */}
      <CreateClientUserDialog
        open={showCreateClientUser}
        onOpenChange={setShowCreateClientUser}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        }}
      />

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetTarget?.display_name} (@{resetTarget?.username}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-pw">New Password</Label>
              <Input
                id="reset-pw"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="h-10 rounded-xl bg-secondary/50 border-border"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleResetPassword(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setResetTarget(null); setResetPassword(""); }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading || resetPassword.length < 6}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {resetLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
