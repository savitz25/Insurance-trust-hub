-- Repair path for projects that tried Phase 4 DFS migration before core schema.
-- Idempotent: safe if 20260811115000 / 20260811120000 already applied cleanly.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type') THEN
    CREATE TYPE provider_type AS ENUM (
      'independent_agent',
      'brokerage',
      'specialist'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  provider_type       provider_type NOT NULL,
  categories          TEXT[] NOT NULL DEFAULT '{}',
  states_licensed     TEXT[] NOT NULL DEFAULT '{}',
  cities              TEXT[] NOT NULL DEFAULT '{}',
  license_info        JSONB NOT NULL DEFAULT '{}',
  specialties         TEXT[] NOT NULL DEFAULT '{}',
  rating              NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count        INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  years_in_business   INTEGER CHECK (years_in_business >= 0),
  relocation_experience BOOLEAN NOT NULL DEFAULT FALSE,
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  description         TEXT,
  short_description   TEXT,
  contact             JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_slug ON providers(slug);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON providers(verified) WHERE verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_providers_states_licensed ON providers USING GIN(states_licensed);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'providers'
      AND policyname = 'Public can view verified providers'
  ) THEN
    CREATE POLICY "Public can view verified providers"
      ON providers
      FOR SELECT
      TO anon, authenticated
      USING (verified = TRUE);
  END IF;
END $$;

-- DFS staging (same as 20260811120000, IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS dfs_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('individual', 'business', 'appointment')),
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dfs_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES dfs_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('individual', 'business', 'appointment')),
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_dfs_producers_license ON dfs_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_dfs_producers_county ON dfs_producers(county_normalized);
CREATE INDEX IF NOT EXISTS idx_dfs_promotions_county ON dfs_provider_promotions(launch_county);

ALTER TABLE dfs_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfs_provider_promotions ENABLE ROW LEVEL SECURITY;
