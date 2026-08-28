# FL-INS-006 — denominator dictionary

Do not sum across grains.

| Term | Grain |
|------|--------|
| provider | Public `providers` row (directory). Not a graph entity. |
| agency | `national_entities.entity_kind=agency` |
| person | `national_entities.entity_kind=person` |
| credential row | One `license_credentials` row (jurisdiction + kind + namespace + number) |
| licensed agency | Distinct agency with ≥1 Florida credential row. Blank status is unknown, not inactive. |
| producer credential | FL person credential; TYCL is class, not LOA. Do not flatten all classes to “insurance agents.” |
| appointment observation | One `national_relationships` row (`appointed_by` agency or `APPOINTED_TO` person) |
| DFS appointer | `carrier:fl-dfs:{number}` — not NAIC |
| OIR company | Active Company Search company (FL CoCode grain) |
| legal insurer | `legal-insurer:naic:{CoCode}` |
| MIR reporting insurer | Distinct NAIC in June 2026 statewide extract (trade secret omitted) |
| PIF | MIR policies in force as of 2026-06-30, by total/personal/commercial |
| written premium | MIR direct written premium for policies in force as of that date |
| exposure | MIR dollar exposure for policies in force |
| surplus-lines eligible insurer | OIR surplus-lines eligibility observation |
| CMS observation | One `cms_marketplace_observations` row; not a Florida license |
| regulatory record | One `regulatory_evidence` row |
| liquidation record | DFS receiver open-company LIQUIDATION row |
| NFIP registry card | Public floodsmart agency card (no NPN) |

## Reconciliation identities (must hold)

- agency namespace counts sum to Florida agency credential rows  
- person namespace counts sum to Florida person credential rows  
- MIR observations + FSLSO observations = `market_intelligence_observations`  
- MIR personal residential PIF + commercial residential PIF = snapshot PIF total (stored `policies_in_force_total` is the MIR rank column and is unused)  
- CMS ATTACHED + UNATTACHED + KIND_CONFLICT = national CMS observations  
- FSLSO CONFIRMED + UNRESOLVED = eligible observations  
- appointed_by status counts sum to 2,680  

Do not add OIR companies + legal insurers + MIR insurers. Those grains overlap.
