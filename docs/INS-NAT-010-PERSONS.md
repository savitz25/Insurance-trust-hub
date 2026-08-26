# INS-NAT-010 — Individual producer national foundation

Gated `entity_kind = person` graph. Public person profiles remain disabled.

`PUBLIC_PERSON_PROFILES_ENABLED = false` (publication rejects `person` / `individual` independently of `--entity`).

## Executed

| Layer | Count |
|-------|------:|
| Confirmed persons | 699,335 |
| Person credentials | 739,728 |
| Person LOAs | 988,289 |
| Multi-state persons (FL+VT) | 40,392 |
| Provider writes | 0 |
| Agency entities | 81,943 unchanged |
| Agency credentials | 110,167 unchanged |
| Agency LOAs | 50,368 unchanged |

Fingerprints:

- persons `ae8c7465925ae1a68119e1ee9413099be7ff2392cac6a5905f7732d471ebe611`
- credentials `00b55472bb8025fc5a12aec987a8c7b7d2d38df81f2eda7b6b50e9016b0167f7`
- loas `f34c09012ae1ad2894fff03f509488dd89f281496bd63498878c896897221752`

## Cohort

Florida: core producer TYCL only (Life / Health / Variable / General Lines P&C / Personal Lines). Adjuster, warranty, bail, customer representative, title excluded.

Vermont: `Insurance Producer` individuals with valid NPN. Adjuster classes excluded. Firms not converted.

Person contacts storeable but **not written**. Default `public_eligible = false`.

## Safety

- Same NPN + agency: 0 collisions in this cohort; policy still forbids cross-kind merge.
- Health/Life LOA does not imply Marketplace or Medicare.
- No WORKS_FOR from address/email/phone.
- No individual slugs, directory rows, or sitemap URLs.
