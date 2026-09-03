# TX-INS-001 — Texas insurance state publication

Public route: `/texas`  
Snapshot: `insurance-tx-state-intel-v1`

## Product

Business graph only:

TDI agencies + companies on appointments + agency↔company appointments + complaint / rate / surplus / title evidence.

Person licenses (962,001) and person appointments (4,400,210) are **not** a public directory.

## Acquired (recomputed 2026-09-03)

| Source | ID | Rows |
| --- | --- | --- |
| Agencies | 3yqc-fcdt | **56,625** / **43,597** NPN / **48,920** TDI licenses |
| Agency appointments | avjc-7u2m | **622,019** / **35,167** NPN / **1,414** NAIC / **619,830** both-exact |
| Surplus | 7isd-ex6t | **18,816** (3,769 firm / 15,047 individual) |
| Title appointments | y9ze-ft94 | **23,115** (850 agencies, 31 underwriters, 254 counties) |
| Relationships | kvqi-vsrr | **132,253** (aggregates only) |
| Complaints | ubdr-4uff | **305,156** |
| Complaint index | pa9u-9s9w | **5,966** / **1,282** NAIC |
| Rate filings | iubg-btfs | **18,001** / **15,035** SERFF |
| Person licenses | kxv3-diwf | **962,001** unpublished |
| Person appointments | bupb-23s9 | **4,400,210** unpublished |

## Not acquired

Authorized-company report export: **SOURCE_NOT_ACQUIRED**.  
Structured enforcement roster: none found.  
TWIA bulk roster: official program, not a bulk file.

## Semantics

- `state=TX` on the agency file is listed/home-office state, not the licensed universe.
- Appointment count is not quality.
- Complaint ≠ violation.
- TDI complaint index ≠ TrustHub score.
- Rate filing ≠ consumer premium.
- No Trust Score. No paid ranking. No Texas county pages.
