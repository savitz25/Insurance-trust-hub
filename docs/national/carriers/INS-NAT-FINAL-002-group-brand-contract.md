# INS-NAT-FINAL-002 — Insurance group and consumer brand contract

Groups and brands are **not** legal insurers. They never replace member companies.

## Insurance group

Official NAIC **group code** from `GPAL.csv` / company `GROUP CODE`.

- Kind: `insurance_group`
- Key: `insurance-group:naic:{groupCode}` (leading zeros stripped)
- Identifier scheme: `naic_group_code`
- Relationship: `MEMBER_OF_GROUP` from each member `legal_insurer` to the group
- One group contains many legal insurers (example: CVS GRP `1` includes Aetna Better Health legal companies; Allstate group `8` includes Allstate Ins Co `19232` and Allstate Indemnity `19240`)

TDI’s appointing field may identify a **group**. If a 5-digit TDI ID equals an official group code and not a CoCode, the appointing entity resolves to the group, not to a legal insurer.

A group code that also exists as a CoCode is `REVIEW_REQUIRED`. Do not guess.

Do not call a group a “parent company” unless a later ownership source (not this listing) supports that wording.

## Consumer brand

Product / marketing name people recognize (Humana, UnitedHealthcare, Florida Blue, Ambetter, …).

- Kind: `consumer_brand`
- Key: `consumer-brand:{slug}`
- Source today: curated `lib/carriers/registry.ts` (14 entries, explicit regexes)
- Confidence: `REVIEW_REQUIRED` until an official brand↔CoCode source exists
- Relationship (future): `USES_BRAND` from legal insurer(s) to the brand
- One brand may cover many legal insurers; one legal insurer may use one brand

`/carriers/[slug]` pages remain curated brand research. They are **not** national legal-insurer pages and were not rewritten.

CMS organization names that match a registry regex are **brand-only** candidates. They are not legal insurers.

## Forbidden collapses

| Left | Right | Allowed as identity? |
|------|-------|----------------------|
| Brand | Legal insurer | No |
| Group | Legal insurer | No |
| FL DFS appointer | NAIC CoCode | No (coincidence ≠ crosswalk) |
| TX TDI ID | NAIC CoCode | Only after LOC validation |
| CMS contract org | Legal insurer | Only if the CMS file itself carries a CoCode |

## Schema

Additive kinds + `national_entity_identifiers` + `national_entity_aliases`. Generic `national_relationships.relationship_type` already holds `MEMBER_OF_GROUP`, `USES_BRAND`, `APPOINTER_RESOLVES_TO`. No duplicate relationship table.
