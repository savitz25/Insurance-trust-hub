# INS-NAT-FINAL-006 — National completion gate

Live census: `data/reports/ins-nat-final-006-census.json`  
Task is read-only. Florida is **not started**.

## Decision

**NATIONAL COMPLETE**

National completion means the canonical graph and every cross-state/federal evidence family required for state work is stable, queryable, provenance-safe, refreshable enough, and publication-safe.

It does **not** require 50-state producer equality, every appointment, every enforcement order, every contact, every insurer page, or ERISA.

## 50-state requirement

**NO.** Florida can attach DFS/OIR/Citizens evidence onto existing person, agency, legal-insurer, appointment, CMS, and regulatory contracts. Missing NV/NJ/NC/MS graph credentials are staging/depth gaps, not redesign.

## Florida compatibility

**PASS.** Current schemas cover OIR legal-insurer identity, DFS appointments (`APPOINTED_TO` / `appointed_by`), regulatory taxonomy, surplus-lines namespace, public-adjuster namespace, agency Trust Reports, and verification-first people without a national redesign.

## Unresolved identities (explicit, safe)

- TX appointer IDs `14348,16806,38466,62472,70335,91413,95175` — remain appointers
- FL APPOINTER_RESOLVES_TO = 0; 17 digit coincidences REVIEW_REQUIRED; DFS number ≠ NAIC
- GPNM CoCode 17686 held
- MA 1,961 NPNs awaiting authoritative entity type
- 253 TDI complaint rows UNRESOLVED / unattached
- CMS UNATTACHED 530,887 (fail-closed)

None of these invent identity. Explicit unresolved is acceptable.
