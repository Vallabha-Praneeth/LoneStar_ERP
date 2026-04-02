-- Drop deprecated columns from campaigns (all app code now uses normalized tables)
ALTER TABLE public.campaigns
  DROP COLUMN IF EXISTS route_code,
  DROP COLUMN IF EXISTS driver_daily_wage,
  DROP COLUMN IF EXISTS transport_cost,
  DROP COLUMN IF EXISTS other_cost;
