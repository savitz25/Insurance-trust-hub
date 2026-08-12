-- Phase 6A — Florida DFS active appointment enrichment (business / promoted agencies)
-- Staging remains service_role-only. Consumer reads denormalized contact.appointment_snapshot.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure base table exists (older migrations)
CREATE TABLE IF NOT EXISTS dfs_appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id        UUID REFERENCES dfs_producers(id) ON DELETE CASCADE,
  carrier_name       TEXT,
  appointment_type   TEXT,
  appointment_status TEXT,
  effective_date     DATE,
  expiration_date    DATE,
  raw                JSONB,
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dfs_appointments
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS appointing_entity_number TEXT,
  ADD COLUMN IF NOT EXISTS appointing_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES dfs_import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS county_normalized TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'florida_dfs',
  ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT 'https://licenseesearch.fldfs.com/BulkDownload';

-- Backfill carrier_name from appointing_entity_name when empty
UPDATE dfs_appointments
SET carrier_name = appointing_entity_name
WHERE (carrier_name IS NULL OR carrier_name = '')
  AND appointing_entity_name IS NOT NULL
  AND appointing_entity_name <> '';

CREATE INDEX IF NOT EXISTS idx_dfs_appointments_producer ON dfs_appointments(producer_id);
CREATE INDEX IF NOT EXISTS idx_dfs_appointments_license ON dfs_appointments(license_number);
CREATE INDEX IF NOT EXISTS idx_dfs_appointments_entity ON dfs_appointments(appointing_entity_name);

-- Dedupe keys: empty string when missing
UPDATE dfs_appointments SET appointing_entity_number = '' WHERE appointing_entity_number IS NULL;
UPDATE dfs_appointments SET appointment_type = '' WHERE appointment_type IS NULL;

ALTER TABLE dfs_appointments
  ALTER COLUMN appointing_entity_number SET DEFAULT '',
  ALTER COLUMN appointment_type SET DEFAULT '';

-- Dedupe: one row per producer + appointing entity + type
CREATE UNIQUE INDEX IF NOT EXISTS idx_dfs_appointments_dedupe
  ON dfs_appointments (producer_id, appointing_entity_number, appointment_type)
  WHERE producer_id IS NOT NULL;

ALTER TABLE dfs_appointments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE dfs_appointments IS
  'Phase 6A — Florida DFS active appointment snapshots. Ops/staging only; public via providers.contact.appointment_snapshot.';
