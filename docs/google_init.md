# Google Drive Integration -- Sprint Plan

> **Project:** AdTruck ERP (LoneStar_ERP)
> **Created:** 2026-04-01
> **Status:** All Sprints Complete (0-6)
> **Approach:** Small sprints -- build, test, then move on

---

## Integration Checklist

Auto-updates after each sprint is tested and passes.

| # | Task | Sprint | Status |
|---|------|--------|--------|
| 1 | Google Cloud project + Service Account + Drive API enabled | Sprint 0 | [x] |
| 2 | Root folder "AdTruck Campaigns" created & shared with SA | Sprint 0 | [x] |
| 3 | Supabase secrets set (SA JSON + root folder ID) | Sprint 0 | [x] |
| 4 | Migration 004: drive columns on campaigns, clients, campaign_photos | Sprint 1 | [x] |
| 5 | `_shared/google-auth.ts` -- JWT signing + token exchange | Sprint 2 | [x] |
| 6 | `create-drive-folder` edge function | Sprint 2 | [x] |
| 7 | Test: manually invoke edge function, verify folder appears in Drive | Sprint 2 | [x] |
| 8 | Admin campaign creation hooks into `create-drive-folder` | Sprint 3 | [x] |
| 9 | `drive_folder_url` shown on AdminCampaignDetail page | Sprint 3 | [x] |
| 10 | Test: create campaign in admin UI, verify Drive folder + link visible | Sprint 3 | [x] |
| 11 | `sync-photo-to-drive` edge function | Sprint 4 | [x] |
| 12 | Web driver upload triggers `sync-photo-to-drive` | Sprint 4 | [x] |
| 13 | Native driver upload triggers `sync-photo-to-drive` | Sprint 4 | [x] |
| 14 | Test: upload photo from both web + native, verify file appears in Drive | Sprint 4 | [x] |
| 15 | WhatsApp message includes Drive folder link | Sprint 5 | [x] |
| 16 | Client campaign view shows Drive folder link | Sprint 5 | [x] |
| 17 | Test: full flow -- create campaign, upload photo, client sees link + WhatsApp | Sprint 5 | [x] |
| 18 | Backfill: create Drive folders for existing campaigns | Sprint 6 | [x] |
| 19 | Test: verify all existing campaigns have Drive folders | Sprint 6 | [x] |
| 20 | Enable DWD for photo uploads (SA has no storage quota) | Sprint 6 | [x] |
| 21 | Backfill: sync existing photos to Drive | Sprint 6 | [x] |

---

## Sprint 0 -- Google Cloud Setup (manual, no code)

**Goal:** Get Google Cloud ready so Edge Functions can talk to Drive API.

### Steps
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project "AdTruck ERP" (or use existing)
3. Enable **Google Drive API** (APIs & Services > Library > search "Drive")
4. Create **Service Account**:
   - Name: `adtruck-drive`
   - Role: none needed (it accesses Drive via folder sharing, not org-wide)
   - Create JSON key > download it
5. In Google Drive (web):
   - Create folder **"AdTruck Campaigns"** at root
   - Right-click > Share > add the service account email (`adtruck-drive@xxx.iam.gserviceaccount.com`) as **Editor**
   - Copy the folder ID from the URL: `drive.google.com/drive/folders/{THIS_IS_THE_ID}`
6. Set Supabase secrets:
   ```bash
   cd /Users/praneeth/LoneStar_ERP/adtruck-proof-main
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(base64 < /path/to/service-account-key.json)"
   supabase secrets set GOOGLE_DRIVE_ROOT_FOLDER_ID="the-folder-id-here"
   ```

### Test
- Verify secrets are set: `supabase secrets list`
- Verify Drive folder is accessible by sharing link

### Exit Criteria
- [ ] Google Cloud project exists with Drive API enabled
- [ ] Service Account JSON key downloaded
- [ ] Root folder shared with Service Account
- [ ] Supabase secrets set

---

## Sprint 1 -- Database Migration

**Goal:** Add Drive-related columns to the database.

### File to Create
`supabase/migrations/004_google_drive_columns.sql`

```sql
-- Google Drive integration columns

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS drive_folder_id text,
  ADD COLUMN IF NOT EXISTS drive_folder_url text;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS drive_folder_id text;

ALTER TABLE public.campaign_photos
  ADD COLUMN IF NOT EXISTS drive_file_id text;

COMMENT ON COLUMN public.campaigns.drive_folder_id IS 'Google Drive folder ID for this campaign';
COMMENT ON COLUMN public.campaigns.drive_folder_url IS 'Shareable Google Drive folder URL';
COMMENT ON COLUMN public.clients.drive_folder_id IS 'Google Drive parent folder ID for this client';
COMMENT ON COLUMN public.campaign_photos.drive_file_id IS 'Google Drive file ID after sync';
```

