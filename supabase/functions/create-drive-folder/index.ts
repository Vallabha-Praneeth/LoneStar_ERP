import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getGoogleAccessToken,
  createDriveFolder,
  setFolderPublicRead,
  shareFolderWithUser,
} from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Verify caller is admin ──────────────────────────────────
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
    const { data: { user: caller }, error: callerError } =
      await callerClient.auth.getUser(jwt);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (caller.app_metadata?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can create Drive folders" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Parse input ─────────────────────────────────────────────
    const { campaignId } = (await req.json()) as { campaignId: string };
    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Fetch campaign + client ─────────────────────────────────
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: campaign, error: campError } = await adminClient
      .from("campaigns")
      .select("id, title, campaign_date, client_id, drive_folder_id, clients(id, name, drive_folder_id)")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return new Response(
        JSON.stringify({ error: `Campaign not found: ${campError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Skip if already has a Drive folder
    if (campaign.drive_folder_id) {
      return new Response(
        JSON.stringify({
          drive_folder_id: campaign.drive_folder_id,
          drive_folder_url: (campaign as Record<string, unknown>).drive_folder_url,
          message: "Drive folder already exists",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Google Drive operations ─────────────────────────────────
    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID")!;
    const token = await getGoogleAccessToken();

    // 1. Ensure client folder exists
    const client = (campaign as Record<string, unknown>).clients as
      | { id: string; name: string; drive_folder_id: string | null }
      | null;

    let clientFolderId: string;

    if (client?.drive_folder_id) {
      clientFolderId = client.drive_folder_id;
    } else {
      const clientName = client?.name || "Unknown Client";
      const clientFolder = await createDriveFolder(token, clientName, rootFolderId);
      clientFolderId = clientFolder.id;

      // Store client folder ID
      if (client?.id) {
        await adminClient
          .from("clients")
          .update({ drive_folder_id: clientFolderId })
          .eq("id", client.id);
      }
    }

    // 2. Create campaign subfolder
    const dateStr = campaign.campaign_date
      ? String(campaign.campaign_date).substring(0, 10)
      : new Date().toISOString().substring(0, 10);
    const folderName = `${campaign.title} - ${dateStr}`;

    const campFolder = await createDriveFolder(token, folderName, clientFolderId);

    // 3. Set folder to "anyone with link can view"
    await setFolderPublicRead(token, campFolder.id);

    // 4. Share with impersonated user for future uploads
    const impersonateEmail = Deno.env.get("GOOGLE_DRIVE_IMPERSONATE_EMAIL");
    if (impersonateEmail) {
      await shareFolderWithUser(token, campFolder.id, impersonateEmail);
    }

    // 5. Update campaign with Drive info
    const { error: updateError } = await adminClient
      .from("campaigns")
      .update({
        drive_folder_id: campFolder.id,
        drive_folder_url: campFolder.webViewLink,
      })
      .eq("id", campaignId);

    if (updateError) {
      console.error("Failed to update campaign:", updateError.message);
    }

    return new Response(
      JSON.stringify({
        drive_folder_id: campFolder.id,
        drive_folder_url: campFolder.webViewLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
