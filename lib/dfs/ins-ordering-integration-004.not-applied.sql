-- INS-ORDERING-INTEGRATION-004
-- Reviewed dependency packet. DO NOT APPLY.
-- This file is not a Supabase migration and must not be copied into
-- supabase/migrations. No Production DDL, index, backfill, collation
-- change, or grant is authorized by this text.
--
-- Why this object is required:
-- The hub read uses PostgREST .order('name').order('id'). That client
-- writes order=name.asc,id.asc. It cannot send ORDER BY normalize(name, NFC).
-- A computed field is the smallest PostgREST-visible key. The argument is
-- unnamed so PostgREST exposes provider_name_nfc on providers and does not
-- expose an /rpc endpoint. select=* does not return the field, so the
-- stored and displayed name stays providers.name.
--
-- Measured on the disposable Windows cluster only (PostgreSQL 17.6, ICU
-- en-US, datcollate English_United States.1252, 41492 synthetic rows,
-- miami_dade 9630). These timings are not Supabase latency and are not a
-- Linux collation proof.
--   anon ORDER BY name, id: page 19.403 ms, OFFSET 9600 34.345 ms, both sort
--   anon ORDER BY normalize(name, NFC), id: page 32.514 ms, deep 48.177 ms
--   anon SELECT *: raw page 19.561 ms, raw deep 52.041 ms,
--     NFC page 36.685 ms, NFC deep 76.713 ms
--   provider_name_nfc(providers) inlines to NORMALIZE(name, NFC)
--
-- An expression index on (contact->>'launch_county_id', normalize(name, NFC), id)
-- was created and dropped on that disposable database. The owner plan was an
-- Index Scan with no Sort. The anon plan, which is the PostgREST role, still
-- sorted: contact->> is not leakproof, so row-level security does not use it
-- as an index condition. Do not add that index for this read path.
-- A stored generated column would rewrite the table and is not required for
-- correctness at this size. A view is not required.
--
-- After this function is present in the exposed schema, the app change is
-- one switch, on both sides:
--   .order('provider_name_nfc').order('id')
--   compareFloridaHubOrder uses name.normalize('NFC')
-- Shipping only the comparator leaves single-county SQL pages on raw name
-- order. Shipping only the .order() call before this function exists makes
-- the hub read fail.

CREATE FUNCTION public.provider_name_nfc(public.providers)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT normalize($1.name, NFC);
$$;

REVOKE ALL ON FUNCTION public.provider_name_nfc(public.providers) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_name_nfc(public.providers) TO anon, authenticated, service_role;
