import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface ClientOption {
  id: string;
  name: string;
}

async function fetchActiveClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClientOption[];
}

export function CreateClientUserDialog({ open, onOpenChange, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["active-clients"],
    queryFn: fetchActiveClients,
    enabled: open,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail) {
      toast.error("Email is required");
      return;
    }
    if (!trimmedName) {
      toast.error("Display name is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!clientId) {
      toast.error("Please select a client organization");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        role: "client",
        username: trimmedEmail,
        display_name: trimmedName,
        password,
        email: trimmedEmail,
        client_id: clientId,
      },
    });

    setSaving(false);

    if (error) {
      toast.error(error.message || "Failed to create client user");
      return;
    }

    if (data?.error) {
      toast.error(data.error);
      return;
    }

    const user = data?.user;
    toast.success(`Client user "${user?.display_name ?? trimmedName}" created`);
    setEmail("");
    setDisplayName("");
    setPassword("");
    setClientId("");
    onCreated();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Client User</DialogTitle>
          <DialogDescription>
            Create a login account for a client to access their campaign portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-user-email">Email</Label>
            <Input
              id="client-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@acme.com"
              className="h-10 rounded-xl bg-secondary/50 border-border"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-user-name">Display Name</Label>
            <Input
              id="client-user-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="h-10 rounded-xl bg-secondary/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-user-password">Password</Label>
            <Input
              id="client-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-10 rounded-xl bg-secondary/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Client Organization</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                <SelectValue placeholder={clientsLoading ? "Loading..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Client User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
