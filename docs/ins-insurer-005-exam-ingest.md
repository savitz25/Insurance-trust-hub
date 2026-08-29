# INS-INSURER-005 — Exact examination evidence ingest + public-safe gate

Routes remain unpublished. **Wave 1 published URLs = 0.** No `/insurers`.

## STATUS

**COMPLETE WITH BLOCKERS**

Exact examination relationships are now canonical Production evidence. PUBLIC_READY = **26**. `/insurers` is still unmounted (intentional). Florida financial listings were not ingested (forms mixed with reports). 41 Florida historical-name holds and 799 unreadable listing PDFs remain unattached.

## RELEASE

| | SHA |
|---|---|
| starting SHA | `72ecbf0` (origin/main / PR #9) |
| implementation SHA | *(this branch)* |
| final main | pending PR |
| rollback | `72ecbf0` |

## CA FARMERS VALIDATION

One physical PDF (`ba88e281…`), eight listing titles, seven exact subjects:

21652 Farmers Ins Exch · 21660 Fire · 21709 Truck · 10315 Civic · 10318 Exact · 21687 Mid Century · 10317 Neighborhood Spirit.

41+ affiliate CoCodes excluded. All seven relationships are **PUBLIC_SAFE**.

## FLORIDA SCOPE RULE

A Florida PDF is `EXAMINED_ENTITY_EXACT` only when cover/title (first two pages) proves **both**:

1. a named examination-report subject after `(Targeted) Market Conduct|Financial Examination Report`
2. an explicitly labeled `NAIC Company Code: NNNNN` for that subject

`NAIC Group Code` never attaches. Later-page five-digit values never attach. `32399` is `NON_CANONICAL_FIVE_DIGIT_VALUE` and never an identity bridge. Name validates against the spine; it does not create the join. `NATL` expands to `NATIONAL` for validation only.

## FLORIDA SAMPLE (10/10 EXAMINED_ENTITY_EXACT)

| Report | Subject | Subject CoCode | Canonical | Excluded | Class |
|---|---|---|---|---|---|
| American Coastal | American Coastal Insurance Company | 12968 | AMERICAN COASTAL INS CO | 32399 non-canonical | EXACT |
| American Mobile | AMERICAN MOBILE INSURANCE EXCHANGE | 16883 | AMERICAN MOBILE INS EXCHANGE | — | EXACT |
| Centauri | CENTAURI SPECIALTY INSURANCE COMPANY | 12573 | CENTAURI SPECIALTY INS CO | — | EXACT |
| Citizens | CITIZENS PROPERTY INSURANCE CORPORATION | 10064 | CITIZENS PROP INS CORP | — | EXACT |
| Clear Blue | CLEAR BLUE INSURANCE COMPANY | 28860 | CLEAR BLUE INS CO | — | EXACT |
| Hartford Midwest | HARTFORD INSURANCE COMPANY OF THE MIDWEST | 37478 | HARTFORD INS CO OF THE MIDWEST | — | EXACT |
| Monarch National | MONARCH NATIONAL INSURANCE COMPANY | 15715 | MONARCH NATL INS CO | 32399 | EXACT |
| Slide | SLIDE INSURANCE COMPANY | 17227 | SLIDE INS CO | — | EXACT |
| American Integrity | AMERICAN INTEGRITY INSURANCE COMPANY OF FLORIDA | 12841 | AMERICAN INTEGRITY INS CO | — | EXACT |
| American Traditions | AMERICAN TRADITIONS INSURANCE COMPANY | 12359 | AMERICAN TRADITIONS INS CO | — | EXACT |

## FLORIDA FULL CENSUS

Listing PDFs on the two OIR market-regulation pages: **1547** unique URLs (FL-INS-004’s 1007 was the MARKET_CONDUCT_EXAM subset after consent-order filtering). Native text only. No OCR.

| Class | N |
|---|---:|
| EXAMINED_ENTITY_EXACT | **19** |
| CONSOLIDATED_EXAM_EXPLICIT | 0 |
| COCODE_MENTION_ONLY | 76 |
| NAME_ONLY | 521 |
| AMBIGUOUS | 91 |
| UNREADABLE | 799 |
| HISTORICAL_NAME_REVIEW | 41 |
| 32399 non-canonical docs | 229 |

Only the 19 exact-subject rows were ingested. Consent orders, premium-finance listings, CCRC reports without cover CoCodes, and dead links were not attached.

Florida financial (~1060) **not run**: listings mix forms/templates with reports.

## INGEST

| | First `--execute` | Second `--execute` |
|---|---:|---:|
| documents | 20 | 0 new |
| examinations | 20 | 0 new |
| relationships / observations | **26** | **0** (skipped 26) |
| identity writes | 0 | 0 |
| TDI rows | 5966 unchanged | 5966 |

Fingerprint: `28aadabacd740a71529b0cebd93c2317fdb16aae4ce0b3d8391b1c0b39011469`

`regulatory_evidence` 5978 → **6004**. Legal insurers 6185. Agencies 82,071. Persons 1,029,860.

Attachment methods: `PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE` (Farmers) and `PDF_NATIVE_COCODE_EXPLICIT_SUBJECT` (Florida).

## PUBLIC-SAFE DENOMINATORS

PS1 20 · PS2 20 · PS3 26 · PS4 26 · PS5 26 · PS6 0 · PS7 0 · PS8 **7** · PS9 **19** · PS10 **26**

PS5+PS6+PS7 = PS3. PS8+PS9 = PS5.

## PUBLICATION READINESS V4

| Status | Count |
|---|---:|
| PUBLIC_READY | **26** |
| REVIEW_REQUIRED | 0 |
| INSUFFICIENT_EVIDENCE | 4910 |
| IDENTITY_COLLISION | 0 |
| INTERNAL_ONLY | 1249 |

26 + 1249 + 4910 = 6185. Ten of the 26 PUBLIC_READY insurers previously sat in the TDI INTERNAL_ONLY bucket; TDI rows themselves remain INTERNAL_ONLY.

## TDI FIREWALL

Unchanged. 5,713 attached complaint-index rows / 1,259 insurers remain INTERNAL_ONLY. Not mixed into PS counts. Not rendered.

## SEMANTIC SAFETY

**PASS**

## PROFILE CONTRACT

`examinationReports[]` added to `insurance-legal-insurer-profile-v1`. Public copy constants prepared. **Not mounted.**

## PUBLICATION

routes 0 · sitemap delta 0 · `/carriers` unchanged

## HOMEPAGE / FLORIDA / PEOPLE / AGENCY

Fingerprints locked. Public people 0. Public graph agencies 0.

## NEXT TASK

PUBLIC_READY > 0, so:

**INS-INSURER-006 — LEGAL INSURER PUBLIC PROFILE PILOT**

Do not start it.
