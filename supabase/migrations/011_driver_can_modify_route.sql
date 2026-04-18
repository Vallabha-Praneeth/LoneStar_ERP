-- Per-campaign permission: does the driver get up/down reorder + Skip controls?
-- Default false so existing campaigns lock the route order.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS driver_can_modify_route boolean NOT NULL DEFAULT false;
