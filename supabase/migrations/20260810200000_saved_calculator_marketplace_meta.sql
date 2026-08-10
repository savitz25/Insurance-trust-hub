-- Phase 3 Marketplace research saves — denormalized list columns on saved_calculator_results
-- Snapshot JSON remains source of truth for full research payload.

ALTER TABLE saved_calculator_results
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS used_live_marketplace BOOLEAN,
  ADD COLUMN IF NOT EXISTS plan_year INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS saved_calculator_results_user_created_idx
  ON saved_calculator_results (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_calculator_results_user_zip_idx
  ON saved_calculator_results (user_id, zip)
  WHERE zip IS NOT NULL;

COMMENT ON COLUMN saved_calculator_results.used_live_marketplace IS
  'True when snapshot used CMS Marketplace landscape; false for educational baseline.';
