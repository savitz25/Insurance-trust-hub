# INS-DIR-BAIL-001 — Bail-bond consumer directory firewall

Bail-bond evidence is retained. It is not a Health / Life / P&C insurance-agency listing.

## STATUS

**COMPLETE** (pending merge)

## CENSUS (Production, read-only)

| Measure | N |
|---|---:|
| Verified provider flag rows | 169,870 |
| Graph `license_namespace=bail_bond` credentials | 2 |
| Provider rows with authoritative bail-license text | 566 |
| Provider rows with clear bail business name only | 63 |
| Mixed bail + separate non-bail insurance credentials | **0** |
| Consumer-visible bail-only after firewall | **0** |
| Provider sitemap URLs before / after | 0 / 0 |
| DB mutation | **0** |

Mixed count is 0, so the entity-level exclude rule stays simple.

## RULE

Authoritative: license/source text contains word BAIL and BOND (or SURETY BAIL).

Defensive name: standalone word BAIL / BAIL BONDS / BAILBOND. Bailey and Bailie surnames are not matches.

Wired into the shared promotion gate and every state `evaluate*PromotionEligibility` (FL, TX, NC, OH, NJ, NV, VT, MA, MS) plus admin verified save.
