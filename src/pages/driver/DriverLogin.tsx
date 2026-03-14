import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginCard } from "@/components/LoginCard";
import { supabase } from "@/lib/supabase";

export default function DriverLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleLogin(username: string, password: string) {
    setLoading(true);
    setError(undefined);

    try {
      // Look up the driver's email by username via a public RPC
      const { data: email, error: rpcError } = await supabase.rpc(
        "get_auth_email_by_username",
        { p_username: username, p_role: "driver" }
      );

      if (rpcError || !email) {
        setError("Invalid username or password.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Invalid username or password.");
        return;
      }

      navigate("/driver/campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginCard
      title="Driver Login"
      subtitle="Sign in to access your campaign"
      usernameLabel="Username"
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
}
