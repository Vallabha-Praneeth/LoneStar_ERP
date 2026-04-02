-- ============================================================
-- AdTruck ERP — Schema v2 Migration
-- New: drivers, routes, route_stops, cost_types, campaign_costs
-- Alter: driver_shifts (shift_status), campaigns (route_id, client_billed_amount)
-- Backfill: existing data migrated to normalized tables
-- ============================================================

-- ── drivers ─────────────────────────────────────────────────
-- 1:1 extension of profiles for driver-specific fields
CREATE TABLE IF NOT EXISTS public.drivers (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  profile_id              uuid        NOT NULL,
  license_number          text        NULL,
  license_type            text        NULL,
  license_expiry          date        NULL,
  emergency_contact_name  text        NULL,
  emergency_contact_phone text        NULL,
  base_daily_wage         numeric(10,2) NULL,
  city                    text        NULL,
  is_active               boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT drivers_pkey PRIMARY KEY (id),
  CONSTRAINT drivers_profile_id_fkey FOREIGN KEY (profile_id)
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT drivers_profile_id_unique UNIQUE (profile_id),
  CONSTRAINT drivers_base_daily_wage_check
    CHECK (base_daily_wage IS NULL OR base_daily_wage >= 0)
);

CREATE INDEX IF NOT EXISTS drivers_city_idx ON public.drivers (city);
CREATE INDEX IF NOT EXISTS drivers_is_active_idx ON public.drivers (is_active);

-- ── routes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.routes (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  city       text        NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT routes_pkey PRIMARY KEY (id),
  CONSTRAINT routes_name_check CHECK (name <> '')
);

-- Same route name allowed in different cities, but not within the same city
CREATE UNIQUE INDEX IF NOT EXISTS routes_name_city_unique_idx
  ON public.routes (lower(name), COALESCE(lower(city), ''));

CREATE INDEX IF NOT EXISTS routes_city_idx ON public.routes (city);

