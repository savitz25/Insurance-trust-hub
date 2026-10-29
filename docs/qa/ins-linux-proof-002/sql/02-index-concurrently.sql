-- Run outside a transaction, on PostgreSQL 17, after the synthetic load.
-- Direct session. Not the Production database.

CREATE INDEX CONCURRENTLY idx_providers_fl_hub_publication
  ON public.providers (publication_county_id, name, id)
  INCLUDE (publication_checked_at)
  WHERE verified = true
    AND states_licensed @> ARRAY['FL']::text[]
    AND publication_license_ok = true
    AND publication_source_ok = true
    AND publication_identity_accepted = true
    AND publication_bail_excluded = false
    AND publication_license_state IS NOT NULL
    AND publication_checked_at IS NOT NULL
    AND slug <> ''
    AND name <> '';
