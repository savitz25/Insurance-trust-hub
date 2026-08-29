# INS-INSURER-003 — Legal insurer examination evidence spine

California primary. Florida OIR conditional. **Wave 1 = 0.**

## STATUS

**COMPLETE WITH BLOCKERS**

Official examination reports exist and are useful in principle. This task could not establish a **deterministic legal-insurer identifier** on the California listing or in sampled PDFs, and Florida OIR listings remain title/URL only (FL-INS-004). Name-only attachment is prohibited. Nothing ingested. No `/insurers` routes.

## RELEASE

Starting `origin/main`: `a488ef585fcb3d0bf173690022833db60cd897c8`. Production `/` 200, `/insurers` 404. `db_writes` 0.

## SOURCE INVENTORY

### California market conduct

CDI describes market-conduct exams as reviews of rating, underwriting, and claim practices (CIC / CCR). Catalog is an **interactive Oracle APEX search** (`f?p=151`) that returned **HTTP 404** on 2026-08-29. No bulk CoCode listing. Enumerated report count = 0. Not ingested.

### California financial examinations

Portal: Officially Filed Reports of Examination (CIC §730 Field Examination Division). 137 listing rows / 129 unique PDFs. Identifier on the page: **company name + as-of date**. Sample of 7 PDFs: **0 five-digit NAIC company CoCodes**. “NAIC” in text means the Commissioners association / Annual Statement Instructions. One Farmers consolidated PDF is shared by 8 listing titles (multi-entity). 21st Century Casualty PDF is linked from two titles.

### Florida OIR (conditional)

FL-INS-004 already held 1,007 market-conduct and 1,060 financial listing PDFs **unattached**: no NAIC or Florida Company Code on the listing. Conditional exact-bridge requirement **not met**. Not ingested. `/florida` unchanged.

## IDENTITY AUDIT

| Class | Count (CA financial sample / listing) |
|---|---|
| Exact company CoCode in sampled PDF | 0 / 7 |
| NAIC group only | 0 |
| Legal name only | 6 sampled + 127 listing rows |
| Ambiguous multi-entity / shared PDF | 1 sampled + 10 listing rows |

## EXAM DENOMINATORS

E1 2204 · E2 0 · E3 2194 · E4 10 · E5 0 · E6 0 · E7 0 · E8 0 · E9 0 · E10 0 · E11 0

E2+E3+E4=E1.

## INGEST

0 inserts. Second run 0. Listing fingerprint `27d8ba883d1dc676b7230ea647d4b526ea7cb8074e55aeda95a27046a25d41fd`. Identity rows not mutated.

## PUBLIC SAFETY / PILOT

PUBLIC_SAFE 0. Allowlist empty. **Wave 1 = 0.** Identity + examination report *would* be enough for a small pilot **if** exact CoCode attach existed. It does not.

TDI complaint-index family remains INTERNAL_ONLY.

## NEXT TASK

**INS-INSURER-004 — obtain a machine-readable CDI (or other DOI) examination catalog that includes NAIC company CoCode**, or a documented PDF-field extractor that proves CoCode vs group before attach.

Do not start here.
