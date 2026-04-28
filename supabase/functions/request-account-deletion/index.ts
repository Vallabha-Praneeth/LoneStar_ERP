import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Soft-delete with anonymization. We can't hard-delete the auth user because
// public.driver_shifts.driver_profile_id is ON DELETE RESTRICT (and
// public.profiles.id cascades from auth.users), so removing the auth row
// would fail any time a driver has shifts. Instead we strip identifying
// fields and flip is_active=false; the client login gate enforces sign-out.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
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
    if (callerRole === "admin") {
      return new Response(
        JSON.stringify({
          error:
            "Admin accounts cannot self-delete. Contact another admin to deactivate your account.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existing, error: fetchError } = await adminClient
      .from("profiles")
      .select("id, is_active")
      .eq("id", caller.id)
      .single();

    if (fetchError || !existing) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotent: already-deleted accounts return success without re-anonymizing.
    if (existing.is_active === false) {
      return new Response(
        JSON.stringify({ success: true, already_deleted: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // username has a UNIQUE index on lower(username); deleted_<uuid> is
    // unique by construction. display_name is NOT NULL so we use a sentinel.
    // email is nullable, so NULL is fine.
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        email: null,
        display_name: "[deleted]",
        username: `deleted_${caller.id}`,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caller.id);

    if (updateError) {
      console.error("Profile anonymization failed:", updateError.message);
      return new Response(
        JSON.stringify({ error: `Account deletion failed: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Best-effort server-side session revocation. Failure here is non-fatal —
    // the client signs out locally and the login gate blocks future hydrate.
    const { error: signOutError } = await adminClient.auth.admin.signOut(jwt);
    if (signOutError) {
      console.error("Server-side sign-out failed (non-fatal):", signOutError.message);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
