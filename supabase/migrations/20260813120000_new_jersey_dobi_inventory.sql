-- Phase 9 — New Jersey DOBI agency inventory (staging + promotion bridge)
-- Organizations/agencies only. Requires public.providers.
-- Staging: service_role only (RLS on, no public policies).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.providers') IS NULL THEN
    RAISE EXCEPTION
      'relation "providers" does not exist — run ensure_core_providers migration first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS nj_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'new_jersey_dobi_agencies',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nj_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES nj_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nj_license_raw_batch ON nj_license_raw(batch_id);

CREATE TABLE IF NOT EXISTS nj_producers (
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
  state              TEXT NOT NULL DEFAULT 'NJ',
  zip                TEXT,
  launch_region_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'new_jersey_dobi',
  source_url         TEXT NOT NULL DEFAULT 'https://www.nj.gov/dobi/inslic.htm',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES nj_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_nj_producers_license ON nj_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_nj_producers_npn ON nj_producers(npn);
CREATE INDEX IF NOT EXISTS idx_nj_producers_region ON nj_producers(launch_region_id);
CREATE INDEX IF NOT EXISTS idx_nj_producers_city ON nj_producers(city);
CREATE INDEX IF NOT EXISTS idx_nj_producers_county ON nj_producers(county_normalized);
CREATE INDEX IF NOT EXISTS idx_nj_producers_state ON nj_producers(state);
CREATE INDEX IF NOT EXISTS idx_nj_producers_quals ON nj_producers USING GIN(qualifications);
CREATE INDEX IF NOT EXISTS idx_nj_producers_identity ON nj_producers(identity_key);

CREATE TABLE IF NOT EXISTS nj_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES nj_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_region     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase9_nj_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_nj_promotions_region ON nj_provider_promotions(launch_region);
CREATE INDEX IF NOT EXISTS idx_nj_promotions_provider ON nj_provider_promotions(provider_id);

ALTER TABLE nj_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE nj_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE nj_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nj_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE nj_license_raw IS 'Phase 9 — NJ DOBI/org agency raw import; never public';
COMMENT ON TABLE nj_producers IS 'Phase 9 — normalized NJ agency/business licensees; promote only when Phase 1 verified';
COMMENT ON TABLE nj_provider_promotions IS 'Phase 9 — bridge from NJ producers to public providers';
