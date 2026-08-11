-- Phase 4 — Florida DFS verified inventory pipeline (staged + normalized + promotion bridge)
-- Raw import tables: service_role only. Public reads verified providers only (existing policy).

-- ---------------------------------------------------------------------------
-- Import batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dfs_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('individual', 'business', 'appointment')),
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Raw rows (never public)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dfs_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES dfs_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('individual', 'business', 'appointment')),
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dfs_license_raw_batch ON dfs_license_raw(batch_id);
CREATE INDEX IF NOT EXISTS idx_dfs_license_raw_entity ON dfs_license_raw(entity_type);

-- ---------------------------------------------------------------------------
-- Normalized producers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dfs_producers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('individual', 'business')),
  license_number    TEXT NOT NULL,
  npn               TEXT,
  legal_name        TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  license_status    TEXT NOT NULL DEFAULT 'unknown',
  lines_of_authority TEXT[] NOT NULL DEFAULT '{}',
  city              TEXT,
  county            TEXT,
  county_normalized TEXT,
  state             TEXT NOT NULL DEFAULT 'FL',
  zip               TEXT,
  phone             TEXT,
  email             TEXT,
  resident_flag     BOOLEAN,
  source            TEXT NOT NULL DEFAULT 'florida_dfs',
  source_url        TEXT NOT NULL DEFAULT 'https://licenseesearch.fldfs.com/BulkDownload',
  source_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id      UUID REFERENCES dfs_import_batches(id) ON DELETE SET NULL,
  identity_key      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, license_number)
);

CREATE INDEX IF NOT EXISTS idx_dfs_producers_license ON dfs_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_dfs_producers_county ON dfs_producers(county_normalized);
CREATE INDEX IF NOT EXISTS idx_dfs_producers_status ON dfs_producers(license_status);
CREATE INDEX IF NOT EXISTS idx_dfs_producers_loa ON dfs_producers USING GIN(lines_of_authority);
CREATE INDEX IF NOT EXISTS idx_dfs_producers_identity ON dfs_producers(identity_key);

-- ---------------------------------------------------------------------------
-- Appointments (optional enrichment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dfs_appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL REFERENCES dfs_producers(id) ON DELETE CASCADE,
  carrier_name      TEXT,
  appointment_type  TEXT,
  appointment_status TEXT,
  effective_date    DATE,
  expiration_date   DATE,
  raw               JSONB,
  source_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dfs_appointments_producer ON dfs_appointments(producer_id);

-- ---------------------------------------------------------------------------
-- Promotion bridge: dfs_producers → providers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dfs_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES dfs_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_county     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase4_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_dfs_promotions_county ON dfs_provider_promotions(launch_county);
CREATE INDEX IF NOT EXISTS idx_dfs_promotions_provider ON dfs_provider_promotions(provider_id);

-- Optional denormalized county on providers via contact JSONB — no schema change required.
-- Track DFS provenance on license_info jsonb (source, checkedAt, identityMatchAccepted).

-- ---------------------------------------------------------------------------
-- RLS: raw / staging / promotions not public
-- ---------------------------------------------------------------------------
ALTER TABLE dfs_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_provider_promotions ENABLE ROW LEVEL SECURITY;

-- No public policies → deny by default for anon/authenticated.
-- service_role bypasses RLS for import/promotion scripts.

COMMENT ON TABLE dfs_license_raw IS 'Phase 4 — Florida DFS raw import rows; never expose publicly';
COMMENT ON TABLE dfs_producers IS 'Phase 4 — normalized FL DFS producers; promote only when Phase 1 verified gates pass';
COMMENT ON TABLE dfs_provider_promotions IS 'Phase 4 — bridge from DFS producers to public providers';
