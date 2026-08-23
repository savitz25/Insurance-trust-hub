# Ask Network Discovery — Insurance Trust Hub pilot

**Status:** PILOT / NOT YET CONSUMED BY ASK PRODUCTION  
**Amendment:** ASK-SEARCH-INSURANCE-001.1 (provider legitimacy + classification quality)

This document describes the InsuranceTrustHub-only discovery source and the
read-only `ask-network-discovery-v1` export. It does **not** modify AskTrustHub,
copy the feed into Ask, create Ask APIs, create Universal Search UI, deploy, or
create production sync jobs.

Generated from `providers` + curated `CARRIER_REGISTRY`. Fingerprint and counts
are recorded in `data/network-discovery/insurance-discovery-pilot.report.json`.

## Source architecture

Canonical searchable inventory is the **`providers` table**, not separate
agency / agent / carrier / Medicare tables.

| Source | Role | Discovery? |
| --- | --- | --- |
| `providers` | Public directory rows. `provider_type` is `independent_agent` \| `brokerage` \| `specialist`. | Yes, if TrustState is `verified` |
| `CARRIER_REGISTRY` (`lib/carriers/registry.ts`) | Curated carrier research pages at `/carriers/{slug}` | Yes (14 brands). No NAIC on the registry |
| Hub agent catalogs (`lib/hubs`, `types/agent.ts`) | Seed / curated. `resolveHubAgentTrustState` is always `pending_verification` | **No** |
| Staging producer tables (`dfs_producers`, `tdi_producers`, …) | Import/promote only. NPN lives here, not on `providers` | **No** (not public profiles) |
| PPEF / NPI index | Optional gitignored Medicare NPI corpus | **No** |

Public directory gates (`getProviders` / `getProviderBySlug`) are reused:
`verified=true` plus `resolveProviderTrustState` → `verified` (license number,
2-letter state, regulator source, fresh `checkedAt` ≤ 365 days, identity match
accepted, non-seed id).

## Counts

Live snapshot used for this pilot (no Google Places, LLM, or geocoding):

| | Count |
| --- | ---: |
| `providers` rows | 105,520 |
| Curated carriers | 14 |
| Source rows | 105,534 |
| Eligible | 105,378 |
| Ineligible | 156 (missing/malformed slug → invalid profile URL) |
| Pilot selected | 180 |

`provider_type` on every live `providers` row in this snapshot: **`brokerage`**.
`independent_agent` and `specialist` counts are **0**. That is the stored
product model (state DOI promotes business entities as `brokerage`). It is not
padded.

## Identity

Never name-only.

| Kind | Pattern | When |
| --- | --- | --- |
| DOI license | `insurance:doi:{ST}:{license}` | Public row has re-checkable license + jurisdiction |
| NPN | `insurance:npn:{npn}` | Only if NPN is present on the evaluated row (not inferred) |
| Provider UUID | `insurance:provider:{uuid}` | Fallback; not used for this verified cohort |
| Carrier slug | `insurance:carrier:{slug}` | Curated registry; NAIC is not in source |

This pilot: **166 DOI** + **14 carrier slug**. NPN is not copied onto
`providers` at promote time, so DOI is the public identity.

Duplicate DOI keys (same license promoted more than once) are disambiguated
deterministically with `:src:{providers.id}`.

## Entity types

| Source `provider_type` | Exported `entity_type` |
| --- | --- |
| `brokerage` | `insurance_brokerage` |
| `specialist` | `insurance_agency` |
| `independent_agent` | `insurance_agent` |
| carrier registry | `insurance_carrier` |
| *(never)* | `medicare_agent` |

Query examples that say “agencies” match **agency-like** types:
`insurance_agency` **or** `insurance_brokerage`. The product does not store a
separate agency-vs-brokerage consumer class; DFS/TDI business rows are
`brokerage`.

Pilot mix: 166 `insurance_brokerage` + 14 `insurance_carrier`. Zero agents,
zero `medicare_agent`.

## Geography

Physical and licensed geography are separate fields. Statewide license is
**not** an office.

| Field | Source | Not |
| --- | --- | --- |
| `physical_location.city/state/postal_code` | `contact.address` (city may fall back to `cities[0]` if it is a real city) | `states_licensed` |
| `physical_location.county` | `contact.county` | |
| `licensed_service_states` | `states_licensed` ∪ license jurisdiction | Home office metadata |
| `license_state` | `license_info.licenses[0].state` | `home_address_state` |

`home_address_state` / non-resident flags are **not** exported as a second
verified license. US state names used as city (“Florida”) are rejected.

Example in this pilot: Triumph Ins Group Inc is `insurance:doi:NV:1012968`
(NV license) with **physical** Dallas, TX. It matches “insurance agencies
Dallas TX” on physical city/state, not because of NV licensing.

## Categories

Exported only if already stored on `providers.categories` and in the canonical
list: homeowners, auto, health, medicare, renters, life, umbrella, flood.

Never inferred: medicare from health LOA, flood from homeowners, auto from
“personal lines” at export time (promote-time mapping already happened).

Pilot category occurrences (an entity may have several): health 149, auto 51,
homeowners 51, flood 1, life 1, medicare 1, renters 1, umbrella 1.

## Medicare readiness

**UNSUPPORTED** as an entity class (`medicare_agent`).

- No first-class Medicare-agent table
- DFS LOA must never imply Medicare (`lib/dfs/loa.ts`)
- `categories` may include `medicare` as a **tag** (`medicare_category: true`)
- PPEF NPI presence is not CMS enrollment evidence for discovery
- Hub “Medicare Specialists” seed specialty is not eligibility

