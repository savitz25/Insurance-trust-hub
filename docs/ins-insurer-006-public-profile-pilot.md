# INS-INSURER-006 — Legal insurer public profile pilot

Wave 1 = **26 / 26**.

## STATUS

**COMPLETE** (pending merge / production)

## SITEMAP

- legal-insurer profile URLs added = **26**
- static `/insurers` landing sitemap handling = **1**

## SLUGS

26 unique paths. Base-slug collisions 0. Resolved-slug collisions 0. Duplicate URL count **0**.

Canonical example: `/insurers/farmers-insurance-exchange`

## PERFORMANCE (build)

| Route | Size | First Load JS |
|---|---|---|
| `/insurers` | 0 B (server) | 225 kB shared |
| `/insurers/[slug]` | 0 B (SSG) | 225 kB shared |
| shared JS | | 243 kB |

New client dependency footprint: **none**. Query count: **0** (locked cohort artifact). Profiles are SSG. Landing is dynamic only for `?q=`.

## GATES

Non-cohort slugs 404. Search clickable results = 26 only. TDI not rendered. Scores null. Homepage/Florida fingerprints unchanged. Evidence DB writes 0.
