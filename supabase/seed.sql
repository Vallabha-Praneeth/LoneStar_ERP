-- seed.sql — Stable test data for E2E testing
-- Uses proper UUIDs. These IDs are read-only in tests.
--
-- Pre-requisites (run once in Supabase Auth dashboard → Add user):
--   admin@adtruck.com   UUID: 07b1a667-2738-49a8-b219-589b204d6391
--   driver@adtruck.com  UUID: 5631663f-2ca2-42d8-9408-720f6b2fb3c7
--   client@acme.com     UUID: 005d0d6c-10a0-4ebc-9f14-8e1db308ce67
--
-- After creating auth users, stamp roles into JWT app_metadata:
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--     WHERE id = '07b1a667-2738-49a8-b219-589b204d6391';
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"driver"}'
--     WHERE id = '5631663f-2ca2-42d8-9408-720f6b2fb3c7';
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"client"}'
--     WHERE id = '005d0d6c-10a0-4ebc-9f14-8e1db308ce67';

-- Test client org
INSERT INTO clients (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', true)
ON CONFLICT (id) DO NOTHING;

-- Profiles (insert after auth users exist)
INSERT INTO public.profiles (id, username, role, display_name, client_id)
VALUES
  ('07b1a667-2738-49a8-b219-589b204d6391', 'admin',   'admin',  'Admin User',  NULL),
  ('5631663f-2ca2-42d8-9408-720f6b2fb3c7', 'driver1', 'driver', 'Test Driver', NULL),
  ('005d0d6c-10a0-4ebc-9f14-8e1db308ce67', 'client1', 'client', 'Acme Client', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  username     = EXCLUDED.username,
  role         = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  client_id    = EXCLUDED.client_id;

-- Test campaign (update campaign_date to today before running E2E tests)
INSERT INTO public.campaigns (id, title, campaign_date, route_code, status, client_id, driver_profile_id, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Acme Corp — Summer Launch',
  CURRENT_DATE,
  'ROUTE-001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '5631663f-2ca2-42d8-9408-720f6b2fb3c7',
  '07b1a667-2738-49a8-b219-589b204d6391'
)
ON CONFLICT (id) DO UPDATE SET
  campaign_date     = CURRENT_DATE,
  driver_profile_id = EXCLUDED.driver_profile_id,
  status            = EXCLUDED.status;
