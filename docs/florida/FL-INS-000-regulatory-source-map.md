# FL-INS-000 — Florida regulatory / enforcement source map

Reuse national families in `lib/national/regulatory-evidence.ts`. Do not invent guilt-by-association.

| Family | Florida source | Identity | Production | Notes |
|--------|----------------|----------|------------|-------|
| COMPLAINT | TDI indexes (national) | NAIC | 5,966 INTERNAL_ONLY | Not Florida-sourced |
| ALLEGATION_OR_NOTICE | CRN (DFS Civil Remedy) | NAIC if on filing; else UNRESOLVED | **0** | **CRN ≠ finding** |
| ADMINISTRATIVE_ACTION | DFS licensee discipline | NPN / license # | 0 | Person or agency respondent |
| FINAL_ORDER / CONSENT_ORDER | OIR / DFS orders | NAIC or NPN | 0 | PDF/HTML |
| LICENSE_ACTION | DFS suspend/revoke | NPN / license # | 0 | |
| MONETARY_PENALTY | DFS/OIR fines | NAIC or NPN | 0 | |
| CEASE_AND_DESIST | DFS/OIR | NAIC or NPN | 0 | |
| MARKET_CONDUCT_EXAM | OIR exam reports | NAIC | 0 | Separate from financial |
| FINANCIAL_EXAM | OIR exam reports | NAIC | 0 | |
| RECEIVERSHIP / LIQUIDATION | OIR receivership list + NAIC status | NAIC | 0 as evidence; NAIC status 0/4/6 is **status not event** | |
| PROGRAM_STATUS_ACTION | CMS (national) | NPN | CMS table, not evidence | ≠ misconduct |

## CRN (Civil Remedy Notice)

- Portal: https://apps.fldfs.com/civilremedy/ (F.S. 624.155)
- Dedicated family: `ALLEGATION_OR_NOTICE` subtype `CIVIL_REMEDY_NOTICE`
- DFS **does not** adjudicate CRNs
- Search by insurer name / file # / date; NAIC sometimes in body, not a guaranteed column
- No bulk CSV in-repo → ACQUIRE_NOW / MANUAL_ONLY
- Never render as violation, finding, or enforcement unless a separate FINAL_ORDER exists
- Name-only insurer string → UNRESOLVED, never attached

## Examinations

Keep MARKET_CONDUCT_EXAM ≠ FINANCIAL_EXAM. Identity: NAIC / Florida Company Code on the report. Document URL + exam period + publication date.

## Receivership

OIR “Companies in Receivership” + national NAIC company status. Preferred keys: NAIC, Florida Company Code, official case id. No name-only adverse attach.
