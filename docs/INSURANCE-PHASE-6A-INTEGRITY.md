# Insurance Trust Hub — Phase 6A: Directory Seed / Provenance Integrity

**Date:** 2026-08-07  
**Repo:** standalone `Insurance-trust-hub` (production apex)

## Summary

Every trust-bearing field is gated through provenance rules. Seed inventory never renders as verified research, never enters sitemaps, never opens contact forms.

## 1. Provenance model

- `lib/provenance/types.ts` — `ProvenanceClaim`, `PublicListingClass`, rules
- `lib/provenance/phone.ts` — 555 / fiction phone detection
- `lib/provenance/public-listing.ts` — `toPublicProviderView` / `toPublicHubAgentView`
- `lib/insurance/verification-levels.ts` — hard State license verified requires re-checkable number
- `lib/insurance/research-signals.ts` — Research Score null without minimum inputs

## 2. Placeholder cleanup

- Fallback catalog: no phones, ZIPs, licenses, ratings, or carriers
- Generated hub agents: `isVerified: false`, empty license, no scores/reviews
- `publicDisplayPhone` strips 555 on any remaining paths

## 3. License badges

- `InsuranceVerificationBadge` — verified / license on file / listing only
- Never “DOI Verified” / “NAIC Verified” without a number

## 4. Reviews

- Synthetic `buildFallbackReviews` no longer returned for seed or empty DB
- Duplicate review bodies filtered when DB reviews exist

## 5. Scores

- Trust/research score suppressed without re-checkable license
- Hub avg trust score is `null` for seed inventory

## 6. Indexation

- `/providers` directory: `noIndex: true` (seed catalog)
- Provider profiles: `noIndex` when listing class is seed
- Sitemap omits `fallback-*` providers

## 7. Contact policy (Path A)

- Lead forms only when `allowContactForm` → indexable research
- Seed/unverified: research CTAs only (verify license, methodology)

## 8. Hub / directory copy

- “Research insurance agencies in {place}”
- Honest inventory scarcity language
- Removed “Top Verified” / decorative score theater

## 9. Remaining limitations

- Curated hub data (`lib/hubs/data/*`) may still contain pseudo-license strings; cleaners reject them for badges
- Real Supabase-backed providers need operator backfill of license numbers + checkedAt before hard verified badges
- Full CMS Marketplace expansion still deferred until provenance is live on real rows

## Guardrail

```bash
node scripts/check-phase6a-integrity.mjs
```
