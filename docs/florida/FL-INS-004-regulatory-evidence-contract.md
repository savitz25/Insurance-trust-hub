# FL-INS-004 — Florida regulatory & enforcement evidence contract

Library: `lib/national/fl-regulatory-evidence.ts`  
Families: `lib/national/regulatory-evidence.ts`  
Runner: `scripts/national/fl-ins-004.py`

## Doctrine

1. A Civil Remedy Notice is a **notice/allegation**, not a finding, not a complaint-index score, and not a final order.
2. Market-conduct examinations and financial examinations are different families.
3. The existence of an examination is not misconduct.
4. Administrative / consent / final orders keep explicit finality. Pending is not final.
5. Receivership, rehabilitation, and liquidation are legal-status evidence, not conduct violations. Liquidation is stored as `LIQUIDATION` when the official source says liquidation.
6. Adverse evidence attaches only on **CONFIRMED** identity: exact NAIC CoCode on the locked legal-insurer spine, or a Florida Company Code already stored as `fl_oir_company_code` on that spine. Name-only matching is rejected.
7. Unresolved evidence may be stored with `entity_id` NULL and `publication_readiness = INTERNAL_ONLY`.
8. Records, entities, and findings remain separate. Agent/agency discipline is not mixed into insurer evidence.
9. No Trust Score, ranking, or public insurer-page change is introduced.
10. Publication remains fail-closed. `PUBLIC_REGULATORY_EVIDENCE_ENABLED = false`.

## Identity cascade

1. Exact five-digit NAIC CoCode present on the official legal-insurer spine → `CONFIRMED`, attach.
2. Florida Company Code already mapped to that NAIC via `national_entity_identifiers.scheme = fl_oir_company_code` → `CONFIRMED`, attach.
3. Florida Company Code present but not already mapped → `UNRESOLVED` or `REVIEW_REQUIRED`, unattached. Do not mint a legal insurer.
4. Name, address, phone, website, or brand → `UNRESOLVED`, unattached.
5. Premium-finance / PBM / other non-insurer respondents are never forced onto `legal_insurer`.

`REVIEW_REQUIRED` and `HIGH_CONFIDENCE` never attach.

## Production write in this task

Gated `--execute` inserts open DFS receiver companies as unattached `LIQUIDATION` rows (`source_dataset = florida_dfs_receiver_companies`, `record_identifier = receivership:{detail-id}`).

CRN, market-conduct reports, financial-exam reports, and administrative orders are **censused** from official pages. They are **not** attached and **not** inserted in this task because the public listings do not carry NAIC / Florida Company Code.

## SQL

None. `evidence_family` is TEXT with no CHECK. `CIVIL_REMEDY_NOTICE` and `REHABILITATION` are code constants only.

## Out of scope

Citizens, CHOICES, IRFS, FSLSO, NFIP (FL-INS-005). Person/agency disciplinary files. County appointments. Trust Scores.
