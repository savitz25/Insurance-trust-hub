# FL-INS-004 — Civil Remedy Notice semantics

Portal: https://apps.fldfs.com/civilremedy/  
Search: https://apps.fldfs.com/civilremedy/SearchFiling.aspx  
Statute: Florida Statutes § 624.155  
Form: DFS-10-363

## What a CRN is

A Civil Remedy Notice is a **pre-suit notice** that a claimant must file with the Florida Department of Financial Services at least 60 days before bringing a civil remedy action against an authorized insurer.

DFS states that it **does not involve itself** in Civil Remedy Notices filed through this system; those actions are outside its statutory authority. Acceptance of a filing is acceptance **in form**, not an adjudication that the insurer violated the law.

## Family

`CIVIL_REMEDY_NOTICE`

Not `COMPLAINT`. Not `FINAL_ORDER`. Not `ALLEGATION_OR_NOTICE` (that family is reserved for other notices such as property NOIITL § 627.70152).

- `is_final` = false
- Disposition may be OPEN / WITHDRAWN / UNKNOWN
- Filing number → `case_or_order_number` when a machine-readable export exists

## Identity

SearchFiling.aspx filters by DFS File #, dates, **insurer name**, insurance type, reasons, and statutes. There is **no NAIC field and no Florida Company Code field** on the public search form, and **no bulk CSV/API**.

Name-only insurer strings never attach. Exact NAIC, or a Florida Company Code already mapped to NAIC, would attach if a future official export carried those columns.

## Public copy if this family is ever shown

“Civil Remedy Notice filed in Florida DFS records.”

Never: violation, finding, bad faith established, clean record, no complaints.

## This task

Raw/relevant/attached = 0. Source class = `PUBLIC_RECORDS_REQUEST`. Draft request is in `FL-INS-004-public-records-request.md`. Not submitted.
