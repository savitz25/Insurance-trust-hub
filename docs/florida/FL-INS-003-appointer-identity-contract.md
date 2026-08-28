# FL-INS-003 — appointer identity contract

`carrier:fl-dfs:{Appointing Entity Number}` stays distinct from `legal-insurer:naic:{CoCode}` and `fl_oir_company_code`.

`APPOINTER_RESOLVES_TO` is **identity resolution only**. It is not authorization, admission, appointment activity, or “selling with.”

| Evidence | Outcome |
| --- | --- |
| Same official record: DFS appointing number + NAIC | CONFIRMED bridge |
| Same official record: DFS appointing number + FL Company Code already CONFIRMED to NAIC | CONFIRMED bridge |
| Unique official FEIN on both DFS appointer and OIR, 1:1, chained to NAIC | CONFIRMED two-step |
| Name / DBA / brand / fuzzy / address / phone | REVIEW_REQUIRED or UNRESOLVED — never written |
| Digit coincidence | REVIEW_REQUIRED — never written |
| HIGH_CONFIDENCE | held, not written |
| Non-insurer appointer | no legal-insurer attach |

Do not rewrite person `APPOINTED_TO`. Do not alter Florida `appointed_by` (2,680).

Production this task: **0** CONFIRMED Florida `APPOINTER_RESOLVES_TO`. Texas remains 1,510.
