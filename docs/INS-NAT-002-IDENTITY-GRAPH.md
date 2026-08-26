# INS-NAT-002 — National identity + credential graph

Additive spine beside `public.providers`. Providers remain the public projection. No bulk merge.

## Principle

`ENTITY → has → CREDENTIALS`  
not `CREDENTIAL → becomes → ENTITY`.

## Tables

See `supabase/migrations/20260826120000_national_identity_graph.sql`.

Migration fingerprint `ins-nat-002-v1`. Apply in Supabase SQL Editor (additive, no `providers` DDL). Not auto-applied to production from this task.

- `national_entities` (person | agency | carrier)
- `license_credentials`
- `loa_observations`
- `contact_observations`
- `national_relationships`
- `certification_observations` (empty-capable)
- `regulatory_evidence` (stub; INS-NAT-008)
- `national_identity_conflicts`
- `provider_entity_bridges`
- `source_record_links`

All RLS enabled, no public policies.

## Identity

| Situation | Result |
|-----------|--------|
| Valid NPN + same entity kind + compatible name | CONFIRMED attach to one entity |
| Valid NPN + radical name conflict | REVIEW_REQUIRED; credential unattached |
| Valid NPN + person vs agency | REVIEW_REQUIRED; not merged |
| Missing / invalid NPN | Provisional entity keyed by `source:jurisdiction:kind:license` |
| Name, address, phone, DBA | Never identity keys |

## Freshness

Independent fields on `license_credentials`:

- `regulatory_status` — what the source said
- `expiration_date` / `issue_date` / `effective_date` — regulator dates
- `source_observed_at` — source snapshot time
- `ingested_at` — Trust Hub check/import time

Stale `ingested_at` does not rewrite status to expired.

## Publication

`PUBLIC_PERSON_PROFILES_ENABLED = false`.  
`evaluatePromotionEligibility` rejects `entity_type = individual` even with `--entity all`.

## Slug protection

Promote scripts use `resolveLegacyProviderWrite`. Update only when jurisdiction + license match. Collision → insert with disambiguated slug. Existing public slugs are not rewritten.

## Rollback

Drop graph tables in reverse order. `providers` is untouched. `provider_entity_bridges` is the only FK from graph → providers.

## Tests

```bash
npm run check:ins-nat-002
```
