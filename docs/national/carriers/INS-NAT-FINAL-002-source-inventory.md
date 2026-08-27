# INS-NAT-FINAL-002 — Official source inventory

National carrier identity foundation. Florida state rollout (`FL-INS-000+`) is not started.

## Canonical legal-insurer source

| Field | Value |
|-------|--------|
| Authority | National Association of Insurance Commissioners (NAIC) |
| Product | LOC-JUN-2026 — 2026 June Detailed Listings of Companies |
| Page | https://content.naic.org/publications |
| File | https://content.naic.org/sites/default/files/publication-detail-list-companies-2026-jun.zip |
| Local (gitignored) | `data/naic-raw/publication-detail-list-companies-2026-jun.zip` extracted to `data/naic-raw/loc-jun-2026/` |
| Grain | One row per company in a statement blank (Property, Life, Health, Title, Fraternal, Other) |
| Legal identity | `COMPANY CODE` = NAIC company code (5-digit) |
| Group identity | `GROUP CODE` on company rows; `GPAL.csv` group list; `GPNM.csv` membership |
| Status | Official record layout: `0` conservatorship · `1` active · `4` rehabilitation/receivership · `6` liquidation |

Company-listing files used as legal insurers: `PROP.csv`, `LIFE.csv`, `HLTH.csv`, `TILE.csv`, `FRAT.csv`, `ORBE.csv`.

Group files: `GPAL.csv` (group name + group code), `GPNM.csv` (group → member CoCode).

**Not** treated as NAIC CoCodes: alien `AA-*` files (`ALAL`, `ALNM`, `NAAL`, `NANM`, `PLAL`, `PLNM`) and combined-statement codes (`CONM`, `COMB`).

Parser: `lib/national/naic-listing.ts`. Fingerprint is SHA-256 of sorted CoCodes, group codes, and memberships.

## State appointing namespaces (already in the graph)

| Namespace | Authority | Key | Is NAIC CoCode? |
|-----------|-----------|-----|-----------------|
| Florida DFS Appointing Entity Number | Florida DFS eAppoint | `carrier:fl-dfs:{number}` | **No.** Official DFS glossary lists Appointing Entity Number, Florida Company Code, and NAIC Company Code as distinct. 5- and 6-digit values. Digit coincidence with a CoCode is `REVIEW_REQUIRED`, never `CONFIRMED`. |
| Texas TDI NAIC ID | Texas Department of Insurance, dataset `bupb-23s9` | `carrier:tx-tdi-naic:{id}` | **Not assumed.** TDI defines the field as NAIC ID of an insurance company **or group**. Validated against LOC CoCodes and group codes before any legal-insurer resolution. |

Production baseline at task start: 13,461 `carrier` entities = 11,944 FL DFS + 1,517 TX TDI.

## Supplemental state company list

Massachusetts DOI licensed-companies dump (`Company Type`, `NAIC #`, `Company`) is a state observation of NAIC company codes. It is **fail-closed as agencies**. Used only as a CoCode observation when the file is present. Fixture: `scripts/ma/fixtures/ma-licensed-companies-sample.csv`.

## CMS / plan organizations

CMS Medicare contract extracts (`lib/insurance/cms/data/complaint-rankings.json`) and FFM producer observations (`cms_marketplace_observations`) publish organization / issuer **names** and contract IDs. They do **not** publish NAIC CoCodes in the files this repository holds. HIOS issuer IDs are not assumed to equal CoCodes. Mapping classes: exact NAIC (none in current CMS files) · organization-name-only · brand-only · unresolved.

## Curated consumer brands

`lib/carriers/registry.ts` (14 slugs, regex matchers). Product research pages under `/carriers/[slug]`. **Not** a regulator identity. Confidence: `REVIEW_REQUIRED` brand candidates. Not rewritten in this task.

## Excluded

- NIPR (restricted / commercial)
- AM Best commercial identity
- Florida OIR market intelligence, Citizens, Florida rates, `FL-INS-000+`
- Name-similarity merge
- Public carrier profile generation from the graph

## Next task

`INS-NAT-FINAL-003` uses this inventory to emit `APPOINTER_RESOLVES_TO` only at `CONFIRMED` (TX 5-digit CoCode hits; FL remains unresolved until an official DFS↔NAIC identifier crosswalk exists).
