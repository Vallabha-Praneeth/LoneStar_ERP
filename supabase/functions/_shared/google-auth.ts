/**
 * Google Drive helpers for Supabase Edge Functions.
 *
 * Reads a base64-encoded service-account JSON from
 * GOOGLE_SERVICE_ACCOUNT_JSON and exchanges it for an access token
 * using the standard JWT → token flow (RS256 via crypto.subtle).
 */

// ── Types ────────────────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

interface DriveFolder {
  id: string;
  webViewLink: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Strip PEM armor and decode the raw DER bytes. */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN .*-----/, "")
    .replace(/-----END .*-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(lines);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function getServiceAccount(): ServiceAccountKey {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON secret is not set");
  const json = atob(raw);
  return JSON.parse(json) as ServiceAccountKey;
}

// ── Exported helpers ─────────────────────────────────────────────

/**
 * Build a JWT and exchange it for a Google OAuth2 access token
 * scoped to the Drive API.
 *
 * @param impersonate - If true AND GOOGLE_DRIVE_IMPERSONATE_EMAIL is set,
 *   the SA will impersonate that Workspace user (requires DWD).
 *   Use impersonate=true for file uploads (SA has no storage quota).
 *   Use impersonate=false (default) for folder/permission operations.
 */
export async function getGoogleAccessToken(impersonate = false): Promise<string> {
  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);

  const header = base64urlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimObj: Record<string, unknown> = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  if (impersonate) {
    const impersonateEmail = Deno.env.get("GOOGLE_DRIVE_IMPERSONATE_EMAIL");
    if (impersonateEmail) {
      claimObj.sub = impersonateEmail;
    }
  }
  const claim = base64urlEncode(JSON.stringify(claimObj));

  const signingInput = `${header}.${claim}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64url(sig)}`;

  const tokenRes = await fetch(
    sa.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    },
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };
  return access_token;
}

/**
 * Create a folder in Google Drive and return its id + webViewLink.
 */
export async function createDriveFolder(
  token: string,
  name: string,
  parentId: string,
): Promise<DriveFolder> {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive createFolder failed (${res.status}): ${text}`);
  }

  return (await res.json()) as DriveFolder;
}

/**
 * Set a Drive folder/file to "anyone with link can view".
 */
export async function setFolderPublicRead(
  token: string,
  folderId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive setPublicRead failed (${res.status}): ${text}`);
  }
}

/**
 * Grant a user editor access to a Drive folder/file.
 */
export async function shareFolderWithUser(
  token: string,
  folderId: string,
  email: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?sendNotificationEmail=false`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    // Ignore "already has access" errors
    if (!text.includes("already has access")) {
      throw new Error(`Drive shareFolderWithUser failed (${res.status}): ${text}`);
    }
  }
}

/**
 * Upload a file to a Drive folder via resumable upload.
 * Uses resumable upload to avoid SA storage quota issues — the file
 * is stored against the folder owner's quota when the folder is owned
 * by a Workspace user and shared with the SA as Editor.
 */
export async function uploadFileToDrive(
  token: string,
  folderId: string,
  fileName: string,
  blob: Blob,
  mimeType: string,
): Promise<string> {
  // Step 1: Initiate resumable upload
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });

  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(blob.size),
      },
      body: metadata,
    },
  );

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`Drive upload init failed (${initRes.status}): ${text}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Drive upload: no resumable upload URL returned");
  }

  // Step 2: Upload the file content
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(blob.size),
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Drive upload failed (${uploadRes.status}): ${text}`);
  }

  const { id } = (await uploadRes.json()) as { id: string };
  return id;
}
