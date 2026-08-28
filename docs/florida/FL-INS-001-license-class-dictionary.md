# FL-INS-001 — License class dictionary

Raw `License TYCL Desc` preserved. Full census: `data/reports/fl-ins-001-license-class-census.json`.

| Raw (examples) | Grain | Namespace | Subtype | Promote core agency? |
|----------------|-------|-----------|---------|----------------------|
| AGENCY LICENSE | agency | producer | AGENCY | YES |
| GENERAL LINES (PROP & CAS) / NONRES GEN LINES | person | producer | GENERAL_LINES_PC | no |
| PERSONAL LINES AGENT | person | producer | PERSONAL_LINES | no |
| LIFE / HEALTH / LIFE & HEALTH | person | producer | LIFE / HEALTH / LIFE_HEALTH | no |
| LIFE INCL VARIABLE ANNUITY | person | producer | LIFE_VARIABLE | no |
| LIFE INCL VAR ANNUITY & HEALTH | person | producer | LIFE_VARIABLE_HEALTH | no |
| CUSTOMER REPRESENTATIVE | person | producer | CUSTOMER_REPRESENTATIVE | no |
| PUBLIC ADJUSTER-* | person | adjuster | PUBLIC_ADJUSTER | no |
| PUBLIC ADJUSTING FIRM | agency | adjuster | PUBLIC_ADJUSTING_FIRM | no |
| ADJUSTER - ALL LINES | person | adjuster | INDEPENDENT_ADJUSTER | no |
| INDEPENDENT ADJUSTING FIRM | agency | adjuster | INDEPENDENT_ADJUSTING_FIRM | no |
| SURPLUS LINES / NONRES SURPLUS LINES | person | surplus_lines | SURPLUS_LINES_AGENT | no |
| SERVICE/AUTO/HOME WARRANTY | agency | warranty | WARRANTY_* | no |
| TITLE | either | title | TITLE_* | no |
| CREDIT / TRAVEL / PORTABLE ELECTRONICS | either | limited_lines | CREDIT / TRAVEL / OTHER | no |
| BAIL BOND * | either | bail_bond | BAIL_* | no |
| MANAGING GENERAL AGENT | agency | producer | MGA | no |

Unmapped rare TYCL → REVIEW_REQUIRED / other. Do not infer expertise.
