-- Migration 008: Stop-level photo organisation
--
-- 1. Link each campaign photo to the route stop it was taken at.
-- 2. Record when a driver marks a stop as "done" during a shift.
--
-- Run with:  supabase db push   (or paste into Supabase SQL Editor)

-- ── 1. campaign_photos: add route_stop_id ─────────────────────────
ALTER TABLE campaign_photos
  ADD COLUMN IF NOT EXISTS route_stop_id UUID
    REFERENCES route_stops(id) ON DELETE SET NULL;

-- Index for fast "photos at stop X" lookups
CREATE INDEX IF NOT EXISTS campaign_photos_stop_idx
  ON campaign_photos (route_stop_id)
  WHERE route_stop_id IS NOT NULL;

-- ── 2. shift_stop_completions ─────────────────────────────────────
-- Records the moment a driver taps "Done" at a stop.
-- One row per (shift, stop) — UNIQUE prevents double-completion.
CREATE TABLE IF NOT EXISTS shift_stop_completions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      UUID        NOT NULL REFERENCES driver_shifts(id) ON DELETE CASCADE,
  stop_id       UUID        NOT NULL REFERENCES route_stops(id)   ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift_id, stop_id)
);

-- Index for "which stops has this shift completed?"
CREATE INDEX IF NOT EXISTS ssc_shift_idx ON shift_stop_completions (shift_id);

-- RLS: drivers can insert/read their own completions; admins see all
ALTER TABLE shift_stop_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver own completions"
  ON shift_stop_completions
  FOR ALL
  USING (
    shift_id IN (
      SELECT id FROM driver_shifts WHERE driver_profile_id = auth.uid()
    )
  );

CREATE POLICY "admin all completions"
  ON shift_stop_completions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
