-- Phase 6B2: secondary enrichment is stored under contact.enrichment (jsonb).
-- contact is already jsonb on providers; no column change required.
-- This migration documents the contract for operators/ops.

COMMENT ON COLUMN providers.contact IS
  'ContactInfo JSON: phone, email, website, address, optional enrichment { google, bbb, lastRunAt, skipReasons }. Phase 6B2 secondary signals only for indexable_research entities.';
