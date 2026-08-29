-- INS-HOME-003B — read-only SQL lock of canonical agency × distinct-state rollup.
-- db_writes = 0. No functions, views, migrations, or temp objects.
-- Run inside: BEGIN READ ONLY; ... COMMIT;
--
-- Cohort (production-audited columns on public.license_credentials / public.national_entities):
--   agency credential rows with attached entity_id
--   CONFIRMED/HIGH_CONFIDENCE attribution on the credential
--   CONFIRMED/HIGH_CONFIDENCE identity on the agency entity
--   two-letter jurisdiction after upper(trim(...))
--   accepted source families currently present: FL/TX/VT/MA/OH
-- Person credentials, appointments, domicile, addresses, CMS, Medicare are not in this table join.

-- Q0. Extra-source detector. Must return zero rows before locking.
SELECT
  c.source_dataset,
  upper(trim(c.jurisdiction)) AS jurisdiction,
  COUNT(*)::bigint AS credential_rows
FROM license_credentials c
WHERE c.entity_kind = 'agency'
  AND c.entity_id IS NOT NULL
  AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
  AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
  AND c.source_dataset NOT IN (
    'florida_dfs',
    'texas_tdi',
    'vermont_dfr',
    'massachusetts_doi_regulatory',
    'ohio_odi'
  )
GROUP BY 1, 2
ORDER BY 1, 2;

-- Q1. Source census (accepted attachment conditions, all 2-letter jurisdictions).
SELECT
  c.source_dataset,
  upper(trim(c.jurisdiction)) AS jurisdiction,
  c.entity_kind::text AS entity_kind,
  COUNT(*)::bigint AS credential_rows,
  COUNT(DISTINCT c.entity_id)::bigint AS unique_entities
FROM license_credentials c
INNER JOIN national_entities e ON e.id = c.entity_id
WHERE c.entity_kind = 'agency'
  AND e.entity_kind = 'agency'
  AND c.entity_id IS NOT NULL
  AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
  AND e.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
  AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
GROUP BY c.source_dataset, upper(trim(c.jurisdiction)), c.entity_kind
ORDER BY jurisdiction, source_dataset;

-- Q2. D1 canonical agency universe.
SELECT COUNT(*)::bigint AS d1
FROM national_entities
WHERE entity_kind = 'agency';

SELECT COUNT(*)::bigint AS d1_accepted
FROM national_entities
WHERE entity_kind = 'agency'
  AND identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE');

-- Q3. Canonical single-pass lock query.
WITH eligible AS (
  SELECT
    c.entity_id,
    upper(trim(c.jurisdiction)) AS jurisdiction
  FROM license_credentials c
  INNER JOIN national_entities e ON e.id = c.entity_id
  WHERE c.entity_kind = 'agency'
    AND e.entity_kind = 'agency'
    AND c.entity_id IS NOT NULL
    AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND e.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
    AND c.source_dataset IN (
      'florida_dfs',
      'texas_tdi',
      'vermont_dfr',
      'massachusetts_doi_regulatory',
      'ohio_odi'
    )
),
agency_states AS (
  SELECT
    entity_id,
    COUNT(DISTINCT jurisdiction) AS state_count
  FROM eligible
  GROUP BY entity_id
),
pairs AS (
  SELECT DISTINCT entity_id, jurisdiction
  FROM eligible
),
summary AS (
  SELECT
    COUNT(*)::bigint AS d2,
    COUNT(*) FILTER (WHERE state_count = 1)::bigint AS one_state,
    COUNT(*) FILTER (WHERE state_count = 2)::bigint AS two_states,
    COUNT(*) FILTER (WHERE state_count BETWEEN 3 AND 4)::bigint AS three_four_states,
    COUNT(*) FILTER (WHERE state_count BETWEEN 5 AND 9)::bigint AS five_nine_states,
    COUNT(*) FILTER (WHERE state_count >= 10)::bigint AS ten_plus_states
  FROM agency_states
)
SELECT
  s.d2,
  s.one_state,
  s.two_states,
  s.three_four_states,
  s.five_nine_states,
  s.ten_plus_states,
  (SELECT COUNT(*) FROM pairs)::bigint AS d3,
  (SELECT COUNT(*) FROM eligible)::bigint AS d4
FROM summary s;

-- Q4. Equivalent D3 via COUNT(DISTINCT ROW(...)).
WITH eligible AS (
  SELECT
    c.entity_id,
    upper(trim(c.jurisdiction)) AS jurisdiction
  FROM license_credentials c
  INNER JOIN national_entities e ON e.id = c.entity_id
  WHERE c.entity_kind = 'agency'
    AND e.entity_kind = 'agency'
    AND c.entity_id IS NOT NULL
    AND c.attribution_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND e.identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')
    AND upper(trim(c.jurisdiction)) ~ '^[A-Z]{2}$'
    AND c.source_dataset IN (
      'florida_dfs',
      'texas_tdi',
      'vermont_dfr',
      'massachusetts_doi_regulatory',
      'ohio_odi'
    )
)
SELECT
  COUNT(*)::bigint AS d4,
  COUNT(DISTINCT entity_id)::bigint AS d2,
  COUNT(DISTINCT ROW(entity_id, jurisdiction))::bigint AS d3
FROM eligible;

-- Q5. Source clocks (agency credential rows only).
SELECT
  source_dataset,
  COUNT(*)::bigint AS rows,
  MIN(source_observed_at) AS source_observed_min,
  MAX(source_observed_at) AS source_observed_max,
  MIN(ingested_at) AS ingested_min,
  MAX(ingested_at) AS ingested_max,
  MIN(updated_at) AS updated_min,
  MAX(updated_at) AS updated_max
FROM license_credentials
WHERE entity_kind = 'agency'
GROUP BY source_dataset
ORDER BY source_dataset;
