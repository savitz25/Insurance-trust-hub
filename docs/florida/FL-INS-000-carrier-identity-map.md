# FL-INS-000 — Florida carrier / legal-insurer identity map

Do not mint a second legal insurer when `legal-insurer:naic:{CoCode}` already exists.

## Layers (must stay distinct)

| Layer | Key | Graph kind | Publication |
|-------|-----|------------|-------------|
| DFS appointing entity | `carrier:fl-dfs:{Appointing Entity Number}` | `carrier` | INTERNAL_ONLY |
| Legal insurer | `legal-insurer:naic:{5-digit CoCode}` | `legal_insurer` | INTERNAL_ONLY |
| Insurance group | `insurance-group:naic:{group}` | `insurance_group` | INTERNAL_ONLY |
| Consumer brand | `consumer-brand:{slug}` | `consumer_brand` | INTERNAL_ONLY |
| Surplus lines eligible | OIR/FSLSO eligibility + NAIC | still `legal_insurer` or later subtype; **not admitted** | INTERNAL_ONLY |
| Citizens | residual market / program | not a generic FL license | INTERNAL_ONLY |

## Official identifier classification

| Signal | Confidence | Production |
|--------|------------|------------|
| Exact NAIC CoCode on OIR company record matching locked LOC spine | CONFIRMED | `national_entity_identifiers` scheme `naic_cocode` (already exists) |
| Florida Company Code + NAIC on **same official OIR record** | CONFIRMED identifier pair | add scheme `fl_oir_company_code` later |
| Florida Company Code alone | HIGH_CONFIDENCE candidate only | no legal-insurer mint |
| DFS Appointing Entity Number + NAIC on same official record | CONFIRMED `APPOINTER_RESOLVES_TO` | **not found** (FINAL-003 audit) |
| Digit coincidence (DFS number equals a CoCode) | REVIEW_REQUIRED | 17 IDs; **no bridge** |
| Name / address / brand regex / FEIN alone | UNRESOLVED | never CONFIRMED |

## Current production

- National legal insurers: **6,185** (NAIC LOC-JUN-2026)
- Florida-authorized subset via OIR bulk: **not ingested** (interactive search only)
- FL appointers: **11,944**
- FL `APPOINTER_RESOLVES_TO`: **0**
- TX `APPOINTER_RESOLVES_TO`: **1,510** (pattern Florida should copy once an official pair exists)

## Surplus lines

Eligible surplus lines insurer ≠ admitted/authorized P&C writer. Use OIR “Company Type = Surplus Lines” and FSLSO/OIR eligibility lists. Do not put them on admitted-market CHOICES pages as admitted carriers.

## Citizens

Citizens authorization / appointment is a **program** relationship, not general Florida licensure and not an NAIC merge.
