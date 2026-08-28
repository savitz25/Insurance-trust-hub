# FL-INS-007 — profile module contract

Existing public providers only. CONFIRMED exact-NPN provider→agency bridge required.

## Independent gates

| Gate | Public-provider ready |
|------|----------------------:|
| FL_CREDENTIAL_READY | 14,834 |
| FL_APPOINTMENT_READY | 613 |
| CMS_NOT_READY | 0 |
| MIR_NOT_ENTITY_COMPATIBLE | 0 |
| SURPLUS_NOT_ENTITY_COMPATIBLE | 0 |
| FL_REGULATORY_NOT_DETERMINISTICALLY_LINKED | 0 |
| NFIP_NOT_DETERMINISTICALLY_LINKED | 0 |

Unresolved evidence is omitted, not shown as zero.

## Credential module

Allow: Florida credential record found, class, jurisdiction, source, status only if source supports it. Unknown is not active/inactive.

## Appointment module

Allow: Florida appointment evidence found, observation count, current/historical. Do not name a legal insurer. Count is not quality.

## Never on agency profiles from this task

CMS, MIR, surplus-lines eligibility, NFIP cards, liquidation/exam/order catalogs, “clean record.”
