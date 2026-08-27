# NAIC Listing of Companies (gitignored extracts)

Official NAIC LOC-JUN-2026 detailed listings. Do **not** commit the zip or extracted CSVs.

Source: https://content.naic.org/publications

Zip: https://content.naic.org/sites/default/files/publication-detail-list-companies-2026-jun.zip

Place:

```text
data/naic-raw/publication-detail-list-companies-2026-jun.zip
data/naic-raw/loc-jun-2026/*.csv
```

Parser: `lib/national/naic-listing.ts`  
Dry-run: `npx tsx scripts/national/audit-carrier-identity.ts`
