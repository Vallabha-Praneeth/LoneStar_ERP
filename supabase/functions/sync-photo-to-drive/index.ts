import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getGoogleAccessToken,
  createDriveFolder,
  setFolderPublicRead,
  shareFolderWithUser,
  uploadFileToDrive,
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
    const { campaignId, photoId } = (await req.json()) as {
      campaignId: string;
      photoId: string;
    };

    if (!campaignId || !photoId) {
      return new Response(
        JSON.stringify({ error: "campaignId and photoId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaign + photo
    const { data: campaign, error: campErr } = await adminClient
      .from("campaigns")
      .select("id, title, campaign_date, client_id, drive_folder_id, clients(id, name, drive_folder_id)")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return new Response(
        JSON.stringify({ error: `Campaign not found: ${campErr?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: photo, error: photoErr } = await adminClient
      .from("campaign_photos")
      .select("id, storage_path, drive_file_id")
      .eq("id", photoId)
      .single();

    if (photoErr || !photo) {
      return new Response(
        JSON.stringify({ error: `Photo not found: ${photoErr?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Skip if already synced
    if (photo.drive_file_id) {
      return new Response(
        JSON.stringify({ drive_file_id: photo.drive_file_id, message: "Already synced" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SA direct token for folder/permission ops
    const saToken = await getGoogleAccessToken(false);
    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID")!;

    // Ensure campaign has a Drive folder (create on-demand if missing)
    let driveFolderId = campaign.drive_folder_id as string | null;

    if (!driveFolderId) {
      const client = (campaign as Record<string, unknown>).clients as
        | { id: string; name: string; drive_folder_id: string | null }
        | null;

      let clientFolderId: string;
      if (client?.drive_folder_id) {
        clientFolderId = client.drive_folder_id;
      } else {
        const clientFolder = await createDriveFolder(saToken, client?.name || "Unknown Client", rootFolderId);
        clientFolderId = clientFolder.id;
        if (client?.id) {
          await adminClient.from("clients").update({ drive_folder_id: clientFolderId }).eq("id", client.id);
        }
      }

      const dateStr = campaign.campaign_date
        ? String(campaign.campaign_date).substring(0, 10)
        : new Date().toISOString().substring(0, 10);
      const campFolder = await createDriveFolder(saToken, `${campaign.title} - ${dateStr}`, clientFolderId);
      await setFolderPublicRead(saToken, campFolder.id);

      driveFolderId = campFolder.id;
      await adminClient
        .from("campaigns")
        .update({ drive_folder_id: campFolder.id, drive_folder_url: campFolder.webViewLink })
        .eq("id", campaignId);
    }

    // Download photo from Supabase Storage
    const { data: fileData, error: dlErr } = await adminClient.storage
      .from("campaign-photos")
      .download(photo.storage_path);

    if (dlErr || !fileData) {
      return new Response(
        JSON.stringify({ error: `Failed to download photo: ${dlErr?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure impersonated user has write access to the folder
    const impersonateEmail = Deno.env.get("GOOGLE_DRIVE_IMPERSONATE_EMAIL");
    if (impersonateEmail) {
      await shareFolderWithUser(saToken, driveFolderId, impersonateEmail);
    }

    // Impersonated token for file upload (Workspace user has storage quota)
    const uploadToken = await getGoogleAccessToken(true);
    const fileName = photo.storage_path.split("/").pop() || `photo_${photoId}.jpg`;
    const mimeType = fileData.type || "image/jpeg";
    const driveFileId = await uploadFileToDrive(uploadToken, driveFolderId, fileName, fileData, mimeType);

    // Update photo record
    await adminClient
      .from("campaign_photos")
      .update({ drive_file_id: driveFileId })
      .eq("id", photoId);

    return new Response(
      JSON.stringify({ drive_file_id: driveFileId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-photo-to-drive error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
