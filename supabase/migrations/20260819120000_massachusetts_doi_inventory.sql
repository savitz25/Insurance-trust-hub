-- Phase 23 — Massachusetts DOI agency inventory (staging + promotion bridge)
-- Agencies staged as entity_type=business; individuals may be staged but are not promoted.
-- Licensed companies / carriers from Mass_licensed_companies.csv are not staged as agencies.
-- Requires public.providers. Staging: RLS on, no public policies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.providers') IS NULL THEN
    RAISE EXCEPTION
      'relation "providers" does not exist — run ensure_core_providers migration first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ma_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'ma_doi_agencies',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ma_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES ma_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_license_raw_batch ON ma_license_raw(batch_id);

CREATE TABLE IF NOT EXISTS ma_producers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type        TEXT NOT NULL
                       CHECK (entity_type IN ('business', 'individual')),
  license_number     TEXT NOT NULL,
  npn                TEXT,
  legal_name         TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  license_types      TEXT[] NOT NULL DEFAULT '{}',
  qualifications     TEXT[] NOT NULL DEFAULT '{}',
  license_status     TEXT NOT NULL DEFAULT 'active',
  issue_date         DATE,
  expiration_date    DATE,
  address            TEXT,
  city               TEXT,
  hq_state           TEXT,
  zip                TEXT,
  county             TEXT,
  phone              TEXT,
  ma_address         BOOLEAN NOT NULL DEFAULT FALSE,
  launch_market_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'ma_doi',
  source_url         TEXT NOT NULL DEFAULT 'https://www.mass.gov/lists/massachusetts-licensed-individuals-and-business-entities',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES ma_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_ma_producers_license ON ma_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_ma_producers_entity ON ma_producers(entity_type);
CREATE INDEX IF NOT EXISTS idx_ma_producers_market ON ma_producers(launch_market_id);
CREATE INDEX IF NOT EXISTS idx_ma_producers_ma_address ON ma_producers(ma_address);
CREATE INDEX IF NOT EXISTS idx_ma_producers_city ON ma_producers(city);
CREATE INDEX IF NOT EXISTS idx_ma_producers_identity ON ma_producers(identity_key);

CREATE TABLE IF NOT EXISTS ma_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES ma_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_market     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase23_madoi_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_ma_promotions_market ON ma_provider_promotions(launch_market);

ALTER TABLE ma_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ma_producers IS 'Phase 23 — MA DOI agencies; promote business/firm rows only when Phase 1 verified. Carriers from the licensed-companies list are not staged here.';
COMMENT ON TABLE ma_provider_promotions IS 'Phase 23 — bridge from MA agencies to public providers';
