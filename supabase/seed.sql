-- seed.sql — Stable test data for E2E testing
-- Uses proper UUIDs. These IDs are read-only in tests.

-- Test client org
INSERT INTO clients (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', true)
ON CONFLICT (id) DO NOTHING;

-- Note: campaigns and photos cannot be seeded until test users exist.
-- Test users must be created via Supabase Auth (see setup steps below),
-- then profile rows inserted, then campaigns can reference created_by.
--
-- After auth setup, run this to seed a campaign:
--
--   INSERT INTO campaigns (id, title, campaign_date, status, client_id, created_by)
--   VALUES (
--     '00000000-0000-0000-0000-000000000010',
--     'E2E Test Campaign',
--     '2025-06-01',
--     'active',
--     '00000000-0000-0000-0000-000000000001',
--     '<admin-user-uuid>'
--   );
