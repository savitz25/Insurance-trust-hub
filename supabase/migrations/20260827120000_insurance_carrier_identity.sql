-- INS-NAT-FINAL-002 — Additive insurance carrier identity foundation.
-- Legal insurer / insurance group / consumer brand kinds + identifier/alias tables.
-- Does NOT alter public.providers, slugs, RLS on providers, sitemaps, or existing
-- person/agency rows. Does NOT merge FL DFS appointing entities with NAIC CoCodes.
-- Does NOT apply itself; ops apply via SQL Editor only under a later controlled gate.
--
-- Fingerprint: ins-nat-final-002-v1
-- Rollback (tables only): DROP TABLE national_entity_aliases, national_entity_identifiers;
-- Enum values cannot be removed without a rewrite; they are unused until ingest.
--
-- Expected provider impact: NONE. Public providers remain 170,499.
-- Expected graph writes: NONE in this task (schema only).

-- ---------------------------------------------------------------------------
-- Additive entity kinds (appointing-entity `carrier` is unchanged)
-- ---------------------------------------------------------------------------

ALTER TYPE national_entity_kind ADD VALUE IF NOT EXISTS 'legal_insurer';
ALTER TYPE national_entity_kind ADD VALUE IF NOT EXISTS 'insurance_group';
ALTER TYPE national_entity_kind ADD VALUE IF NOT EXISTS 'consumer_brand';

COMMENT ON TYPE national_entity_kind IS
  'person/agency remain producer identity. carrier = state appointing entity. legal_insurer = NAIC CoCode company. insurance_group and consumer_brand are distinct and never collapse into legal_insurer.';

-- ---------------------------------------------------------------------------
-- Official identifiers (NAIC CoCode, group code, state appointing IDs, FEIN, CMS)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS national_entity_identifiers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID NOT NULL REFERENCES national_entities(id) ON DELETE CASCADE,
  scheme                  TEXT NOT NULL
                            CHECK (scheme IN (
                              'naic_cocode',
                              'naic_group_code',
                              'fein',
                              'fl_dfs_appointing_entity_number',
                              'tx_tdi_naic_id',
                              'cms_medicare_contract_id',
                              'cms_hios_issuer_id'
                            )),
  value                   TEXT NOT NULL,
  display_value           TEXT,
  source_dataset          TEXT NOT NULL,
  source_record_id        TEXT,
  source_url              TEXT,
  source_observed_at      TIMESTAMPTZ,
  attribution_confidence  identity_confidence NOT NULL DEFAULT 'UNRESOLVED',
  raw                     JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT national_entity_identifiers_value_nonempty CHECK (length(trim(value)) > 0)
);

COMMENT ON TABLE national_entity_identifiers IS
  'INS-NAT-FINAL-002 official identifiers. naic_cocode is the CONFIRMED legal-insurer key. FL DFS appointing numbers are never stored as naic_cocode. TDI NAIC IDs stay tx_tdi_naic_id until CONFIRMED crosswalk.';

COMMENT ON COLUMN national_entity_identifiers.raw IS
  'Raw source identifier payload. Normalize into value; never discard the original.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_entity_identifiers_scheme_value
  ON national_entity_identifiers (scheme, value);

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_entity_identifiers_entity_scheme
  ON national_entity_identifiers (entity_id, scheme);

CREATE INDEX IF NOT EXISTS idx_national_entity_identifiers_entity
  ON national_entity_identifiers (entity_id);

CREATE INDEX IF NOT EXISTS idx_national_entity_identifiers_scheme
  ON national_entity_identifiers (scheme);

-- ---------------------------------------------------------------------------
-- Name history / aliases (same entity; never a second identity)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS national_entity_aliases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id               UUID NOT NULL REFERENCES national_entities(id) ON DELETE CASCADE,
  alias                   TEXT NOT NULL,
  alias_kind              TEXT NOT NULL DEFAULT 'legal_name'
                            CHECK (alias_kind IN (
                              'legal_name',
                              'former_name',
                              'trade_name',
                              'short_name'
                            )),
  source_dataset          TEXT NOT NULL,
  source_observed_at      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT national_entity_aliases_alias_nonempty CHECK (length(trim(alias)) > 0)
);

COMMENT ON TABLE national_entity_aliases IS
  'Historical and alternate names for one national entity. Same NAIC CoCode keeps one legal_insurer row; name changes become aliases.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_entity_aliases_dedupe
  ON national_entity_aliases (
    entity_id,
    source_dataset,
    UPPER(TRIM(alias))
  );

CREATE INDEX IF NOT EXISTS idx_national_entity_aliases_entity
  ON national_entity_aliases (entity_id);

-- Relationship types used by this foundation (TEXT on national_relationships):
--   MEMBER_OF_GROUP          legal_insurer → insurance_group
--   USES_BRAND               legal_insurer → consumer_brand
--   APPOINTER_RESOLVES_TO    carrier (appointing entity) → legal_insurer | insurance_group
-- CONFIRMED APPOINTER_RESOLVES_TO only. REVIEW_REQUIRED bridges must not carry
-- regulatory_evidence.

ALTER TABLE national_entity_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_entity_aliases ENABLE ROW LEVEL SECURITY;
