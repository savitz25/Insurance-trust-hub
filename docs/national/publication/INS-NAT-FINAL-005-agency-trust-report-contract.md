# INS-NAT-FINAL-005 — Agency Trust Report contract

Library: `lib/national/agency-trust-report.ts`  
Payload: `insurance-agency-trust-report-v1`  
Loader: `lib/national/load-agency-trust-report.ts` (server-only)

## Purpose

One national snapshot contract for a **canonical agency**. Florida later enriches this same contract. There is no separate state profile schema.

Public surface for this task: existing `/providers/[slug]` pages, and only when a CONFIRMED exact-NPN `provider_entity_bridges` row exists. Graph agencies are not mass-published.

## Modules

1. Identity / Verification
2. Business / contact information
3. State credentials
4. License status
5. License classes
6. Lines of Authority
7. Appointments
8. Multi-state footprint
9. CMS Marketplace evidence
10. Regulatory & Enforcement History
11. Sources & freshness

## Semantics

| Claim | Rule |
|-------|------|
| ONE ENTITY, MANY CREDENTIALS | Multiple official state credentials stay on the same agency. |
| LICENSE ≠ LOA | Credential rows and LOA observations are separate arrays. |
| LOA ≠ appointment | Lines of authority are source terminology, not product expertise. |
| APPOINTMENT ≠ EMPLOYMENT / QUALITY / SERVICE TERRITORY | Coverage-incomplete sources must not render “0 appointments.” |
| PERSON appointments ≠ AGENCY appointments | `APPOINTED_TO` person rows are filtered out. |
| CMS REGISTRATION ≠ STATE LICENSURE | CMS rows always carry that note. |
| Licensed in X jurisdictions ≠ serves X states | Footprint copy uses “sources currently included.” |
| Agency regulatory evidence | Only when the respondent is the agency **and** the publication gate passes. Current TDI complaint indexes attach to **legal insurers** and do not inherit. |

## Empty families

Do not render empty source families as zero. Safe no-match:

> No matched regulatory action was found in the sources currently included in our research as of [date].

When the only included family is complaint data, do not imply broad enforcement coverage.

## Payload fields

`entity`, `credentials[]`, `loas[]`, `appointments[]`, `cms[]`, `contacts[]`, `regulatoryEvidence[]` (empty in this task), `sources[]`, `readiness`, `limitations[]`.
