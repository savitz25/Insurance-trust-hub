-- INS-NAT-002 — Additive national identity + credential graph.
-- Does NOT alter public.providers columns, slugs, or RLS.
-- Staging DOI tables remain source evidence. Service-role only (no public policies).
--
-- Fingerprint: ins-nat-002-v1
-- sha256: fe29de70ce4980419a59f0062f812f81b45a9ecb09499c843175cf9f8aa31033
-- Rollback: DROP TABLE in reverse order (see docs/INS-NAT-002-IDENTITY-GRAPH.md).
--           Safe because no FKs from providers INTO this graph except the
--           optional provider_entity_bridges.provider_id reference.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'national_entity_kind') THEN
    CREATE TYPE national_entity_kind AS ENUM ('person', 'agency', 'carrier');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'national_identity_kind') THEN
    CREATE TYPE national_identity_kind AS ENUM ('npn', 'provisional');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_confidence') THEN
    CREATE TYPE identity_confidence AS ENUM (
      'CONFIRMED',
      'HIGH_CONFIDENCE',
      'REVIEW_REQUIRED',
      'UNRESOLVED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'regulatory_status') THEN
    CREATE TYPE regulatory_status AS ENUM (
      'active',
      'inactive',
      'expired',
      'suspended',
      'revoked',
      'cancelled',
      'unknown'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_observation_kind') THEN
    CREATE TYPE contact_observation_kind AS ENUM (
      'email',
      'phone',
      'website',
      'physical_address',
      'mailing_address',
      'named_contact',
      'contact_title'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- National entities (PERSON / AGENCY / CARRIER)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS national_entities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind        national_entity_kind NOT NULL,
  identity_kind      national_identity_kind NOT NULL,
  npn                TEXT,
  provisional_key    TEXT,
  legal_name         TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  identity_confidence identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  identity_notes     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT national_entities_identity_anchor CHECK (
    (identity_kind = 'npn' AND npn IS NOT NULL AND provisional_key IS NULL)
    OR
    (identity_kind = 'provisional' AND provisional_key IS NOT NULL)
  )
);

COMMENT ON TABLE national_entities IS
  'INS-NAT-002 national identity spine. NPN is the only CONFIRMED national anchor. Provisional keys are source-scoped and never merged by name/address.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_entities_npn_kind
  ON national_entities (entity_kind, npn)
  WHERE npn IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_entities_provisional
  ON national_entities (entity_kind, provisional_key)
  WHERE provisional_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_national_entities_kind ON national_entities (entity_kind);

-- ---------------------------------------------------------------------------
-- License credentials (state authorization — not an entity)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS license_credentials (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  entity_kind             national_entity_kind NOT NULL,
  jurisdiction            TEXT NOT NULL,
  regulator               TEXT NOT NULL,
  license_number          TEXT NOT NULL,
  license_class           TEXT,
  license_namespace       TEXT NOT NULL DEFAULT 'producer',
  -- Regulator-reported status (independent of Trust Hub freshness)
  regulatory_status       regulatory_status NOT NULL DEFAULT 'unknown',
  issue_date              DATE,
  effective_date          DATE,
  expiration_date         DATE,
  renewal_date            DATE,
  termination_date        DATE,
  -- Source / Trust Hub observation (independent of regulator dates)
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT,
  source_url              TEXT,
  source_observed_at      TIMESTAMPTZ,
  ingested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attribution_confidence  identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE license_credentials IS
  'State-specific credentials. Unique per jurisdiction + entity_kind + license_number. entity_id NULL = UNRESOLVED national identity.';

COMMENT ON COLUMN license_credentials.regulatory_status IS
  'What the source last said about the license. Never derived from Trust Hub checked-at age.';

COMMENT ON COLUMN license_credentials.source_observed_at IS
  'When the source snapshot was taken / last observed.';

COMMENT ON COLUMN license_credentials.ingested_at IS
  'When Trust Hub ingested or last checked this credential. Stale ingested_at ≠ expired license.';

-- Same number may exist as person vs agency in one state (FL DFS).
CREATE UNIQUE INDEX IF NOT EXISTS idx_license_credentials_natural
  ON license_credentials (jurisdiction, entity_kind, license_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_credentials_source_record
  ON license_credentials (source_dataset, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_license_credentials_entity
  ON license_credentials (entity_id);
CREATE INDEX IF NOT EXISTS idx_license_credentials_jurisdiction
  ON license_credentials (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_license_credentials_status
  ON license_credentials (regulatory_status);

-- ---------------------------------------------------------------------------
-- LOA observations — official regulator terminology preserved
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS loa_observations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID REFERENCES national_entities(id) ON DELETE CASCADE,
  credential_id           UUID REFERENCES license_credentials(id) ON DELETE CASCADE,
  official_text           TEXT NOT NULL,
  official_code           TEXT,
  loa_status              TEXT,
  effective_date          DATE,
  expiration_date         DATE,
  source_dataset          TEXT NOT NULL,
  regulator               TEXT,
  source_observed_at      TIMESTAMPTZ,
  consumer_group          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loa_observations_dedupe
  ON loa_observations (
    COALESCE(credential_id, '00000000-0000-0000-0000-000000000000'::uuid),
    source_dataset,
    UPPER(TRIM(official_text))
  );

CREATE INDEX IF NOT EXISTS idx_loa_observations_entity ON loa_observations (entity_id);

-- ---------------------------------------------------------------------------
-- Contact observations — never last-write-wins
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_observations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID REFERENCES national_entities(id) ON DELETE CASCADE,
  contact_kind            contact_observation_kind NOT NULL,
  value                   TEXT NOT NULL,
  label                   TEXT,
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT,
  source_observed_at      TIMESTAMPTZ,
  attribution_confidence  identity_confidence NOT NULL DEFAULT 'CONFIRMED',
  public_eligible         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contact_observations IS
  'Source-backed contact facts. Multiple values per kind are allowed. public_eligible is storage policy, not a UI change.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_observations_dedupe
  ON contact_observations (
    entity_id,
    contact_kind,
    source_dataset,
    UPPER(TRIM(value))
  );

CREATE INDEX IF NOT EXISTS idx_contact_observations_entity ON contact_observations (entity_id);
CREATE INDEX IF NOT EXISTS idx_contact_observations_kind ON contact_observations (contact_kind);

-- ---------------------------------------------------------------------------
-- Time-aware relationships (employment / appointments)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS national_relationships (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id          UUID NOT NULL REFERENCES national_entities(id) ON DELETE CASCADE,
  to_entity_id            UUID NOT NULL REFERENCES national_entities(id) ON DELETE CASCADE,
  relationship_type       TEXT NOT NULL,
  status                  TEXT,
  effective_date          DATE,
  termination_date        DATE,
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT,
  source_observed_at      TIMESTAMPTZ,
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT national_relationships_no_self CHECK (from_entity_id <> to_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_national_relationships_from ON national_relationships (from_entity_id);
CREATE INDEX IF NOT EXISTS idx_national_relationships_to ON national_relationships (to_entity_id);
CREATE INDEX IF NOT EXISTS idx_national_relationships_type ON national_relationships (relationship_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_relationships_dedupe
  ON national_relationships (
    from_entity_id,
    to_entity_id,
    relationship_type,
    COALESCE(source_dataset, ''),
    COALESCE(source_record_id, '')
  );

-- ---------------------------------------------------------------------------
-- Certification / program observations (empty-capable; CMS later)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS certification_observations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID NOT NULL REFERENCES national_entities(id) ON DELETE CASCADE,
  program                 TEXT NOT NULL,
  status                  TEXT,
  plan_year               TEXT,
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT,
  source_observed_at      TIMESTAMPTZ,
  attribution_confidence  identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  notes                   TEXT,
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certification_observations_entity
  ON certification_observations (entity_id);

-- ---------------------------------------------------------------------------
-- Regulatory evidence stub (full system is INS-NAT-008)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regulatory_evidence (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  record_identifier       TEXT NOT NULL,
  regulator               TEXT NOT NULL,
  category                TEXT,
  disposition             TEXT,
  is_final                BOOLEAN,
  amount_cents            BIGINT,
  event_date              DATE,
  attribution_confidence  identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  source_dataset          TEXT NOT NULL,
  source_url              TEXT,
  source_observed_at      TIMESTAMPTZ,
  notes                   TEXT,
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_evidence_entity ON regulatory_evidence (entity_id);
COMMENT ON TABLE regulatory_evidence IS
  'INS-NAT-002 stub. Unresolved rows must not be published. Full model is INS-NAT-008.';

-- ---------------------------------------------------------------------------
-- Identity conflicts (REVIEW_REQUIRED) — never auto-resolved
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS national_identity_conflicts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npn                     TEXT,
  entity_kind             national_entity_kind,
  reason                  TEXT NOT NULL,
  left_source_dataset     TEXT,
  left_source_record_id   TEXT,
  left_name               TEXT,
  right_source_dataset    TEXT,
  right_source_record_id  TEXT,
  right_name              TEXT,
  existing_entity_id      UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_identity_conflicts_npn
  ON national_identity_conflicts (npn);

-- ---------------------------------------------------------------------------
-- Legacy provider bridge (optional, non-destructive)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_entity_bridges (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id             UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  entity_id               UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  match_method            TEXT NOT NULL,
  confidence              identity_confidence NOT NULL,
  source                  TEXT,
  matched_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                   TEXT,
  UNIQUE (provider_id)
);

COMMENT ON TABLE provider_entity_bridges IS
  'Optional link from legacy public.providers rows to national_entities. Unresolved providers stay public.';

CREATE INDEX IF NOT EXISTS idx_provider_entity_bridges_entity
  ON provider_entity_bridges (entity_id);

-- ---------------------------------------------------------------------------
-- Source record → credential map (staging remains valid)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS source_record_links (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dataset          TEXT NOT NULL,
  source_table            TEXT NOT NULL,
  source_record_id        TEXT NOT NULL,
  credential_id           UUID REFERENCES license_credentials(id) ON DELETE SET NULL,
  entity_id               UUID REFERENCES national_entities(id) ON DELETE SET NULL,
  identity_confidence     identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_table, source_record_id)
);

-- ---------------------------------------------------------------------------
-- RLS: graph is ops-only. Public continues to read providers.
-- ---------------------------------------------------------------------------

ALTER TABLE national_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE loa_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_identity_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_entity_bridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_record_links ENABLE ROW LEVEL SECURITY;
