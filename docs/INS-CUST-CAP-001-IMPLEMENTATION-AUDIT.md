# INS-CUST-CAP-001 implementation audit

Date: 2026-09-02
Starting main: `368fc11187665c29b610982174ade71efe81bfe5`

This was a read-only census. It performed no database, identity, profile,
sitemap, or publication writes.

## Decision

- Legal insurer: ready for exact customer-profile validation inside the locked
  Wave-1 public cohort only.
- Agency: blocked. The graph has exact organization identities and NPNs, but
  the accepted publication contract has zero public graph-agency profiles and
  therefore no canonical public agency destinations.
- Producer/person and all other Insurance entity classes: nonclaimable.

## Legal-insurer census

The canonical `ins-insurer-005b-public-ready-cohort.json` and the public route
builder were reconciled with Production exact-NAIC behavior.

| Measure | Count |
|---|---:|
| Current Wave-1 public profiles | 26 |
| Exact five-digit NAIC Company Code | 26 |
| Stable native `national_entities.id` UUID | 26 |
| Canonical public profile destination | 26 |
| Intersection satisfying every claim-validation prerequisite | 26 |
| Duplicate NAIC identifiers in Wave 1 | 0 |
| Duplicate canonical destinations | 0 |
| Malformed NAIC identifiers | 0 |
| Publication holds inside Wave 1 | 0 |

Native identity is the existing `national_entities.id`; it is not derived from
the NAIC code, slug, or name. Publication is independently revalidated through
the locked Wave-1 gate on every request.

## Agency census

The canonical production graph was read in stable UUID order.

| Measure | Count |
|---|---:|
| Canonical agency research identities | 82,071 |
| Identities with an exact NPN | 82,071 |
| Stable native UUID identities | 82,071 |
| Confirmed identity state | 82,071 |
| Distinct agency NPNs | 82,071 |
| Agency NPN collisions | 0 |
| Public graph-agency profiles | 0 |
| Canonical public agency destinations | 0 |
| Claim-eligible intersection | 0 |
| Research-only agencies | 82,071 |
| Public profiles lacking exact NPN | 0 |
| Exact-NPN identities lacking a public graph-agency profile | 82,071 |

Directory listings are a separate product surface and are not canonical graph
agency profiles. They cannot satisfy the customer claim contract.

## Live contract audit

Production returned `EXACT_IDENTITY` for NAIC `10064` as legal insurer
`CITIZENS PROP INS CORP`, with the existing public destination. NPN `10391484`
returned an agency `RESEARCH_ROW_ONLY` with no destination. These results prove
that research execution alone is not sufficient customer-claim eligibility.

## Implementation scope

Add one legal-insurer-only validation endpoint. Agency requests return a
publication-restricted result with the exact missing prerequisite. Producer,
brand, group, appointer/carrier relationship, directory-only, bail-bond, and
unknown classes fail closed. Existing specialist execution remains unchanged.

## Accepted-main regression observation

The aggregate `npm test` command stops at the pre-existing INS-NAT-003 graph
SQL fingerprint assertion (`f1519ff32ad664abcc78f0b7a564a653ae741c98f7c516a7dc7eb3376b6cb855`).
The exact same failure reproduces on an untouched worktree at starting main.
INS-CUST-CAP-001 does not modify that SQL or its check.
