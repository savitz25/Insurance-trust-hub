# FL-INS-002 — OIR company type taxonomy

Raw `compType` is preserved. Buckets are derived only.

| Bucket | Examples | Company count (grain) |
| --- | --- | ---: |
| P_AND_C | PROPERTY AND CASUALTY INSURER, RECIPROCAL, CAPTIVE, ASSESSABLE MUTUAL | see census |
| LIFE_HEALTH | LIFE AND HEALTH INSURER | 451 |
| HEALTH_HMO | HMO, prepaid health/limited health, health flex | 46 HMO + related |
| TITLE | TITLE INSURANCE | title insurer ≠ title agent |
| FRATERNAL | FRATERNAL BENEFIT SOCIETY | |
| SURPLUS_LINES | SURPLUS LINES, AVIATION/WET MARINE, FEDERALLY AUTHORIZED, OFFSHORE | surplus ≠ admitted |
| RISK_RETENTION_SPECIALTY | RRG, risk purchasing group | |
| REINSURER | accredited / certified / trusteed / reciprocal-jurisdiction | |
| RESIDUAL_MARKET | RESIDUAL MARKET | Citizens is a later program task |
| WARRANTY_SERVICE | home/service warranty, MV service agreement | |
| SELF_INSURANCE | local government / funds | |
| ADMINISTRATOR_INTERMEDIARY | TPA, PBM, premium finance | |
| OTHER_REGULATED | CCRC, discount plan, etc. | |

Do not collapse every OIR entity into “insurance carrier.”

Largest grains: P&C 917 · risk purchasing group 498 · life & health 451 · TPA 419 · local government unit payee 271 · surplus lines 159 · RRG 156.
