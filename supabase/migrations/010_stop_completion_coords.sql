-- Migration 010: Record driver GPS position at stop completion
--
-- When a driver taps "Done" on a route stop, we store where they were
-- at that moment. Nullable — existing rows and offline completions are
-- unaffected. Admin views can cross-reference these against stop coords
-- (added in 009) for authenticity auditing, consistent with the existing
-- photo-metadata GPS verification approach.
--
-- Run with:  supabase db push   (or paste into Supabase SQL Editor)

ALTER TABLE shift_stop_completions
  ADD COLUMN IF NOT EXISTS completed_lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS completed_lng  DOUBLE PRECISION;
