-- GB3: read-only completeness audit. No contact values leave this SELECT.
-- Mirrors countyMatchOrParts at main 88442dfb950cfd1d86af9247c8aadec4726a9003.
WITH counties(id,display,normalized,patterns) AS (VALUES ('miami_dade','Miami-Dade','MIAMI-DADE',ARRAY['%Miami-Dade County%','%Miami Dade County%','%Dade County%']::text[]),('broward','Broward','BROWARD',ARRAY['%Broward County%']::text[]),('palm_beach','Palm Beach','PALM-BEACH',ARRAY['%Palm Beach County%']::text[]),('duval','Duval','DUVAL',ARRAY['%Duval County%']::text[]),('hillsborough','Hillsborough','HILLSBOROUGH',ARRAY['%Hillsborough County%']::text[]),('orange','Orange','ORANGE',ARRAY['%Orange County%']::text[]),('osceola','Osceola','OSCEOLA',ARRAY['%Osceola County%']::text[]),('seminole','Seminole','SEMINOLE',ARRAY['%Seminole County%']::text[]),('pinellas','Pinellas','PINELLAS',ARRAY['%Pinellas County%']::text[]),('pasco','Pasco','PASCO',ARRAY['%Pasco County%']::text[])),
base AS MATERIALIZED (
SELECT id,name,contact->>'launch_county_id' AS county_id,contact->>'county' AS county,contact->>'county_normalized' AS county_normalized,short_description,
coalesce(jsonb_typeof(contact)='object',false) AS contact_is_object
FROM public.providers WHERE verified=true AND states_licensed @> '{FL}'),
signals AS MATERIALIZED (
SELECT b.*,ARRAY(SELECT c.id FROM counties c WHERE b.county=c.display OR b.county_normalized=c.normalized) AS structured_ids,
ARRAY(SELECT c.id FROM counties c WHERE b.short_description ILIKE ANY(c.patterns)) AS text_ids
FROM base b),
classified AS MATERIALIZED (
SELECT s.*,ARRAY(SELECT c.id FROM counties c WHERE s.county_id=c.id OR c.id=ANY(s.structured_ids) OR c.id=ANY(s.text_ids)) AS matched_ids
FROM signals s),
scopes(kind,label,ids) AS (VALUES
('county','miami_dade',ARRAY['miami_dade']::text[]),('county','broward',ARRAY['broward']::text[]),('county','palm_beach',ARRAY['palm_beach']::text[]),('county','duval',ARRAY['duval']::text[]),('county','hillsborough',ARRAY['hillsborough']::text[]),('county','orange',ARRAY['orange']::text[]),('county','osceola',ARRAY['osceola']::text[]),('county','seminole',ARRAY['seminole']::text[]),('county','pinellas',ARRAY['pinellas']::text[]),('county','pasco',ARRAY['pasco']::text[]),
('hub','miami-dade',ARRAY['miami_dade']::text[]),('hub','miami-fort-lauderdale',ARRAY['miami_dade','broward','palm_beach']::text[]),('hub','broward-county',ARRAY['broward']::text[]),('hub','broward',ARRAY['broward']::text[]),('hub','palm-beach-county',ARRAY['palm_beach']::text[]),('hub','jacksonville',ARRAY['duval']::text[]),('hub','tampa',ARRAY['hillsborough','pinellas','pasco']::text[]),('hub','orlando',ARRAY['orange','osceola','seminole']::text[]))
SELECT jsonb_build_object(
'audit_at',current_timestamp,'all_verified_fl_rows',(SELECT count(*) FROM base),
'fl_launch_rows_total',(SELECT count(*) FROM classified WHERE cardinality(matched_ids)>0),
'launch_county_id_present',(SELECT count(*) FROM classified WHERE cardinality(matched_ids)>0 AND nullif(btrim(county_id),'') IS NOT NULL),
'text_only_rows_requiring_backfill',(SELECT count(*) FROM classified WHERE cardinality(matched_ids)>0 AND nullif(btrim(county_id),'') IS NULL AND cardinality(structured_ids)=0 AND cardinality(text_ids)>0),
'missing_id_all_fallback_rows',(SELECT count(*) FROM classified WHERE cardinality(matched_ids)>0 AND nullif(btrim(county_id),'') IS NULL),
'ambiguous_rows',(SELECT count(*) FROM classified WHERE cardinality(matched_ids)>1),
'nonempty_conflicting_or_invalid_ids',(SELECT count(*) FROM classified WHERE cardinality(matched_ids)>0 AND nullif(btrim(county_id),'') IS NOT NULL AND (cardinality(matched_ids)>1 OR NOT county_id=ANY(matched_ids))),
'duplicate_provider_ids',(SELECT count(*)-count(DISTINCT id) FROM classified WHERE cardinality(matched_ids)>0),
'per_scope',(SELECT jsonb_agg(to_jsonb(t) ORDER BY kind,label) FROM (
 SELECT s.kind,s.label,
 count(c.id) AS total_currently_matched_by_existing_logic,
 count(c.id) FILTER (WHERE c.county_id=ANY(s.ids)) AS matched_by_launch_county_id,
 count(c.id) FILTER (WHERE c.text_ids && s.ids AND NOT coalesce(c.county_id=ANY(s.ids),false) AND NOT c.structured_ids && s.ids) AS matched_only_by_text_fallback,
 count(c.id) FILTER (WHERE nullif(btrim(c.county_id),'') IS NULL) AS missing_launch_county_id,
 count(c.id) FILTER (WHERE nullif(btrim(c.county_id),'') IS NOT NULL AND NOT c.county_id=ANY(s.ids)) AS conflicting_launch_county_id,
 count(c.id) FILTER (WHERE c.text_ids && s.ids AND cardinality(c.text_ids)>1) AS ambiguous_text_fallback,
 count(c.id)-count(DISTINCT c.id) AS duplicate_provider_ids
 FROM scopes s LEFT JOIN classified c ON c.matched_ids && s.ids
 GROUP BY s.kind,s.label
) t)) AS audit;
