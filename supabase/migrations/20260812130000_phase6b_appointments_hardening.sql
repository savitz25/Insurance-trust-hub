-- Phase 6B — Appointments data hardening (additive / idempotent)
-- Public reads still only via providers.contact.appointment_snapshot on verified rows.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT 'https://licenseesearch.fldfs.com/BulkDownload',
  ADD COLUMN IF NOT EXISTS license_key TEXT;

-- Normalize empty dedupe keys
UPDATE dfs_appointments SET appointing_entity_number = COALESCE(appointing_entity_number, '');
UPDATE dfs_appointments SET appointment_type = COALESCE(appointment_type, '');
UPDATE dfs_appointments
SET appointing_entity_name = COALESCE(NULLIF(appointing_entity_name, ''), carrier_name)
WHERE appointing_entity_name IS NULL OR appointing_entity_name = '';
UPDATE dfs_appointments
SET carrier_name = COALESCE(NULLIF(carrier_name, ''), appointing_entity_name)
WHERE carrier_name IS NULL OR carrier_name = '';

-- license_key: uppercase compact form for match joins
UPDATE dfs_appointments
SET license_key = UPPER(REGEXP_REPLACE(COALESCE(license_number, ''), '\s+', '', 'g'))
WHERE license_number IS NOT NULL
  AND (license_key IS NULL OR license_key = '');

ALTER TABLE dfs_appointments
  ALTER COLUMN appointing_entity_number SET DEFAULT '',
  ALTER COLUMN appointment_type SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_dfs_appointments_producer ON dfs_appointments(producer_id);
CREATE INDEX IF NOT EXISTS idx_dfs_appointments_license ON dfs_appointments(license_number);
CREATE INDEX IF NOT EXISTS idx_dfs_appointments_license_key ON dfs_appointments(license_key);
CREATE INDEX IF NOT EXISTS idx_dfs_appointments_entity ON dfs_appointments(appointing_entity_name);
CREATE INDEX IF NOT EXISTS idx_dfs_appointments_status ON dfs_appointments(appointment_status);
CREATE INDEX IF NOT EXISTS idx_dfs_producers_license_upper
  ON dfs_producers (UPPER(REGEXP_REPLACE(license_number, '\s+', '', 'g')));

-- Unique: one row per producer + appointing entity number + type
DROP INDEX IF EXISTS idx_dfs_appointments_dedupe;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dfs_appointments_dedupe
  ON dfs_appointments (producer_id, appointing_entity_number, appointment_type)
  WHERE producer_id IS NOT NULL;

ALTER TABLE dfs_appointments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE dfs_appointments IS
  'Phase 6A/6B — Florida DFS appointment staging. Public via providers.contact.appointment_snapshot only.';
COMMENT ON COLUMN dfs_appointments.license_key IS
  'Uppercase compact license for match performance (Phase 6B).';
