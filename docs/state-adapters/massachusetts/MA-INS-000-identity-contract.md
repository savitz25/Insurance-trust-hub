# MA-INS-000 — identity contract

ONE ENTITY, MANY CREDENTIALS. Massachusetts evidence attaches to the **existing national graph**.

## Join order

1. **CONFIRMED** — exact canonical NPN to `national_entities` (agency or person). Dry-run: **7,059 agencies, 0 persons**.
2. **HIGH_CONFIDENCE** — not used. License number is not a national identity key.
3. **REVIEW_REQUIRED** — NPN kind conflict (person+agency), carrier-owned NPN, or net-new without official entity type.
4. **UNRESOLVED** — missing/invalid NPN, or NPN not in graph (net-new candidate). Dry-run: **2,089** NPNs not in graph.

Name, email, phone, and address **never** merge entities.

## Rules (tested)

1. Same NPN → same national entity.
2. Same name / different NPN → separate entities (3 names map to multiple NPNs; not merged).
3. Same email / different NPN → separate (525 emails shared; observations only).
4. Domicile state ≠ Massachusetts license jurisdiction.
5. License class ≠ LOA.
6. Multiple LOAs do not duplicate the entity.
7. Multiple licenses do not duplicate the entity (0 NPN with multiple LICENSE_NO in this file).
8. Active uses `LICENSE_STATUS`, not expiration.
9. Expiration-before-today does not flip status.
10–11. Phone/email/address are separate observations; not overwritten.
12. Name never overrides NPN.
13. No `WORKS_FOR` from shared address/email/phone.
14. Individuals are not public (`PUBLIC_PERSON_PROFILES_ENABLED=false`). Matched persons would be INTERNAL_ONLY; none matched.
15. No sitemap/robots/`/massachusetts` launch.

## Publication classes (dry-run)

| Class | Count | Meaning |
|-------|------:|---------|
| READY_FOR_GRAPH | 7,059 | Existing agency + exact NPN + Active MA producer credential + LOAs + contacts |
| INTERNAL_ONLY | 0 | Would apply to CONFIRMED persons |
| REVIEW_REQUIRED | 2,089 | Net-new NPN; no official entity type |
| NOT_READY | 0 | |

MA-INS-001 should ingest **READY_FOR_GRAPH** only unless a later task confirms net-new entity kind.

## Collisions (measured, not fuzzy-resolved)

| Pattern | Count |
|---------|------:|
| Same NPN / different names | 0 |
| Same license / multiple NPN | 0 |
| Same email / multiple NPN | 525 |
| Same phone / multiple NPN | 452 |
| Same address / multiple NPN | 472 |
| Same name / multiple NPN | 3 |
| Conflicting status/expiration on one license | 0 |
| Malformed NPN | 0 |

Shared contacts are compatible with clusters/agencies. They are **not** identity.

## Cross-state reuse

This adapter is the template for other DOI extracts:

- Detect headers; do not bake filenames.
- Grain: license row + packed or repeating LOA.
- CONFIRMED join = NPN only.
- Status from source column.
- Contacts as observations.
- Domicile ≠ license state.
- Staging → identity → graph candidates → publication gate.

Florida DFS, Texas TDI, and others already follow the same national tables (`national_entities`, `license_credentials`, `loa_observations`, `contact_observations`). Massachusetts must not become a silo.
