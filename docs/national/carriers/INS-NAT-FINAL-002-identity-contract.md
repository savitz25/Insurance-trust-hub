# INS-NAT-FINAL-002 — Legal insurer identity contract

Library: `lib/national/legal-insurer-identity.ts`.

## What a legal insurer is

A **legal regulated insurer** is a company that NAIC lists with a five-digit **NAIC company code**. One CoCode = one legal insurer. Different CoCodes = different legal insurers even when legal names match.

Provisional key: `legal-insurer:naic:{5digit}`.

Identifier scheme: `naic_cocode`.

## Confidence

| Grade | When |
|-------|------|
| `CONFIRMED` | Official NAIC CoCode from Listing of Companies (or an explicit regulator field that **is** that CoCode after validation). |
| `HIGH_CONFIDENCE` | Deterministic official multi-field with zero remaining ambiguity (example: 4-digit TDI ID that pads to exactly one CoCode and does not also match a group). Not used for public legal identity. |
| `REVIEW_REQUIRED` | Name-only, digit coincidence, CoCode+group collision, conflicting names on one code, curated brand regex. |
| `UNRESOLVED` | No safe mapping. Stays explicit. |

Name-only is never `CONFIRMED`. Fuzzy merge is forbidden.

## Appointing entities

Existing graph `entity_kind = carrier` rows are **appointing entities reported by a state regulator**, not legal insurers.

| Source | Confirmed as | Maps to legal insurer when |
|--------|----------------|----------------------------|
| FL DFS | Appointing entity `carrier:fl-dfs:{n}` | Never from the number itself. 5-digit overlap with a CoCode = `REVIEW_REQUIRED` coincidence. |
| TX TDI | Appointing entity `carrier:tx-tdi-naic:{id}` | `CONFIRMED` only if the TDI ID is a 5-digit official CoCode **or** an official group code, not both. 6-digit IDs stay unresolved as legal insurers. 4-digit IDs are at most `HIGH_CONFIDENCE`. |

`APPOINTER_RESOLVES_TO` is written only at `CONFIRMED` (INS-NAT-FINAL-003). This task predicts; it does not write.

## History

Same CoCode + later legal name → alias on the **same** entity (`national_entity_aliases`). Do not mint a second legal insurer.

Conflicting names on one CoCode → `REVIEW_REQUIRED` on that CoCode, still one candidate key.

## Regulatory evidence

Adverse / regulatory evidence may attach to a legal insurer only across a `CONFIRMED` bridge. `REVIEW_REQUIRED`, `HIGH_CONFIDENCE`, and `UNRESOLVED` bridges are non-traversable.

## Not this contract

- Insurance groups (`insurance-group:naic:{code}`)
- Consumer brands (`consumer-brand:{slug}`)
- Person / agency NPN identity
- Public `/carriers` brand pages (unchanged product surface)
