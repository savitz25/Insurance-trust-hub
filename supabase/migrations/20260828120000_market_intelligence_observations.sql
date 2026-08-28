-- FL-INS-005 — National-compatible market intelligence observations.
-- Additive. Does not alter providers. Does not publish.
-- entity_id NULL = aggregate or unresolved identity. Never invent a target.
-- Fingerprint: fl-ins-005-market-intelligence-v1
-- APPLY IN SQL EDITOR BEFORE production ingest.

CREATE TABLE IF NOT EXISTS market_intelligence_observations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  metric_family           TEXT NOT NULL,
  metric_name             TEXT NOT NULL,
  value_numeric           NUMERIC,
  value_text              TEXT,
  unit                    TEXT,
  jurisdiction            TEXT NOT NULL DEFAULT 'FL',
  geography_type          TEXT,
  geography_value         TEXT,
  product_line            TEXT,
  period_start            DATE,
  period_end              DATE,
  as_of                   DATE,
  source_clock            TEXT NOT NULL,
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT NOT NULL,
  source_url              TEXT,
  source_observed_at      TIMESTAMPTZ,
  attribution_confidence  identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  publication_allowed     BOOLEAN NOT NULL DEFAULT FALSE,
  publication_readiness   TEXT NOT NULL DEFAULT 'INTERNAL_ONLY',
  match_basis             TEXT,
  notes                   TEXT,
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE market_intelligence_observations IS
  'Source-faithful market metrics. Attach only via exact NAIC/FL CoCode/NPN. Aggregates stay entity_id NULL. publication_allowed false until a later UI task.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_intel_dedupe
  ON market_intelligence_observations (
    source_dataset,
    source_record_id,
    metric_name,
    COALESCE(geography_value, ''),
    COALESCE(product_line, ''),
    COALESCE(period_end::text, '')
  );

CREATE INDEX IF NOT EXISTS idx_market_intel_entity
  ON market_intelligence_observations (entity_id);
CREATE INDEX IF NOT EXISTS idx_market_intel_family
  ON market_intelligence_observations (metric_family);
CREATE INDEX IF NOT EXISTS idx_market_intel_clock
  ON market_intelligence_observations (source_clock);

ALTER TABLE market_intelligence_observations ENABLE ROW LEVEL SECURITY;