## Eligibility (fail-closed)

A provider is eligible only if all of:

1. Non-seed id
2. `verified === true`
3. TrustState `verified` (same gates as the public directory)
4. Display name present
5. Slug matches `[a-z0-9]+(?:-[a-z0-9]+)*`
6. Canonical HTTPS profile URL on `www.insurancetrusthub.com`
7. Stable identity (DOI/NPN/UUID as above)
8. **Discovery legitimacy** (`evaluateDiscoveryLegitimacy`) — consumer-facing insurance entity

Carriers: registry slug + display name + `/carriers/{slug}` URL.

### Discovery legitimacy gate (001.1)

Answers: *Is this a defensible consumer-facing insurance entity for Ask?*

| Fail reason | Rule (source fields only) |
| --- | --- |
| `title_or_adjuster_only` | Specialties title/adjuster-only **or** license type title-agency / adjuster class |
| `incidental_license_holder` | License type automobile/home warranty **or** incidental primary-business name (dealer/realty/…) **without** insurance-name tokens |
| `unsupported_license_class` | Other excluded class text (TPA, reinsurer, insurer, appraiser, …) |
| `insufficient_insurance_business_evidence` | No consumer agency specialty and no insurance-name evidence |

Positive signals: insurance/agency/broker name tokens, captive carrier-local agency names, or consumer specialties (Agency, P&C, Personal Lines, Health, Life) when the name is not incidental.

**Not used:** Premium/payment, ratings, reviews, popularity, subjective quality.

**Does not mutate** `providers`. Fail closed at discovery export only.

### AutoNation Chevrolet Coral Gables

| Field | Value |
| --- | --- |
| License | FL `A000425` |
| License type | **AUTOMOBILE WARRANTY** |
| Stored type | `brokerage` (DFS business promote) |
| Categories | `homeowners`, `auto` (promote LOA → personal_lines → both) |
| Classification | **INCIDENTAL_LICENSE_HOLDER** |
| Discovery | ineligible |

Verified DOI license ≠ consumer insurance agency for Ask “homeowners agencies” queries.

## Pilot selection

Target 180 (allowed 100–250). Eligible rows are sorted by `network_id`, grouped
by `license_state` (else physical state, else `ZZ`), then round-robin. Small
groups exhaust; leftover slots fill from remaining groups. Counts are **not**
padded to equality.

This cohort’s license jurisdictions: FL 40, NV 40, OH 40, TX 40, MS 5, MO 1,
plus 14 carriers with no license state.

## Query readiness (this feed, not the full universe)

Ambiguous consumer language such as **“insurance company near me”** is Ask’s
job. This feed does not establish a default interpretation.

| Query | Matches | Why |
| --- | ---: | --- |
| Medicare agents Indiana | 0 | `medicare_agent` is UNSUPPORTED. A `medicare` category tag is not that class. |
| homeowners insurance agencies Miami FL | 1 | AutoNation Chevrolet Coral Gables: agency-like + `homeowners` + physical MIAMI, FL |
| auto insurance agencies Texas | 36 | Agency-like + `auto` + TX `licensed_service_state` (not claimed as a specific city office) |
| insurance agencies Dallas TX | 1 | Triumph Ins Group Inc: physical Dallas, TX. NV license is **not** the Dallas evidence |
| insurance carriers Florida | 0 | Registry has no physical or licensed FL field. “Florida Blue” is not treated as service geography |
| flood insurance agencies Miami | 0 | No explicit `flood` + physical Miami in this 180-row cohort. Flood is not inferred |

## Profile URL contract

Only:

- `https://www.insurancetrusthub.com/providers/{slug}`
- `https://www.insurancetrusthub.com/carriers/{slug}`

Rejected: HTTP, localhost, `*.vercel.app`, other TrustHub hosts, query/hash,
malformed paths, userinfo, non-default ports.

## Security / data minimization

Export omits: emails, phones, SSNs, credentials, payment/Premium fields,
Trust Score, ratings, reviews, popularity/ranking boosts, internal notes,
private agent records, raw regulator blobs, PPEF NPI index.

## Stability

Publisher run twice on the same snapshot:

- membership drift = 0
- identity drift = 0
- content fingerprint drift = 0

`generated_at` is volatile and excluded from the fingerprint.

Fingerprint:
`e8bfad58d39a4ad92d6b90328782e81b42d16c4d210eaf47c4c1a50a828b68ed`

## External calls

Google Places 0 · LLM 0 · external geocoding 0 · new enrichment APIs 0.

## Known limitations

- Live `providers` inventory is entirely `brokerage`; individual agents are not
  in the public table.
- NPN is not on the public row.
- Carriers have no NAIC, HQ, or licensed-state fields.
- Medicare entity class cannot be represented honestly.
- `states_licensed` is often a single DOI jurisdiction (including non-resident
  licenses), not a full multi-state appointment map.
- Pilot is a 180-row sample, not the 105k eligible universe.
- Not consumed by Ask production.

## Artifact

`data/network-discovery/insurance-discovery-pilot.v1.json`

```json
{
  "schema_version": "ask-network-discovery-v1",
  "hub": "insurance",
  "generated_at": "...",
  "source_version": "...",
  "entity_count": 180,
  "fingerprint": "...",
  "banner": "PILOT / NOT YET CONSUMED BY ASK PRODUCTION",
  "entities": []
}
```

Regenerate: `npm run discovery:export-pilot`

Tests: `npm run test:network-discovery`
