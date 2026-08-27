# INS-NAT-FINAL-004 — Evidence taxonomy and identity contract

Library: `lib/national/regulatory-evidence.ts`

## Doctrine

COMPLAINT ≠ ALLEGATION ≠ FINDING ≠ FINAL ORDER. CMS termination ≠ misconduct. NAIC company status ≠ enforcement. No match ≠ clean record.

Source claim and TrustHub classification are stored separately in `raw`.

## Families

COMPLAINT · ALLEGATION_OR_NOTICE · INVESTIGATION · ADMINISTRATIVE_ACTION · FINAL_ORDER · CONSENT_ORDER · LICENSE_ACTION · MONETARY_PENALTY · CEASE_AND_DESIST · MARKET_CONDUCT_EXAM · FINANCIAL_EXAM · RECEIVERSHIP · LIQUIDATION · PROGRAM_STATUS_ACTION · OTHER_REGULATORY_EVENT

This task’s production family: **COMPLAINT** / subtype `CONFIRMED_COMPLAINT_INDEX`.

## Identity

PERSON: exact NPN (not used in this first family).  
LEGAL INSURER: exact NAIC CoCode on the locked spine.  
No name/address/email/phone/website/brand identity.

REVIEW_REQUIRED never attaches to a canonical entity. UNRESOLVED events still exist (`entity_id` NULL).

## Traversal / guilt-by-association

Evidence traverses a bridge only if that bridge is CONFIRMED.  
Person ↛ agency. Agency ↛ person. Brand never inherits. Group never inherits member actions. Appointment ≠ history.

## Publication

`PUBLIC_REGULATORY_EVIDENCE_ENABLED = false`.  
Readiness: `INTERNAL_ONLY` until FINAL-005.

Safe copy: “Regulatory & Enforcement History” / “No matched regulatory action was found in the sources currently included in our research as of [date].” Never “clean record.”

## Schema

Existing `regulatory_evidence` stub is used for ingest. Additive columns are prepared in `20260827180000_regulatory_evidence_foundation.sql` (not required for this first ingest; taxonomy lives in `raw`).
