-- ============================================================
-- AdTruck Campaign Proof App — Initial Schema
-- Run this entire file in the Supabase SQL editor.
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        NOT NULL,
  role            text        NOT NULL,
  username        text        NOT NULL,
  display_name    text        NOT NULL,
  email           text        NULL,
  client_id       uuid        NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'driver', 'client'))
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username));

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_client_id_idx ON public.profiles (client_id);

-- ── clients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_name_check CHECK (name <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_name_lower_idx
  ON public.clients (lower(name));

-- Add foreign key from profiles to clients (now that clients exists)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients (id) ON DELETE SET NULL;

-- ── campaigns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  title                 text        NOT NULL,
  campaign_date         date        NOT NULL,
  route_code            text        NULL,
  status                text        NOT NULL DEFAULT 'draft',
  client_id             uuid        NOT NULL,
  driver_profile_id     uuid        NULL,
  internal_notes        text        NULL,
  driver_daily_wage     numeric(10,2) NULL,
  transport_cost        numeric(10,2) NULL,
  other_cost            numeric(10,2) NULL,
  created_by            uuid        NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT campaigns_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients (id) ON DELETE RESTRICT,
  CONSTRAINT campaigns_driver_profile_id_fkey
    FOREIGN KEY (driver_profile_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT campaigns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT campaigns_status_check
    CHECK (status IN ('draft', 'pending', 'active', 'completed')),
  CONSTRAINT campaigns_title_check CHECK (title <> ''),
  CONSTRAINT campaigns_driver_daily_wage_check
    CHECK (driver_daily_wage IS NULL OR driver_daily_wage >= 0),
  CONSTRAINT campaigns_transport_cost_check
    CHECK (transport_cost IS NULL OR transport_cost >= 0),
  CONSTRAINT campaigns_other_cost_check
    CHECK (other_cost IS NULL OR other_cost >= 0)
);

CREATE INDEX IF NOT EXISTS campaigns_campaign_date_idx ON public.campaigns (campaign_date);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns (status);
CREATE INDEX IF NOT EXISTS campaigns_client_id_idx ON public.campaigns (client_id);
CREATE INDEX IF NOT EXISTS campaigns_driver_profile_id_idx ON public.campaigns (driver_profile_id);
CREATE INDEX IF NOT EXISTS campaigns_client_date_idx ON public.campaigns (client_id, campaign_date DESC);
CREATE INDEX IF NOT EXISTS campaigns_driver_date_idx ON public.campaigns (driver_profile_id, campaign_date DESC);

-- ── driver_shifts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_shifts (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  campaign_id       uuid        NOT NULL,
  driver_profile_id uuid        NOT NULL,
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT driver_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT driver_shifts_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT driver_shifts_driver_profile_id_fkey
    FOREIGN KEY (driver_profile_id) REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT driver_shifts_times_check
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Only one open shift per driver at a time
CREATE UNIQUE INDEX IF NOT EXISTS driver_shifts_active_shift_idx
  ON public.driver_shifts (driver_profile_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS driver_shifts_campaign_id_idx ON public.driver_shifts (campaign_id);
CREATE INDEX IF NOT EXISTS driver_shifts_driver_profile_id_idx ON public.driver_shifts (driver_profile_id);
CREATE INDEX IF NOT EXISTS driver_shifts_campaign_started_idx ON public.driver_shifts (campaign_id, started_at DESC);

-- ── campaign_photos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_photos (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  campaign_id      uuid        NOT NULL,
  uploaded_by      uuid        NOT NULL,
  storage_path     text        NOT NULL,
  note             text        NULL,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  captured_at      timestamptz NULL,
  status           text        NOT NULL DEFAULT 'pending',
  reviewed_by      uuid        NULL,
  reviewed_at      timestamptz NULL,
  rejection_reason text        NULL,

  CONSTRAINT campaign_photos_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_photos_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_photos_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT campaign_photos_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT campaign_photos_status_check
    CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT campaign_photos_storage_path_check CHECK (storage_path <> '')
);

CREATE INDEX IF NOT EXISTS campaign_photos_campaign_id_idx ON public.campaign_photos (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_photos_uploaded_by_idx ON public.campaign_photos (uploaded_by);
CREATE INDEX IF NOT EXISTS campaign_photos_status_idx ON public.campaign_photos (status);
CREATE INDEX IF NOT EXISTS campaign_photos_campaign_submitted_idx ON public.campaign_photos (campaign_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS campaign_photos_campaign_status_idx ON public.campaign_photos (campaign_id, status, submitted_at DESC);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','clients','campaigns','driver_shifts'] LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER set_%s_updated_at
       BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ── username → email lookup (for driver username login) ──────
-- This function is callable by the anon role so the driver login
-- page can look up the auth email from a username before signing in.
CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(
  p_username text,
  p_role     text DEFAULT NULL
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE lower(p.username) = lower(p_username)
    AND (p_role IS NULL OR p.role = p_role)
    AND p.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_email_by_username TO anon;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_shifts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_photos  ENABLE ROW LEVEL SECURITY;

-- ── profiles RLS ─────────────────────────────────────────────
-- NOTE: All role checks use JWT app_metadata claims to avoid infinite
-- recursion when policies on other tables also query profiles.
-- Run: UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"<role>"}'
-- for each user after creation so the claim is present in the JWT.

-- Each user can read their own profile
CREATE POLICY "profiles: self read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles (JWT-based — no profiles query to avoid recursion)
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── clients RLS ──────────────────────────────────────────────
-- Only admins can read/write clients
CREATE POLICY "clients: admin all"
  ON public.clients FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── campaigns RLS ────────────────────────────────────────────
-- Admin: full access
CREATE POLICY "campaigns: admin all"
  ON public.campaigns FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read only assigned campaigns
CREATE POLICY "campaigns: driver read assigned"
  ON public.campaigns FOR SELECT
  USING (
    driver_profile_id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
  );

-- Client: read campaigns belonging to their client organisation
-- Safe to query profiles WHERE id = auth.uid() — covered by "self read" (no recursion)
CREATE POLICY "campaigns: client read own org"
  ON public.campaigns FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.client_id = campaigns.client_id
    )
  );

-- ── driver_shifts RLS ────────────────────────────────────────
-- Admin: full access
CREATE POLICY "driver_shifts: admin all"
  ON public.driver_shifts FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read and write own shifts on assigned campaigns
CREATE POLICY "driver_shifts: driver own"
  ON public.driver_shifts FOR ALL
  USING (
    driver_profile_id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
  )
  WITH CHECK (
    driver_profile_id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.driver_profile_id = auth.uid()
    )
  );

-- Client: read shifts for campaigns they can see
CREATE POLICY "driver_shifts: client read"
  ON public.driver_shifts FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = campaign_id
        AND p.client_id = c.client_id
    )
  );

-- ── campaign_photos RLS ──────────────────────────────────────
-- Admin: full access
CREATE POLICY "campaign_photos: admin all"
  ON public.campaign_photos FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Driver: read/insert photos on assigned campaigns only
CREATE POLICY "campaign_photos: driver own campaign"
  ON public.campaign_photos FOR ALL
  USING (
    uploaded_by = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.driver_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.driver_profile_id = auth.uid()
    )
  );

-- Client: read only approved photos for their org's campaigns
CREATE POLICY "campaign_photos: client read approved"
  ON public.campaign_photos FOR SELECT
  USING (
    status = 'approved'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = campaign_id
        AND p.client_id = c.client_id
    )
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Create the private bucket and apply JWT-based storage policies.
-- Path convention: campaigns/{campaign_id}/photos/{photo_id}/original.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-photos',
  'campaign-photos',
  false,
  15728640,
  ARRAY['image/jpeg','image/png','image/heic','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640;

CREATE POLICY "storage: admin read all"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "storage: admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "storage: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "storage: driver upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
  );

CREATE POLICY "storage: driver read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
  );

CREATE POLICY "storage: client read signed"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'client'
  );
-- ============================================================
