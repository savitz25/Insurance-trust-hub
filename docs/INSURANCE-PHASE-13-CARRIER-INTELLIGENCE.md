# Insurance Trust Hub — Phase 13: Carrier Intelligence Pages

**Date:** 2026-08-09

## Positioning

> Carrier research from public data — not a sales ranking.

## Routes

| Path | Role |
|------|------|
| `/carriers` | Curated index |
| `/carriers/[slug]` | Organization rollup (ACA + Medicare sections) |

Examples: `/carriers/humana`, `/carriers/florida-blue`, `/carriers/unitedhealthcare`

## Identity matching

- Deterministic slug registry: `lib/carriers/registry.ts`
- Explicit `RegExp` matchers for Medicare `carrierName` and ACA `issuerName`
- No fuzzy parent inventing — ambiguous entities stay as CMS-reported strings with notes

## ACA rollup

- Live CMS Marketplace search on curated FL/TX/AZ sample ZIPs
- Plan counts, metal/type mix, premium/deductible ranges from matched issuer names
- Fail closed without API key or empty matches

## Medicare rollup

- Complaint rankings + curated county top contracts
- Contracts list with rates/stars/ranks; county enrollment presence
- Links to `/medicare/contracts/[id]` and county pages

## Indexation

- Index when Medicare evidence **or** ≥3 ACA plans in sample markets
- Sitemap: Medicare-evidenced carriers + `/carriers` hub
- Empty shells noindex

## Navigation

- Tools quick link
- Medicare hub
- Contract pages → carrier when matcher hits
- Plan X-Ray issuer → carrier when matcher hits

## Next

- Expand registry only with evidence
- Optional wallet pin for carrier research
- Stronger issuer ID join when CMS returns stable issuer IDs
