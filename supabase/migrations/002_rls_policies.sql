-- 002_rls_policies.sql
-- AdTruck / LoneStar ERP — Row Level Security
-- Deny-by-default: enable RLS first, then add policies

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
-- Admin: read all profiles
CREATE POLICY "admin_read_profiles" ON profiles
  FOR SELECT USING (get_my_role() = 'admin');

-- Admin: update profiles
CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE USING (get_my_role() = 'admin');

-- Driver/Client: read own profile only
CREATE POLICY "own_profile_read" ON profiles
  FOR SELECT USING (id = auth.uid());

-- ============================================================
-- CLIENTS
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_all_clients" ON clients
  FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- CAMPAIGNS
-- ============================================================
-- Admin: full CRUD
CREATE POLICY "admin_all_campaigns" ON campaigns
  FOR ALL USING (get_my_role() = 'admin');

-- Driver: read assigned campaigns only
CREATE POLICY "driver_read_campaigns" ON campaigns
  FOR SELECT USING (
    get_my_role() = 'driver' AND driver_profile_id = auth.uid()
  );

-- Client: read own org's campaigns
CREATE POLICY "client_read_campaigns" ON campaigns
  FOR SELECT USING (
    get_my_role() = 'client' AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.client_id = campaigns.client_id
    )
  );

-- ============================================================
-- DRIVER SHIFTS
-- ============================================================
-- Admin: full access
CREATE POLICY "admin_all_shifts" ON driver_shifts
  FOR ALL USING (get_my_role() = 'admin');

-- Driver: create/update own shifts on assigned campaigns
CREATE POLICY "driver_manage_own_shifts" ON driver_shifts
  FOR ALL USING (
    get_my_role() = 'driver' AND driver_profile_id = auth.uid()
  ) WITH CHECK (
    get_my_role() = 'driver' AND driver_profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = driver_shifts.campaign_id
        AND c.driver_profile_id = auth.uid()
    )
  );

-- Client: read shifts for their campaigns
CREATE POLICY "client_read_shifts" ON driver_shifts
  FOR SELECT USING (
    get_my_role() = 'client' AND
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.client_id = c.client_id
      WHERE c.id = driver_shifts.campaign_id
        AND p.id = auth.uid()
    )
  );

-- ============================================================
-- CAMPAIGN PHOTOS
-- ============================================================
-- Admin: full access (including setting status, reviewed_by, reviewed_at)
CREATE POLICY "admin_all_photos" ON campaign_photos
  FOR ALL USING (get_my_role() = 'admin');

-- Driver: insert photos for assigned campaigns
CREATE POLICY "driver_insert_photos" ON campaign_photos
  FOR INSERT WITH CHECK (
    get_my_role() = 'driver' AND uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_photos.campaign_id
        AND c.driver_profile_id = auth.uid()
    )
  );

-- Driver: read own photos
CREATE POLICY "driver_read_own_photos" ON campaign_photos
  FOR SELECT USING (
    get_my_role() = 'driver' AND uploaded_by = auth.uid()
  );

-- Client: read approved photos for their campaigns only
CREATE POLICY "client_read_approved_photos" ON campaign_photos
  FOR SELECT USING (
    get_my_role() = 'client' AND
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN profiles p ON p.client_id = c.client_id
      WHERE c.id = campaign_photos.campaign_id
        AND p.id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: campaign-photos bucket (apply via Supabase dashboard or CLI)
-- ============================================================
-- Note: Storage policies are created separately via:
--   supabase storage policies or the dashboard.
-- The SQL below is for reference:
--
-- Driver upload:
-- CREATE POLICY "driver_upload_own_campaign"
-- ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'campaign-photos' AND
--   (storage.foldername(name))[1] = 'campaigns' AND
--   EXISTS (
--     SELECT 1 FROM driver_shifts ds
--     WHERE ds.driver_profile_id = auth.uid()
--       AND ds.campaign_id::text = (storage.foldername(name))[2]
--       AND ds.ended_at IS NULL
--   )
-- );
