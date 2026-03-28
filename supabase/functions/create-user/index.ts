import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  role: "driver" | "client";
  username: string;
  display_name: string;
  password: string;
  email?: string;
  client_id?: string;
}

function validate(body: CreateUserPayload): string | null {
  if (!body.role || !["driver", "client"].includes(body.role)) {
    return "role must be 'driver' or 'client'";
  }
  if (!body.username || body.username.trim().length === 0) {
    return "username is required";
  }
  if (!body.display_name || body.display_name.trim().length === 0) {
    return "display_name is required";
  }
  if (!body.password || body.password.length < 6) {
    return "password must be at least 6 characters";
  }
  if (body.role === "client") {
    if (!body.email || body.email.trim().length === 0) {
      return "email is required for client users";
    }
    if (!body.client_id || body.client_id.trim().length === 0) {
      return "client_id is required for client users";
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Verify caller is admin ────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Extract JWT and verify caller's role
    const jwt = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, supabaseAnon);
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(jwt);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Parse and validate input ──────────────────────────────
    const body = (await req.json()) as CreateUserPayload;
    const validationError = validate(body);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const username = body.username.trim();
    const displayName = body.display_name.trim();
    const role = body.role;

    // For drivers: use fake email if no real email provided
    // For clients: real email is required (validated above)
    const email = role === "driver"
      ? (body.email?.trim() || `${username}@adtruck.driver`)
      : body.email!.trim();

    // ── Create auth user with service role ────────────────────
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      app_metadata: { role },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authData.user.id;

    // ── Insert profile ────────────────────────────────────────
    const profilePayload: Record<string, unknown> = {
      id: userId,
      role,
      username,
      display_name: displayName,
      email,
      is_active: true,
    };

    if (role === "client" && body.client_id) {
      profilePayload.client_id = body.client_id.trim();
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .insert(profilePayload)
      .select("id, display_name, username, role")
      .single();

    if (profileError) {
      // ── Rollback: delete the auth user ────────────────────
      console.error("Profile insert failed, rolling back auth user:", profileError.message);
      await adminClient.auth.admin.deleteUser(userId);

      return new Response(
        JSON.stringify({ error: `Profile creation failed: ${profileError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ user: profile }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
