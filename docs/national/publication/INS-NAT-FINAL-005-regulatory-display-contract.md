# INS-NAT-FINAL-005 — Regulatory evidence publication / display contract

Library: `lib/national/regulatory-display.ts`  
Schema: `supabase/migrations/20260827180000_regulatory_evidence_foundation.sql`

## Gate

`mayPublishRegulatoryEvidenceRecord` is fail-closed. All of the following must hold:

1. `PUBLIC_REGULATORY_EVIDENCE_ENABLED === true` (currently **false**)
2. canonical `entity_id` present
3. `identity_confidence = CONFIRMED`
4. `publication_readiness = READY_FOR_PUBLIC_REVIEW`
5. family and source dataset present
6. source/event date present
7. COMPLAINT family still requires a dedicated Complaint Data surface (never the generic enforcement renderer)

Unresolved and REVIEW_REQUIRED rows never attach publicly.

## Current production family

TDI complaint indexes (`tdi_complaint_indexes` / `pa9u-9s9w`):

- family `COMPLAINT`
- subtype `CONFIRMED_COMPLAINT_INDEX`
- `is_final = false`
- `publication_readiness = INTERNAL_ONLY` after backfill
- 5,713 CONFIRMED attachments to legal insurers
- 253 UNRESOLVED remain `entity_id` NULL
- 0 REVIEW_REQUIRED attachments

Backfill copies taxonomy from existing `raw` JSON into first-class columns. It does not reinterpret the source. It does not attach the 253 by name.

## Copy

Heading inside the broader “Regulatory & Enforcement History” module: **Complaint Data**.

> Texas Department of Insurance complaint-index data reports confirmed complaints and policy counts by insurer, year, and line of coverage.

> Complaint data does not by itself establish a regulatory violation or enforcement finding.

Never render from this source: disciplinary action, violation, misconduct, final order, finding, “Clean record”, “No complaints ever”, “No regulatory issues”.

Zero confirmed complaints is a source statistic, not a clean record.

## Inheritance

Legal-insurer complaint statistics **do not** appear on agency Trust Reports.  
Agency evidence **does not** appear on person verification.  
Brand / group / appointment / affiliation never inherit adverse history.

## Legal-insurer pages

**Option A — INTERNAL_ONLY.** No mass-index of 6,185 legal insurers. Complaint evidence stays internal until a later dedicated carrier/legal-insurer surface.

## Schema apply

No `DATABASE_URL` in this environment. Apply the additive migration **once** in the Supabase SQL Editor. See `docs/national/publication/INS-NAT-FINAL-005-SQL-EDITOR.md`.
