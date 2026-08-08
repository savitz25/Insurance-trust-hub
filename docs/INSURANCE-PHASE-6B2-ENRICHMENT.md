# Insurance Trust Hub — Phase 6B2: Google Places + BBB Enrichment

**Date:** 2026-08-07  
**Repo:** standalone `Insurance-trust-hub`  
**Depends on:** Phase 6A provenance + Phase 6B1 license promotion

## Goal

Enrich **only** `indexable_research` agencies with Google Places and BBB **secondary** snapshots.

## Hard rules

| Rule | Enforcement |
|------|-------------|
| Only indexable_research | `isEligibleForSecondaryEnrichment` |
| Never promote seed via Google/BBB | Eligibility rejects seed ids |
| Never hard license verified from Google/BBB | Verification levels license-only |
| Provenance-labeled snapshots | `contact.enrichment.google/bbb` |
| Weak/ambiguous match → skip | `pickBestMatch` / score thresholds |
| No AggregateRating from snapshots | `buildInsuranceAgencySchema` |

## Pipeline

```text
indexable_research profile
  → eligibility gate
  → Google Places text search (if GOOGLE_PLACES_API_KEY)
  → high-confidence identity match only
  → optional BBB manual profile (operator-attested)
  → write contact.enrichment
  → public “Secondary consumer signals” UI
```

## Storage

Nested under existing `providers.contact` JSON:

```json
{
  "phone": "...",
  "website": "...",
  "enrichment": {
    "google": {
      "placeId": "...",
      "rating": 4.6,
      "reviewCount": 120,
      "mapsUrl": "...",
      "checkedAt": "2026-08-08T16:00:00Z",
      "method": "automated",
      "matchConfidence": "high",
      "matchNotes": "..."
    },
    "bbb": {
      "profileUrl": "https://www.bbb.org/...",
      "rating": "A+",
      "accredited": true,
      "checkedAt": "...",
      "method": "manual",
      "matchConfidence": "high"
    },
    "lastRunAt": "...",
    "skipReasons": []
  }
}
```

## Admin

- UI: `/admin/enrichment`
- Requires session + Supabase admin
- Google optional via `GOOGLE_PLACES_API_KEY` in `.env`
- BBB: paste bbb.org URL + grade after human identity check

## Score impact

Research Score (when license gates pass):

- Google snapshot: max **12** points (was uncapped theater)
- BBB snapshot: max **6** points
- Only when `matchConfidence` high (Google) / high|medium (BBB)
- License evidence remains primary (up to 22)

## Public UI

- Section: **Secondary consumer signals**
- Copy: “Google rating snapshot as of [date]” / “BBB profile signal as of [date]”
- Disclaimer: not a state license determination
- Omitted when no enrichment

## Ops reporting (template)

| Metric | Count |
|--------|------:|
| Eligible indexable | |
| Enriched Google ok | |
| Enriched BBB ok | |
| Skipped weak/ambiguous | |
| Mismatch rejects | |

## Guardrails

```bash
node scripts/check-phase6b2-enrichment.mjs
```

## Batch results (this ship)

Tooling only — **0** live enrichments (no mass API runs; no invented matches).  
Run against real indexable rows after 6B1 promotions + API key.
