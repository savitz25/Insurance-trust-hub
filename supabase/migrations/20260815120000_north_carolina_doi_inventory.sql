-- Phase 13 — North Carolina DOI agency inventory (staging + promotion bridge)
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

CREATE TABLE IF NOT EXISTS nc_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'nc_doi_agencies',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nc_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES nc_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nc_license_raw_batch ON nc_license_raw(batch_id);

CREATE TABLE IF NOT EXISTS nc_producers (
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
  state              TEXT NOT NULL DEFAULT 'NC',
  zip                TEXT,
  launch_market_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'nc_doi',
  source_url         TEXT NOT NULL DEFAULT 'https://www.ncdoi.gov/',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES nc_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_nc_producers_license ON nc_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_nc_producers_npn ON nc_producers(npn);
CREATE INDEX IF NOT EXISTS idx_nc_producers_market ON nc_producers(launch_market_id);
CREATE INDEX IF NOT EXISTS idx_nc_producers_city ON nc_producers(city);
CREATE INDEX IF NOT EXISTS idx_nc_producers_county ON nc_producers(county_normalized);
CREATE INDEX IF NOT EXISTS idx_nc_producers_state ON nc_producers(state);
CREATE INDEX IF NOT EXISTS idx_nc_producers_quals ON nc_producers USING GIN(qualifications);
CREATE INDEX IF NOT EXISTS idx_nc_producers_identity ON nc_producers(identity_key);

CREATE TABLE IF NOT EXISTS nc_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES nc_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_market     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase13_ncdoi_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_nc_promotions_market ON nc_provider_promotions(launch_market);
CREATE INDEX IF NOT EXISTS idx_nc_promotions_provider ON nc_provider_promotions(provider_id);

ALTER TABLE nc_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE nc_license_raw IS 'Phase 13 — NC DOI / SBS raw import rows; never expose publicly';
COMMENT ON TABLE nc_producers IS 'Phase 13 — normalized NC DOI agencies/businesses; promote only when Phase 1 verified';
COMMENT ON TABLE nc_provider_promotions IS 'Phase 13 — bridge from NC producers to public providers';
