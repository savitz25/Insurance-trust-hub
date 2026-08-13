-- Phase 15 — Vermont DFR licensee inventory (staging + promotion bridge)
-- Firms staged as entity_type=business; individuals may be staged but are not promoted.
-- Requires public.providers. Staging: RLS on, no public policies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.providers') IS NULL THEN
    RAISE EXCEPTION
      'relation "providers" does not exist — run ensure_core_providers migration first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vt_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT NOT NULL,
  source_label    TEXT NOT NULL DEFAULT 'vt_dfr_licensees',
  row_count       INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vt_license_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES vt_import_batches(id) ON DELETE CASCADE,
  source_file     TEXT NOT NULL,
  row_number      INTEGER,
  raw             JSONB NOT NULL,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vt_license_raw_batch ON vt_license_raw(batch_id);

CREATE TABLE IF NOT EXISTS vt_producers (
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
  vt_address         BOOLEAN NOT NULL DEFAULT FALSE,
  launch_market_id   TEXT,
  source             TEXT NOT NULL DEFAULT 'vt_dfr',
  source_url         TEXT NOT NULL DEFAULT 'https://dfr.vermont.gov/insurance/producer-and-individual-licensing',
  source_checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_batch_id       UUID REFERENCES vt_import_batches(id) ON DELETE SET NULL,
  identity_key       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_number)
);

CREATE INDEX IF NOT EXISTS idx_vt_producers_license ON vt_producers(license_number);
CREATE INDEX IF NOT EXISTS idx_vt_producers_entity ON vt_producers(entity_type);
CREATE INDEX IF NOT EXISTS idx_vt_producers_market ON vt_producers(launch_market_id);
CREATE INDEX IF NOT EXISTS idx_vt_producers_vt_address ON vt_producers(vt_address);
CREATE INDEX IF NOT EXISTS idx_vt_producers_city ON vt_producers(city);
CREATE INDEX IF NOT EXISTS idx_vt_producers_identity ON vt_producers(identity_key);

CREATE TABLE IF NOT EXISTS vt_provider_promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id       UUID NOT NULL UNIQUE REFERENCES vt_producers(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  launch_market     TEXT NOT NULL,
  promoted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by       TEXT NOT NULL DEFAULT 'phase15_vtdfr_pipeline',
  trust_snapshot    JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_vt_promotions_market ON vt_provider_promotions(launch_market);

ALTER TABLE vt_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vt_license_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE vt_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vt_provider_promotions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE vt_producers IS 'Phase 15 — VT DFR licensees; promote business/firm rows only when Phase 1 verified';
COMMENT ON TABLE vt_provider_promotions IS 'Phase 15 — bridge from VT firms to public providers';
