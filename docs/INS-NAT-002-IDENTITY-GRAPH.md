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

## Credential natural key (INS-NAT-004)

`(jurisdiction, entity_kind, license_namespace, license_number)`

`license_namespace` is a closed set (`producer`, `bail_bond`, `adjuster`, `title`, `warranty`, `surplus_lines`, `tpa`, `limited_lines`, `other`). Not free-text class.

Existing DOI tables unique on license number per entity type (zero in-state duplicates). Namespace is for future distinct credential families that can share a displayed number.

## Identity

| Situation | Result |
|-----------|--------|
| Valid NPN + same entity kind + compatible name | CONFIRMED attach to one entity |
| Valid NPN + radical name conflict | REVIEW_REQUIRED; credential unattached |
| Valid NPN + person vs agency | REVIEW_REQUIRED; not merged |
| Clear source identity, missing NPN | **Provisional entity** owns the credential |
| Ambiguous source (no license # or no name) | **Unattached / UNRESOLVED** credential; no entity |
| Name, address, phone, DBA | Never identity keys |
| Two provisionals | Never auto-merge |
| Provisional later gets compatible NPN | Upgrade in place (or attach to existing compatible NPN entity) |
| Provisional later gets conflicting NPN/name/kind | REVIEW_REQUIRED; stays provisional |

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
