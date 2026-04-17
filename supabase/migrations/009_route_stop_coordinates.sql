-- Migration 009: Add coordinates to route_stops
-- Enables map display of stop locations in admin route form and driver campaign screen.
-- Nullable so existing stops remain valid; geocoding fills these in on next save.

ALTER TABLE route_stops
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
