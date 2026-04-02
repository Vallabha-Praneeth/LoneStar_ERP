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
