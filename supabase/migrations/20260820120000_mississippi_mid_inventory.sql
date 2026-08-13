-- Phase 24 — Mississippi MID Insurance Producer Entity inventory
-- Entities staged as entity_type=business; individuals may be staged but are not promoted.
-- Requires public.providers. Staging: RLS on, no public policies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.providers') IS NULL THEN
    RAISE EXCEPTION
      'relation "providers" does not exist — run ensure_core_providers migration first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ms_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'ms_mid_entities',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ms_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES ms_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ms_license_raw_batch ON ms_license_raw(batch_id);

CREATE TABLE IF NOT EXISTS ms_producers (
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
  ms_address         BOOLEAN NOT NULL DEFAULT FALSE,
  launch_market_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'ms_mid',
  source_url         TEXT NOT NULL DEFAULT 'https://www.mid.ms.gov/mississippi-insurance-department/licensing-search/individual-and-entity-licensing-search/',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES ms_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_ms_producers_license ON ms_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_ms_producers_entity ON ms_producers(entity_type);
CREATE INDEX IF NOT EXISTS idx_ms_producers_market ON ms_producers(launch_market_id);
CREATE INDEX IF NOT EXISTS idx_ms_producers_ms_address ON ms_producers(ms_address);
CREATE INDEX IF NOT EXISTS idx_ms_producers_city ON ms_producers(city);
CREATE INDEX IF NOT EXISTS idx_ms_producers_identity ON ms_producers(identity_key);

CREATE TABLE IF NOT EXISTS ms_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES ms_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_market     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase24_msmid_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_promotions_market ON ms_provider_promotions(launch_market);

ALTER TABLE ms_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ms_producers IS 'Phase 24 — MID Insurance Producer Entity rows; promote MS-address business entities only when Phase 1 verified';
COMMENT ON TABLE ms_provider_promotions IS 'Phase 24 — bridge from MS entities to public providers';