### Steps
1. Create the migration file
2. Run: `supabase db push` (or apply via dashboard SQL editor)
3. Verify columns exist in Supabase Table Editor

### Test
- Open Supabase Table Editor > campaigns table > verify `drive_folder_id`, `drive_folder_url` columns
- Open clients table > verify `drive_folder_id` column
- Open campaign_photos table > verify `drive_file_id` column

### Exit Criteria
- [ ] All 4 new columns exist in production DB
- [ ] Existing data is unaffected (all new columns are nullable)

---

## Sprint 2 -- Shared Auth Helper + `create-drive-folder` Edge Function

**Goal:** Service account auth works, and we can create Drive folders programmatically.

### Files to Create

**1. `supabase/functions/_shared/google-auth.ts`**
- Decode base64 service account JSON from `GOOGLE_SERVICE_ACCOUNT_JSON` env var
- Build a JWT assertion (iss: client_email, scope: drive, aud: token endpoint)
- Sign with RS256 using `crypto.subtle` (import PEM private key as PKCS#8)
- Exchange JWT for access token via `POST https://oauth2.googleapis.com/token`
- Export helpers:
  - `getGoogleAccessToken()` -- returns Bearer token string
  - `createDriveFolder(token, name, parentId)` -- POST to Drive API, returns `{ id, webViewLink }`
  - `setFolderPublicRead(token, folderId)` -- sets "anyone with link can view"
  - `uploadFileToDrive(token, folderId, fileName, blob, mimeType)` -- multipart upload

**2. `supabase/functions/create-drive-folder/index.ts`**
- Validates caller is admin (JWT check)
- Receives `{ campaignId }`
- Fetches campaign + client from DB
- If `clients.drive_folder_id` is null: create client folder under root, store ID
- Create campaign subfolder: `{title} - {YYYY-MM-DD}` under client folder
- Set folder to "anyone with link can view"
- Update `campaigns.drive_folder_id` and `campaigns.drive_folder_url`
- Return `{ drive_folder_id, drive_folder_url }`

### Test
```bash
# Deploy the function
supabase functions deploy create-drive-folder

# Invoke manually with an existing campaign ID
curl -X POST \
  'https://cleooniqbagrpewlkans.supabase.co/functions/v1/create-drive-folder' \
  -H 'Authorization: Bearer <ADMIN_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"campaignId": "<existing-campaign-id>"}'
```

- Verify in Google Drive: client folder + campaign subfolder exist
- Verify in DB: `campaigns.drive_folder_url` is populated
- Open the Drive link in browser: folder is accessible

### Exit Criteria
- [ ] `getGoogleAccessToken()` returns a valid token
- [ ] `create-drive-folder` creates the correct folder hierarchy
- [ ] Folder is publicly viewable via link
- [ ] DB columns updated with folder ID + URL

---

## Sprint 3 -- Admin UI Integration

**Goal:** Campaign creation auto-creates Drive folder. Admin can see the Drive link.

### Files to Modify

**1. `src/pages/admin/AdminCreateCampaign.tsx`**
- In `mutation.onSuccess`: add fire-and-forget call to `create-drive-folder`
```typescript
supabase.functions
  .invoke("create-drive-folder", { body: { campaignId: newId } })
  .catch(() => {});
```

**2. `src/pages/admin/AdminCampaignDetail.tsx`**
- Add `drive_folder_url` to the campaign select query
- Show a clickable "Open Google Drive Folder" link with external link icon
- Show a fallback "Create Drive Folder" button if `drive_folder_url` is null

### Test
1. Open admin app > Create a new campaign
2. Navigate to campaign detail page
3. Verify "Open Google Drive Folder" link appears (may take a few seconds)
4. Click the link > verify it opens the correct Drive folder
5. Check Drive: folder name matches `{Campaign Title} - {Date}`

### Exit Criteria
- [ ] New campaigns auto-create a Drive folder
- [ ] Admin detail page shows Drive folder link
- [ ] Link opens correct folder in new tab

---

## Sprint 4 -- Photo Upload to Drive

**Goal:** Photos uploaded by drivers appear in the campaign's Drive folder.

### Files to Create

**1. `supabase/functions/sync-photo-to-drive/index.ts`**
- Receives `{ campaignId, photoId }`
- Fetches campaign's `drive_folder_id` (if null, creates folder as fallback)
- Downloads photo from Supabase Storage using service role
- Uploads to Drive folder via multipart upload
- Updates `campaign_photos.drive_file_id`

### Files to Modify

**2. `src/pages/driver/DriverUpload.tsx` (web)**
- In `uploadMutation.onSuccess`: add fire-and-forget call to `sync-photo-to-drive`

**3. `adtruck-driver-native/src/features/driver/upload-screen.tsx` (native)**
- Same fire-and-forget call to `sync-photo-to-drive` after upload success

### Test
1. Deploy `sync-photo-to-drive`: `supabase functions deploy sync-photo-to-drive`
2. Log in as driver on web > upload a photo
3. Check Google Drive > campaign folder > photo appears
4. Log in as driver on native (Android/iOS) > upload a photo
5. Check Google Drive > second photo appears
6. Check DB: `campaign_photos.drive_file_id` is populated for both

### Exit Criteria
- [ ] Web upload syncs photo to Drive
- [ ] Native upload syncs photo to Drive
- [ ] Photos appear with correct filenames in Drive folder
- [ ] `drive_file_id` stored in DB

---

## Sprint 5 -- WhatsApp + Client UI

**Goal:** WhatsApp messages include the Drive link. Client portal shows it.

### Files to Modify

**1. `supabase/functions/send-whatsapp-photo/index.ts`**
- Add `drive_folder_url` to the campaign query
- Append Drive link to the WhatsApp message body:
  `"View all campaign photos: {drive_folder_url}"`

**2. `src/pages/client/ClientCampaignView.tsx`**
- Add `drive_folder_url` to the campaign fetch query
- Show a prominent "View in Google Drive" button/link in the campaign header

### Test
1. Upload a photo as driver (triggers WhatsApp)
2. Check WhatsApp message received by client: should include Drive link
3. Log in as client on web > open campaign > verify Drive link is visible
4. Click the Drive link > opens correct folder with all photos

### Exit Criteria
- [ ] WhatsApp message includes Drive folder link
- [ ] Client portal shows Drive folder link
- [ ] Full flow works: create campaign > upload photos > client gets link

---

## Sprint 6 -- Backfill + Cleanup

**Goal:** Existing campaigns get Drive folders. Edge cases handled.

### Steps
1. Write a one-time script (or admin button) to iterate existing campaigns and invoke `create-drive-folder` for each
2. For campaigns that already have photos, invoke `sync-photo-to-drive` for each photo
3. Add error handling: retry logic in edge functions for transient Google API failures
4. Add a "Retry Drive Sync" button on admin photo management for photos where `drive_file_id` is null

### Test
1. Run backfill for all existing campaigns
2. Verify every campaign has a `drive_folder_url`
3. Verify every photo has a `drive_file_id`
4. Open a few Drive folders > photos are all there

### Exit Criteria
- [ ] All existing campaigns have Drive folders
- [ ] All existing photos are synced to Drive
- [ ] No orphaned data

---

## Architecture Diagram

```
                    ADMIN APP                          GOOGLE DRIVE
                   ┌──────────┐                     ┌──────────────┐
                   │  Create   │──fire & forget──>  │ AdTruck      │
                   │ Campaign  │   (edge fn)        │ Campaigns/   │
                   └──────────┘                     │  Client X/   │
                                                    │   Campaign/  │
   DRIVER APP              SUPABASE                 │    photo.jpg │
  ┌──────────┐         ┌──────────────┐             └──────┬───────┘
  │  Upload   │──────> │   Storage    │──edge fn──>        │
  │  Photo    │        │  (primary)   │  sync-to-drive     │
  └──────────┘        └──────────────┘                     │
                            │                              │
                     ┌──────┴───────┐                      │
                     │  WhatsApp    │    includes           │
                     │  Edge Fn     │────Drive link────>  CLIENT
                     └──────────────┘                   (phone)
```

---

## Notes

- **Existing flows are NOT removed.** Individual WhatsApp photo sends continue as-is. Drive is additive.
- **All Drive ops are server-side** (Edge Functions). No Google credentials on client devices.
- **Dual-write:** Supabase Storage = source of truth. Drive = sharing layer.
- **Race condition handled:** If driver uploads before folder exists, `sync-photo-to-drive` creates the folder on-demand.
