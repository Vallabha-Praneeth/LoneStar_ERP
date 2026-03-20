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
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (driver: { id: string; display_name: string }) => void;
}

export function CreateDriverDialog({ open, onOpenChange, onCreated }: Props) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedName = displayName.trim();

    if (!trimmedUsername) {
      toast.error("Username is required");
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

    setSaving(true);

    // Create auth user with email-style username (Supabase requires email format)
    const fakeEmail = `${trimmedUsername}@adtruck.driver`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
    });

    if (authError) {
      setSaving(false);
      toast.error(authError.message);
      return;
    }

    if (!authData.user) {
      setSaving(false);
      toast.error("Failed to create user account");
      return;
    }

    // Create profile record
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        role: "driver",
        username: trimmedUsername,
        display_name: trimmedName,
        email: fakeEmail,
        is_active: true,
      })
      .select("id, display_name")
      .single();

    setSaving(false);

    if (profileError) {
      toast.error(profileError.message);
      return;
    }

    toast.success(`Driver "${profile.display_name}" created`);
    setUsername("");
    setDisplayName("");
    setPassword("");
    onCreated(profile);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
          <DialogDescription>
            Create a new driver account that can be assigned to campaigns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driver-username">Username</Label>
            <Input
              id="driver-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. driver2"
              className="h-10 rounded-xl bg-secondary/50 border-border"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver-display-name">Display Name</Label>
            <Input
              id="driver-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Smith"
              className="h-10 rounded-xl bg-secondary/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver-password">Password</Label>
            <Input
              id="driver-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-10 rounded-xl bg-secondary/50 border-border"
            />
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
              Add Driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
