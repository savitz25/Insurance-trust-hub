# Stage 0 — Network Trust Cleanup (Insurance Trust Hub)

See also Lender: `lender-trust-hub/docs/STAGE-0-NETWORK-TRUST-CLEANUP.md`

## Changes

### Seed purge (public)
- Directory queries never return FALLBACK seed catalog
- Provider profiles for seed / generated hub agents return null (404)
- Hub pages use `getPublicAgentsForHub` → only `indexable_research`
- Specialty topics filter to indexable only
- Sitemap provider list emptied of seed URLs

### CTA language
- Contact form: “Contact agency” + explicit non-marketplace disclosure
- Profile: “Visit website”; form framed as optional relay only

### Trust standard
- `NetworkResearchStandard` on `/providers`

## Expected public state
Until Supabase promotions produce `indexable_research` rows, public directories and hub agent lists may be empty — by design.
