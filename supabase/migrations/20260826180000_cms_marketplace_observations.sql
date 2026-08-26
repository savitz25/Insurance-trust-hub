-- INS-NAT-011 — CMS Marketplace producer evidence.
-- Additive. Does not alter providers. entity_id NULL = unmatched NPN (PENDING_IDENTITY).

CREATE TABLE IF NOT EXISTS cms_marketplace_observations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  npn                     TEXT NOT NULL,
  evidence_type           TEXT NOT NULL,
  program                 TEXT NOT NULL DEFAULT 'CMS_FFM',
  marketplace_type        TEXT,
  plan_year               TEXT,
  status                  TEXT,
  effective_date          DATE,
  expiration_date         DATE,
  termination_date        DATE,
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT,
  source_url              TEXT,
  source_observed_at      TIMESTAMPTZ,
  ingested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attribution_confidence  TEXT NOT NULL DEFAULT 'UNRESOLVED',
  identity_attachment     TEXT NOT NULL DEFAULT 'UNATTACHED',
  notes                   TEXT,
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cms_marketplace_observations IS
  'Official CMS FFM registration/termination/tracker evidence. Unmatched NPNs stay UNATTACHED for later exact-NPN join. Not a state license. Not a public profile.';

COMMENT ON COLUMN cms_marketplace_observations.identity_attachment IS
  'ATTACHED = exact person NPN; UNATTACHED = no person yet; KIND_CONFLICT = NPN owned by non-person.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_mkt_dedupe
  ON cms_marketplace_observations (
    source_dataset,
    COALESCE(plan_year, ''),
    evidence_type,
    npn
  );

CREATE INDEX IF NOT EXISTS idx_cms_mkt_npn ON cms_marketplace_observations (npn);
CREATE INDEX IF NOT EXISTS idx_cms_mkt_entity ON cms_marketplace_observations (entity_id);
CREATE INDEX IF NOT EXISTS idx_cms_mkt_year ON cms_marketplace_observations (plan_year);
CREATE INDEX IF NOT EXISTS idx_cms_mkt_type ON cms_marketplace_observations (evidence_type);

ALTER TABLE cms_marketplace_observations ENABLE ROW LEVEL SECURITY;
