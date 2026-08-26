# INS-NAT-011 — CMS Marketplace producer evidence

Official CMS / Data.Healthcare.gov sources (modified **2026-08-21** except Find Local Help **2026-08-25**).

| Source | ID | Rows | NPN |
|--------|-----|-----:|-----|
| RCL 2016–present | `wb6u-x2ny` | 989,979 | yes (may be person, business, or web-broker) |
| RCL 2014–2015 | same dataset, second file | 169,462 | yes |
| RTL | `e8uy-7rnp` | 8,079 | yes |
| Registration Tracker | `e4rr-zk4i` | 132,913 | `NPN_INDIV` |
| Find Local Help | `3ddf85bc-f71b-4417-b271-410cbf9e0905` | 84,906 | **no** |

RCL presence = FFM registration **completed** for that **plan year**. Tracker `PORTAL_ACCOUNT_ACTIVE` is **not** completion.

Join: exact NPN → `entity_kind=person` only. Unmatched NPNs stay `UNATTACHED` for later state graphs. Kind conflicts (agency NPN) are not merged.

Find Local Help has no NPN; agent/broker rows are **not** name-matched.

`PUBLIC_PERSON_PROFILES_ENABLED` remains false.

Production table: `cms_marketplace_observations` (SQL Editor: `docs/INS-NAT-011-SQL-EDITOR.md`).