-- ── route_stops ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.route_stops (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  route_id   uuid        NOT NULL,
  stop_order integer     NOT NULL,
  venue_name text        NOT NULL,
  address    text        NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT route_stops_pkey PRIMARY KEY (id),
  CONSTRAINT route_stops_route_id_fkey FOREIGN KEY (route_id)
    REFERENCES public.routes (id) ON DELETE CASCADE,
  CONSTRAINT route_stops_venue_name_check CHECK (venue_name <> ''),
  CONSTRAINT route_stops_stop_order_check CHECK (stop_order > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS route_stops_route_order_unique_idx
  ON public.route_stops (route_id, stop_order);

CREATE INDEX IF NOT EXISTS route_stops_route_id_idx
  ON public.route_stops (route_id);

-- ── cost_types ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cost_types (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cost_types_pkey PRIMARY KEY (id),
  CONSTRAINT cost_types_name_check CHECK (name <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS cost_types_name_unique_idx
  ON public.cost_types (lower(name));

-- Seed default cost types
INSERT INTO public.cost_types (name) VALUES
  ('Driver Wage'),
  ('Transport'),
  ('Toll'),
  ('Fuel'),
  ('Parking'),
  ('Other')
ON CONFLICT DO NOTHING;

-- ── campaign_costs ──────────────────────────────────────────
-- Internal costs: admin-only visibility
CREATE TABLE IF NOT EXISTS public.campaign_costs (
  id           uuid          NOT NULL DEFAULT gen_random_uuid(),
  campaign_id  uuid          NOT NULL,
  cost_type_id uuid          NOT NULL,
  amount       numeric(10,2) NOT NULL,
  notes        text          NULL,
  created_at   timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT campaign_costs_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_costs_campaign_id_fkey FOREIGN KEY (campaign_id)
    REFERENCES public.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_costs_cost_type_id_fkey FOREIGN KEY (cost_type_id)
    REFERENCES public.cost_types (id) ON DELETE RESTRICT,
  CONSTRAINT campaign_costs_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS campaign_costs_campaign_id_idx
  ON public.campaign_costs (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_costs_cost_type_id_idx
  ON public.campaign_costs (cost_type_id);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- ── driver_shifts: add shift_status ─────────────────────────
ALTER TABLE public.driver_shifts
  ADD COLUMN IF NOT EXISTS shift_status text NOT NULL DEFAULT 'active';

-- Backfill shift_status BEFORE creating unique index (critical ordering)
UPDATE public.driver_shifts
SET shift_status = 'completed'
WHERE ended_at IS NOT NULL AND shift_status = 'active';

ALTER TABLE public.driver_shifts
  ADD CONSTRAINT driver_shifts_shift_status_check
  CHECK (shift_status IN ('scheduled', 'active', 'completed', 'no_show', 'cancelled'));

-- Recreate the active-shift unique index to use shift_status instead of ended_at
DROP INDEX IF EXISTS driver_shifts_active_shift_idx;
CREATE UNIQUE INDEX driver_shifts_active_shift_idx
  ON public.driver_shifts (driver_profile_id)
  WHERE shift_status = 'active';

-- ── campaigns: add route_id + client_billed_amount ──────────
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS route_id uuid NULL,
  ADD COLUMN IF NOT EXISTS client_billed_amount numeric(10,2) NULL;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_route_id_fkey FOREIGN KEY (route_id)
    REFERENCES public.routes (id) ON DELETE SET NULL;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_client_billed_amount_check
  CHECK (client_billed_amount IS NULL OR client_billed_amount >= 0);

CREATE INDEX IF NOT EXISTS campaigns_route_id_idx ON public.campaigns (route_id);

-- Deprecation comments on old columns (kept for backward compat during transition)
COMMENT ON COLUMN public.campaigns.route_code IS 'DEPRECATED: Use route_id FK instead';
COMMENT ON COLUMN public.campaigns.driver_daily_wage IS 'DEPRECATED: Use campaign_costs table';
COMMENT ON COLUMN public.campaigns.transport_cost IS 'DEPRECATED: Use campaign_costs table';
COMMENT ON COLUMN public.campaigns.other_cost IS 'DEPRECATED: Use campaign_costs table';

-- ============================================================
-- TRIGGERS (reuse existing set_updated_at function)
-- ============================================================

CREATE OR REPLACE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DATA MIGRATION (backfill)
-- ============================================================

-- 1. Create drivers rows for all existing driver profiles
INSERT INTO public.drivers (profile_id, is_active)
SELECT id, is_active
FROM public.profiles
WHERE role = 'driver'
ON CONFLICT (profile_id) DO NOTHING;

-- 2. shift_status backfill already done above (before unique index creation)

-- 3. Create routes from distinct route_code values and link campaigns
INSERT INTO public.routes (id, name)
SELECT gen_random_uuid(), route_code
FROM (SELECT DISTINCT route_code FROM public.campaigns WHERE route_code IS NOT NULL AND route_code <> '') t
ON CONFLICT DO NOTHING;

UPDATE public.campaigns c
SET route_id = r.id
FROM public.routes r
WHERE c.route_code IS NOT NULL AND c.route_code = r.name;

-- 4. Backfill campaign_costs from flat cost columns
-- Driver Wage
INSERT INTO public.campaign_costs (campaign_id, cost_type_id, amount)
SELECT c.id, ct.id, c.driver_daily_wage
FROM public.campaigns c
CROSS JOIN public.cost_types ct
WHERE ct.name = 'Driver Wage'
  AND c.driver_daily_wage IS NOT NULL
  AND c.driver_daily_wage > 0;

-- Transport
INSERT INTO public.campaign_costs (campaign_id, cost_type_id, amount)
SELECT c.id, ct.id, c.transport_cost
FROM public.campaigns c
CROSS JOIN public.cost_types ct
WHERE ct.name = 'Transport'
  AND c.transport_cost IS NOT NULL
  AND c.transport_cost > 0;

-- Other
INSERT INTO public.campaign_costs (campaign_id, cost_type_id, amount)
SELECT c.id, ct.id, c.other_cost
FROM public.campaigns c
CROSS JOIN public.cost_types ct
WHERE ct.name = 'Other'
  AND c.other_cost IS NOT NULL
  AND c.other_cost > 0;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.drivers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_costs ENABLE ROW LEVEL SECURITY;

-- ── drivers RLS ─────────────────────────────────────────────
-- Admin: full access
CREATE POLICY "drivers: admin all"
  ON public.drivers FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read own record only
CREATE POLICY "drivers: driver read own"
  ON public.drivers FOR SELECT
  USING (
    profile_id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
  );

-- ── routes RLS ──────────────────────────────────────────────
-- Admin: full CRUD
CREATE POLICY "routes: admin all"
  ON public.routes FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read only
CREATE POLICY "routes: driver read"
  ON public.routes FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'driver');

-- Client: read only
CREATE POLICY "routes: client read"
  ON public.routes FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client');

-- ── route_stops RLS ─────────────────────────────────────────
-- Admin: full CRUD
CREATE POLICY "route_stops: admin all"
  ON public.route_stops FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read only
CREATE POLICY "route_stops: driver read"
  ON public.route_stops FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'driver');

-- Client: read only
CREATE POLICY "route_stops: client read"
  ON public.route_stops FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client');

-- ── cost_types RLS ──────────────────────────────────────────
-- Admin: full CRUD (internal reference data)
CREATE POLICY "cost_types: admin all"
  ON public.cost_types FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No driver or client access to cost_types

-- ── campaign_costs RLS ──────────────────────────────────────
-- Admin: full CRUD
CREATE POLICY "campaign_costs: admin all"
  ON public.campaign_costs FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read own campaign's "Driver Wage" cost only
CREATE POLICY "campaign_costs: driver read own wage"
  ON public.campaign_costs FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_costs.campaign_id
        AND c.driver_profile_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.cost_types ct
      WHERE ct.id = campaign_costs.cost_type_id
        AND ct.name = 'Driver Wage'
    )
  );

-- No client access to campaign_costs (clients see client_billed_amount on campaigns)
-- ============================================================
