import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { isRecovery, clearRecovery, profile } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Redirect if user landed here without a recovery session
  useEffect(() => {
    // Give AuthContext a moment to process the PASSWORD_RECOVERY event
    const timeout = setTimeout(() => {
      if (!isRecovery) {
        navigate("/", { replace: true });
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isRecovery, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDone(true);
    clearRecovery();
  }

  function handleContinue() {
    const role = profile?.role;
    if (role === "admin") navigate("/admin/campaigns", { replace: true });
    else if (role === "client") navigate("/client/campaign", { replace: true });
    else if (role === "driver") navigate("/driver/campaign", { replace: true });
    else navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="bg-card rounded-2xl shadow-card p-8 space-y-6 border border-border">
          <div className="flex flex-col items-center gap-2">
            <Logo size="md" showText={false} />
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">
                {done ? "Password Updated" : "Set New Password"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {done
                  ? "Your password has been changed successfully."
                  : "Enter your new password below."}
              </p>
            </div>
          </div>

          {done ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
              </div>
              <Button
                onClick={handleContinue}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                Continue
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-11 rounded-xl bg-secondary/50 border-border pr-10"
                    disabled={loading}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  className="h-11 rounded-xl bg-secondary/50 border-border"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <KeyRound className="w-4 h-4 mr-2" />
                )}
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
