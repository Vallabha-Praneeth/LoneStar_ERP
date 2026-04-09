import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { campaignId, photoId } = await req.json();
    if (!campaignId || !photoId) {
      return new Response(
        JSON.stringify({ error: "campaignId and photoId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get campaign → client → phone_number
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("title, client_id, drive_folder_url, clients(name, phone_number)")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      console.error("Campaign not found:", campErr);
      return new Response(
        JSON.stringify({ skipped: true, reason: "campaign not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const client = campaign.clients as { name: string; phone_number: string | null } | null;
    if (!client?.phone_number) {
      console.log("No phone number for client — skipping WhatsApp");
      return new Response(
        JSON.stringify({ skipped: true, reason: "no phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Get photo storage path and generate signed URL
    const { data: photo, error: photoErr } = await supabase
      .from("campaign_photos")
      .select("storage_path, note")
      .eq("id", photoId)
      .single();

    if (photoErr || !photo) {
      console.error("Photo not found:", photoErr);
      return new Response(
        JSON.stringify({ skipped: true, reason: "photo not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: signedUrlData } = await supabase.storage
      .from("campaign-photos")
      .createSignedUrl(photo.storage_path, 7 * 24 * 60 * 60); // 7 days

    const photoUrl = signedUrlData?.signedUrl;
    if (!photoUrl) {
      console.error("Failed to generate signed URL");
      return new Response(
        JSON.stringify({ skipped: true, reason: "signed URL failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Send WhatsApp via Meta Cloud API
    const accessToken = Deno.env.get("WHATSAPP_CLOUD_ACCESS_TOKEN")!;
    const phoneNumberId = Deno.env.get("WHATSAPP_CLOUD_PHONE_NUMBER_ID")!;
    const graphVersion = Deno.env.get("WHATSAPP_CLOUD_GRAPH_VERSION") || "v22.0";
    const templateName = Deno.env.get("WHATSAPP_CLOUD_TEMPLATE_NAME") || "campaign_photo_v2";
    const templateLang = Deno.env.get("WHATSAPP_CLOUD_TEMPLATE_LANGUAGE") || "en";

    // Strip leading + from phone number for WhatsApp API (expects digits only)
    const recipientPhone = client.phone_number.replace(/^\+/, "");

    const graphUrl = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

    // Build note text — empty string if no note
    const noteText = photo.note ? `Driver note: ${photo.note}` : "No additional notes";

    // Template: TEXT header "Campaign Photo Update", body with {{1}} {{2}}, footer
    const templatePayload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: campaign.title },
              { type: "text", text: noteText },
            ],
          },
        ],
      },
    };

    console.log("Sending campaign_photo template to", recipientPhone);

    const res = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("WhatsApp template error:", res.status, errBody);
      return new Response(
        JSON.stringify({ sent: false, error: "WhatsApp send failed", details: errBody }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const templateMessageId = data.messages?.[0]?.id;
    console.log("Template message sent:", templateMessageId);

    // Follow up with the actual photo as a media message (within 24h conversation window)
    const photoPayload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "image",
      image: {
        link: photoUrl,
        caption: `📸 ${campaign.title}${photo.note ? `\n${noteText}` : ""}${campaign.drive_folder_url ? `\n\nView all campaign photos: ${campaign.drive_folder_url}` : ""}`,
      },
    };

    const photoRes = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(photoPayload),
    });

    let photoMessageId = null;
    if (photoRes.ok) {
      const photoData = await photoRes.json();
      photoMessageId = photoData.messages?.[0]?.id;
      console.log("Photo message sent:", photoMessageId);
    } else {
      console.error("Photo message failed:", photoRes.status, await photoRes.text());
    }

    return new Response(
      JSON.stringify({ sent: true, templateMessageId, photoMessageId }),
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
