# FL-INS-004 — Receivership / rehabilitation / liquidation semantics

Official list: https://www.myfloridacfo.com/division/receiver/companies  
Authority: Florida DFS, Division of Rehabilitation and Liquidation (court-appointed receiver)

## Families

| Official list / detail status | Family | Disposition |
|-------------------------------|--------|-------------|
| Companies in Liquidation / “Liquidation” | `LIQUIDATION` | `LIQUIDATION` |
| Companies in Rehabilitation / “Rehabilitation” | `REHABILITATION` | `REHABILITATION` |
| Receivership without a more specific official word | `RECEIVERSHIP` | `RECEIVERSHIP` |

Liquidation is **not** stored as generic receivership when the source says liquidation. Rehabilitation is not liquidation.

## What this evidence is not

- Not a market-conduct finding
- Not a financial-exam finding
- Not a Civil Remedy Notice
- Not a conduct violation, unfair-trade-practice determination, or Trust Score input
- NAIC company-status codes 0/4/6 remain **status**, not an event, and are not copied here (`naicCompanyStatusIsReceivershipEvent() = false`)

## Identity

Open-company list and detail pages publish the company name, court case number (when present), and important dates. They do **not** publish NAIC or Florida Company Code.

Name-only identity is rejected. Rows are stored unattached (`entity_id` NULL, `attribution_confidence = UNRESOLVED`, `publication_readiness = INTERNAL_ONLY`).

`record_identifier` = `receivership:{detail-id}`  
`source_dataset` = `florida_dfs_receiver_companies`

Example: FedNat detail `/companies/detail/562`, court case `2022 CA 001688`, liquidation 2022-09-27, no NAIC on the page.

## Finality

The court order placing a company into liquidation or rehabilitation is a final **receivership instrument**. The estate may still be open. `is_final = true` describes that instrument, not a consumer-conduct finding.
