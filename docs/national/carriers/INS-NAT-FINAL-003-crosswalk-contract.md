# INS-NAT-FINAL-003 — Appointing-entity → NAIC crosswalk contract

Library: `lib/national/appointer-crosswalk.ts`

State appointer ≠ legal insurer. `APPOINTER_RESOLVES_TO` is a bridge. It does not merge or delete rows.

## CONFIRMED production bridge

Required:

- exact official state identifier
- exact official NAIC CoCode on the locked LOC-JUN-2026 listing
- target `legal-insurer:naic:{cocode}` already in the spine
- identity confidence `CONFIRMED`

Texas match basis:

> exact Texas TDI reported NAIC ID + exact official NAIC LOC CoCode

Not sufficient: name, address, phone, email, brand regex, website, digit coincidence, FEIN alone.

`REVIEW_REQUIRED`, `HIGH_CONFIDENCE`, and `UNRESOLVED` never get a production relationship in this task.

## Texas

1,510 CONFIRMED bridges. 7 UNRESOLVED IDs remain appointers only:

`14348, 16806, 38466, 62472, 70335, 91413, 95175`

Group-code-only TDI IDs are held (legal insurer preferred).

## Florida

DFS Appointing Entity Number is not NAIC. Official same-record Appointing Entity Number + NAIC was not found. Digit coincidences stay `REVIEW_REQUIRED`. Remaining appointers stay `UNRESOLVED_NAIC_CROSSWALK`. No dummy relationships.

## Regulatory evidence

May traverse `CONFIRMED` `APPOINTER_RESOLVES_TO` only.

## Publication

Internal graph only. No carrier/appointer/group pages, sitemap, or robots changes.
