-- Phase 10 — Ohio ODI agency inventory (staging + promotion bridge)
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

CREATE TABLE IF NOT EXISTS odi_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'ohio_odi_agencies',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS odi_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES odi_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odi_license_raw_batch ON odi_license_raw(batch_id);

CREATE TABLE IF NOT EXISTS odi_producers (
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
  state              TEXT NOT NULL DEFAULT 'OH',
  zip                TEXT,
  launch_market_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'ohio_odi',
  source_url         TEXT NOT NULL DEFAULT 'https://insurance.ohio.gov/',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES odi_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_odi_producers_license ON odi_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_odi_producers_npn ON odi_producers(npn);
CREATE INDEX IF NOT EXISTS idx_odi_producers_market ON odi_producers(launch_market_id);
CREATE INDEX IF NOT EXISTS idx_odi_producers_city ON odi_producers(city);
CREATE INDEX IF NOT EXISTS idx_odi_producers_county ON odi_producers(county_normalized);
CREATE INDEX IF NOT EXISTS idx_odi_producers_state ON odi_producers(state);
CREATE INDEX IF NOT EXISTS idx_odi_producers_quals ON odi_producers USING GIN(qualifications);
CREATE INDEX IF NOT EXISTS idx_odi_producers_identity ON odi_producers(identity_key);

CREATE TABLE IF NOT EXISTS odi_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES odi_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_market     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase10_odi_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_odi_promotions_market ON odi_provider_promotions(launch_market);
CREATE INDEX IF NOT EXISTS idx_odi_promotions_provider ON odi_provider_promotions(provider_id);

ALTER TABLE odi_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE odi_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE odi_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE odi_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE odi_license_raw IS 'Phase 10 — Ohio ODI raw import rows; never expose publicly';
COMMENT ON TABLE odi_producers IS 'Phase 10 — normalized OH ODI agencies/businesses; promote only when Phase 1 verified';
COMMENT ON TABLE odi_provider_promotions IS 'Phase 10 — bridge from ODI producers to public providers';
