# InsuranceTrustHub specialist execution V2 readiness

Audit date: 2026-09-01  
Repository: `savitz25/Insurance-trust-hub`  
Audited `origin/main`: `a758a34812dc47a119156ce12d3be74cd8552e0b`  
Production deployment: `dpl_DCChTiDXtipK6AJGhC3kQMc5WNaa` (`READY`, same Git SHA)  
Current endpoint/contract: `GET /api/ask`, `insurance-ask-v1`

This is a read-only capability audit. It authorizes no ingestion, identity creation,
publication expansion, or AskTrustHub change.

## Executive classification

| Entity class | Classification | Reason |
| --- | --- | --- |
| Agency | `SMALL_ADAPTER_REQUIRED` | V1 already returns bounded, paginated agency census rows for supported credential jurisdictions, but not the normalized V2 envelope or public profile destinations. |
| Producer/person | `BLOCKED_BY_PUBLICATION_POLICY` plus `SMALL_ADAPTER_REQUIRED` for private-safe identifier/count responses | Public producer profiles are intentionally zero. Labeled NPN lookup and constrained counts exist; public row/deep-link execution must remain unavailable. |
| Legal insurer | `SMALL_ADAPTER_REQUIRED` for exact NAIC and the 26-profile Wave-1 cohort; `BLOCKED_BY_MISSING_DATA` for state/domicile cohorts | The graph has 6,185 identities, but only 26 are public profiles and the accepted extract does not provide a complete domicile field for cohort execution. |

## V2 field matrix

| V2 field | Status | Current evidence / gap |
| --- | --- | --- |
| Structured requests | `ALREADY_SUPPORTED` | Deterministic interpreter separates entity, identifier, count, aggregate, comparison, evidence, definition, and fail-closed modes. |
| Entity classes | `ALREADY_SUPPORTED` | `agency`, `person`, and `insurer` remain distinct. |
| Identifiers | `ALREADY_SUPPORTED` | Labeled NPN and labeled NAIC company code; bare digits fail closed. |
| Required slots | `SUPPORTED_BUT_NOT_NORMALIZED` | V1 parser validates class, identifier, jurisdiction, LOA, and evidence intent, but does not expose the V2 slot declaration. |
| Geography | `ALREADY_SUPPORTED` for agency/person credential jurisdictions; `REQUIRES_NEW_DATA` for insurer domicile cohorts | FL, TX, MA, OH, and VT credential-jurisdiction data exist. Credential jurisdiction is not office, domicile, or service territory. |
| Actual bounded rows | `ALREADY_SUPPORTED` for agencies and exact identifiers | Page size is 20. Producer rows cannot become public directory rows. Insurer cohort rows are constrained by the Wave-1 gate. |
| Totals | `ALREADY_SUPPORTED` | V1 returns deterministic totals and count grain. |
| Pagination | `ALREADY_SUPPORTED` | Page, page size, total, and `hasMore`. |
| Refinements | `SUPPORTED_BUT_NOT_NORMALIZED` | Entity class, credential jurisdiction, selected LOA, and plan-year/evidence paths exist but are not emitted as V2 `availableRefinements`. |
| Provenance | `ALREADY_SUPPORTED` | Source family, geography meaning, official-as-of, grain, metric, exclusions, and identifier method are present. |
| Source clocks | `ALREADY_SUPPORTED` | Locked census clock is `2026-08-28T14:43:51.753Z`; row/evidence clocks are retained where supplied. |
| Limitations | `ALREADY_SUPPORTED` | Explicit class, geography, appointment, marketplace, and publication limitations. |
| Structured unsupported response | `SUPPORTED_BUT_NOT_NORMALIZED` | `fail_closed` is deterministic, but V2 needs stable status/error code and alternatives fields. |
| Canonical destinations | `ALREADY_SUPPORTED` only for published legal insurers; `PROHIBITED_BY_PUBLICATION_GATE` for producer and graph-agency profiles | Exact NAIC 10064 resolves to `/insurers/citizens-property-insurance-corporation`; graph agency/person rows correctly have no profile URL. |
| Public-only filtering | `ALREADY_SUPPORTED` for profile destinations | Public links are never minted for non-published identities. Research rows and publication are explicitly distinct. |

## Production golden queries

| Query | Safe outcome observed | Classification |
| --- | --- | --- |
| `insurance company in Texas` | Structured `fail_closed`, zero rows. Complete legal-insurer domicile is unavailable. | `UNSUPPORTED` / `REQUIRES_NEW_DATA` |
| `insurance agencies in Florida` | 20 bounded rows from 56,939 canonical agencies with FL credential jurisdiction; no profile links. | `ROWS` |
| labeled NPN lookup | Exact class-preserving identifier lookup is supported; unknown NPN returns zero without invention. | `ROWS` or truthful zero; producer publication still prohibited |
| `Find insurer NAIC code 10064` | One legal-insurer identity with its Wave-1 canonical profile. | `ROWS` |
| `insurance agents in Florida` | Current wording fails closed; the contract supports a constrained Florida-credentialed-person count and labeled NPN lookup, not a public people directory. | `CLARIFICATION` / `HANDOFF` |

## Publication and semantic firewalls

- Agency is not producer and is not legal insurer.
- NPN identifies a person or organization only after source class resolution; it is not an endorsement.
- Credential jurisdiction is not recorded office, domicile, or service territory.
- Line of authority is not appointment. Appointment is not employment.
- Complaint is not a violation; examination is not enforcement.
- Marketplace evidence is not a state license or certification.
- Public producer profiles remain `0`.
- Graph-agency public profiles remain `0`; the separate public directory inventory is not silently equated with the canonical graph.
- Legal-insurer profiles remain the accepted Wave-1 cohort of `26`, not all `6,185` graph identities.

## Recommended implementation ticket

`INS-CAP-001 — InsuranceTrustHub specialist execution V2 adapter`

Build a thin adapter around `insurance-ask-v1`; do not duplicate its query engine.
Normalize request slots, result statuses, refinements, provenance, pagination, and
publication-aware destinations. Preserve class-specific exposure. Return a stable
unsupported-data response for insurer domicile/state cohorts. Keep producer and graph
agency destinations unavailable until a separate publication-policy decision.

Estimated size: small adapter (roughly 2–4 focused engineering days), excluding any
new domicile dataset or publication-policy work.

## Safety result

DB writes: `0`  
Identity delta: `0`  
Public profile delta: `0`  
Sitemap delta: `0`  
AskTrustHub changes: `0`
