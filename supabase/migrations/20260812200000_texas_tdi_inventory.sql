-- Phase 8 — Texas TDI agency inventory (staging + promotion bridge)
-- Agencies/businesses only. Requires public.providers.
-- Staging tables: service_role only (RLS enabled, no public policies).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.providers') IS NULL THEN
    RAISE EXCEPTION
      'relation "providers" does not exist — run ensure_core_providers migration first';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Import batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tdi_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'texas_tdi_agencies',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Raw rows (never public)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tdi_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES tdi_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tdi_license_raw_batch ON tdi_license_raw(batch_id);

-- ---------------------------------------------------------------------------
-- Normalized agencies / businesses (one row per license number)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tdi_producers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type        TEXT NOT NULL DEFAULT 'business'
                       CHECK (entity_type = 'business'),
  license_number     TEXT NOT NULL,
  npn                TEXT,
  legal_name         TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  org_type           TEXT,
  license_types      TEXT[] NOT NULL DEFAULT '{}',
  qualifications     TEXT[] NOT NULL DEFAULT '{}',
  license_status     TEXT NOT NULL DEFAULT 'active',
  issue_date         DATE,
  expiration_date    DATE,
  city               TEXT,
  county             TEXT,
  county_normalized  TEXT,
  state              TEXT NOT NULL DEFAULT 'TX',
  zip                TEXT,
  launch_market_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'texas_tdi',
  source_url         TEXT NOT NULL DEFAULT 'https://data.texas.gov/dataset/Insurance-agencies-and-businesses-approved-to-mana/3yqc-fcdt',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES tdi_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_tdi_producers_license ON tdi_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_npn ON tdi_producers(npn);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_market ON tdi_producers(launch_market_id);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_city ON tdi_producers(city);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_county ON tdi_producers(county_normalized);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_state ON tdi_producers(state);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_quals ON tdi_producers USING GIN(qualifications);
CREATE INDEX IF NOT EXISTS idx_tdi_producers_identity ON tdi_producers(identity_key);

-- ---------------------------------------------------------------------------
-- Promotion bridge: tdi_producers → providers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tdi_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES tdi_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_market     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase8_tdi_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_tdi_promotions_market ON tdi_provider_promotions(launch_market);
CREATE INDEX IF NOT EXISTS idx_tdi_promotions_provider ON tdi_provider_promotions(provider_id);

-- ---------------------------------------------------------------------------
-- RLS: staging private (no public policies)
-- ---------------------------------------------------------------------------
ALTER TABLE tdi_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdi_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdi_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tdi_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE tdi_license_raw IS 'Phase 8 — Texas TDI raw import rows; never expose publicly';
COMMENT ON TABLE tdi_producers IS 'Phase 8 — normalized TX TDI agencies/businesses; promote only when Phase 1 verified';
COMMENT ON TABLE tdi_provider_promotions IS 'Phase 8 — bridge from TDI producers to public providers';
