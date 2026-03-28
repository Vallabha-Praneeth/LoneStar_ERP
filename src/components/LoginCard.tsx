import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

interface LoginCardProps {
  title: string;
  subtitle: string;
  onLogin: (username: string, password: string) => void;
  usernameLabel?: string;
  loading?: boolean;
  error?: string;
  showForgotPassword?: boolean;
  onForgotPassword?: (email: string) => Promise<void>;
  footerNote?: string;
}

export function LoginCard({
  title,
  subtitle,
  onLogin,
  usernameLabel = "Username",
  loading = false,
  error,
  showForgotPassword = false,
  onForgotPassword,
  footerNote,
}: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) onLogin(username, password);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {usernameLabel}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`Enter your ${usernameLabel.toLowerCase()}`}
                className="h-11 rounded-xl bg-secondary/50 border-border"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 rounded-xl bg-secondary/50 border-border pr-10"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          {showForgotPassword && !showResetForm && (
            <button
              type="button"
              onClick={() => setShowResetForm(true)}
              className="block w-full text-xs text-center text-primary hover:underline"
            >
              Forgot your password?
            </button>
          )}

          {showResetForm && (
            <div className="space-y-3 border-t border-border pt-4">
              {resetSent ? (
                <p className="text-sm text-success text-center">
                  Password reset email sent. Check your inbox.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter your email to receive a reset link.
                  </p>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-10 rounded-xl bg-secondary/50 border-border"
                    disabled={resetLoading}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-10 rounded-xl text-sm"
                      onClick={() => {
                        setShowResetForm(false);
                        setResetEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm"
                      disabled={!resetEmail || resetLoading}
                      onClick={async () => {
                        setResetLoading(true);
                        try {
                          if (onForgotPassword) {
                            await onForgotPassword(resetEmail);
                          }
                          setResetSent(true);
                        } catch {
                          // Toast is handled by caller if needed;
                          // keep form open so user can retry
                        } finally {
                          setResetLoading(false);
                        }
                      }}
                    >
                      {resetLoading ? "Sending…" : "Send Reset Link"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            {footerNote ?? "Need help? Contact your administrator."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
