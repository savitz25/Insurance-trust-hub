# NJ-INS-003 — NJCRIB Plan Risk publication review

**Determination:** `PUBLIC_WITH_TERMS` → **do not republish rows.**

This review is the publication gate for New Jersey Compensation Rating & Inspection Bureau Plan Risk. It does not change the NJ-INS-002 internal acquisition.

## Official source

- File: Plan Risk DAT  
- URL: https://www.njcrib.com/FileDownload/PlanRiskDAT  
- Access: downloadable without login (`login_bypass: false`)  
- Classification: `PUBLIC_WITH_TERMS`  
- Coverage: `ACQUIRED_CURRENT_SNAPSHOT` (internal only)

## Terms that control republication

NJCRIB Terms of Use, as recorded in NJ-INS-002:

- The site is for members, subscribers, and **guests**.
- Content may **not** be reproduced or copied.
- Content may **not** be used to develop or **supplement a database**.

Those restrictions are absolute. Guest downloadability does not authorize republication.

## What this page publishes

- That Plan Risk exists as an official residual workers-compensation observation file.
- That access is `PUBLIC_WITH_TERMS`.
- That InsuranceTrustHub does **not** republish the file or a transformed extract.

## What this page withholds

- Employer names
- Producer names
- Carrier / bureau-company relationships
- Modification factors
- Plan Risk row counts as public metrics
- County distributions
- Any downloadable transformed dataset
- The raw DAT file (gitignored; `commit_raw_file: false`)

No employer, producer, or carrier **profiles** are created from Plan Risk.

## What is not a publication blocker

CRIB restriction blocks **that metric**, not `/new-jersey`. SERFF 403, incomplete complaint history, and unresolved identities are treated the same way.

## Invariants

- `publication_allowed: false`
- `redistribution_forbidden: true`
- `database_supplementation_restricted: true`
- `employer_profiles_created: false`
- `rows_rendered: 0`
- `downloadable_dataset: false`
- Modification factor is not a Trust Score
- CRIB company number is not NAIC
