import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginCard } from "@/components/LoginCard";
import { supabase } from "@/lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleLogin(email: string, password: string) {
    setLoading(true);
    setError(undefined);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("Invalid email or password.");
        return;
      }

      // Role is enforced by ProtectedRoute once the profile loads
      navigate("/admin/campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(email: string) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/login`,
    });
  }

  return (
    <LoginCard
      title="Admin Dashboard"
      subtitle="Sign in to manage campaigns"
      usernameLabel="Email"
      onLogin={handleLogin}
      loading={loading}
      error={error}
      showForgotPassword
      onForgotPassword={handleForgotPassword}
    />
  );
}
