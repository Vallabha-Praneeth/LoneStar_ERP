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
  const [baseDailyWage, setBaseDailyWage] = useState("");
  const [city, setCity] = useState("");
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

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        role: "driver",
        username: trimmedUsername,
        display_name: trimmedName,
        password,
      },
    });

    if (error) {
      setSaving(false);
      toast.error(error.message || "Failed to create driver");
      return;
    }

    if (data?.error) {
      setSaving(false);
      toast.error(data.error);
      return;
    }

    const user = data?.user;
    const userId = user?.id;

    // Create a drivers table row for this profile
    if (userId) {
      const wageNum = parseFloat(baseDailyWage);
      const { error: driverErr } = await supabase.from("drivers").insert({
        profile_id: userId,
        base_daily_wage: !isNaN(wageNum) && wageNum >= 0 ? wageNum : null,
        city: city.trim() || null,
      });
      if (driverErr) {
        // Non-fatal: profile already created, just warn
        console.warn("Failed to create drivers row:", driverErr.message);
      }
    }

    setSaving(false);
    toast.success(`Driver "${user?.display_name ?? trimmedName}" created`);
    setUsername("");
    setDisplayName("");
    setPassword("");
    setBaseDailyWage("");
    setCity("");
    onCreated({ id: userId, display_name: user?.display_name ?? trimmedName });
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driver-wage">Base Daily Wage</Label>
              <Input
                id="driver-wage"
                type="number"
                step="0.01"
                min="0"
                value={baseDailyWage}
                onChange={(e) => setBaseDailyWage(e.target.value)}
                placeholder="0.00 (optional)"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-city">City</Label>
              <Input
                id="driver-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Houston"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
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
