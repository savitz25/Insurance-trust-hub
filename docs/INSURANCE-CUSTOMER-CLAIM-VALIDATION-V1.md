# Insurance customer claim validation V1

Endpoint: `POST /api/customer-claim-validation/v1`
Contract: `insurance-customer-claim-validation-v1`
Version: `1.0.0`

Schema fingerprint:
`cc8d6cc82c4e118e266607196cad17ecf99033f4ee1bb6c46ffceceddf62741b`

Contract fingerprint:
`b6396688c36251e59e906db2b98cde40fd88d46c271e31598d7bd0a22c06c9eb`

This endpoint revalidates exact InsuranceTrustHub profile identity and current
publication eligibility. It does not create a claim, authenticate a customer,
verify ownership/control, publish a profile, or write to the database.

## Supported class

Only `legal_insurer` is validation-ready, and only for the locked existing
Wave-1 public cohort. A successful request must bind all of:

- existing `national_entities.id` as `nativeProfileId`;
- exact five-digit NAIC Company Code;
- exact existing canonical public profile URL;
- current Wave-1 publication eligibility.

Agency requests return `PUBLICATION_RESTRICTED`. Although 82,071 canonical
agency research identities have stable UUIDs and exact NPNs, the accepted
publication contract has zero public graph-agency profiles and zero canonical
agency profile destinations. Directory listings are not substitutes.

Producer requests return `PUBLICATION_RESTRICTED`. Brand, group, carrier or
appointer relationship, directory-only, and bail-bond entities return
`ENTITY_CLASS_RESTRICTED`.

## Request example

```json
{
  "contract": "insurance-customer-claim-validation-v1",
  "entityClass": "legal_insurer",
  "nativeProfileId": "27d7418a-d2bf-4339-8c3b-4774e7f403bc",
  "naicCode": "10064",
  "canonicalProfileUrl": "https://www.insurancetrusthub.com/insurers/citizens-property-insurance-corporation"
}
```

Successful validation returns `EXACT_IDENTITY`, `PUBLIC_PROFILE`, the exact
native UUID and NAIC, and the same canonical URL. It includes only public
identity and provenance fields.

## Result states

- `EXACT_IDENTITY`
- `INVALID_QUERY`
- `NO_CONFIDENT_MATCH`
- `PUBLICATION_RESTRICTED`
- `ENTITY_CLASS_RESTRICTED`
- `IDENTIFIER_MISMATCH`
- `NATIVE_PROFILE_MISMATCH`
- `CANONICAL_DESTINATION_MISMATCH`
- `PUBLICATION_HOLD`
- `BACKEND_UNAVAILABLE`

Responses use `Cache-Control: no-store` and
`X-Robots-Tag: noindex, nofollow`. Invalid requests use HTTP 400; restricted or
held publication uses HTTP 422; backend failures use HTTP 503.

The endpoint never falls back by name, address, license, appointment, line of
authority, geography, brand, or group relationship. Claim status cannot affect
publication, indexing, ordering, evidence, or ranking.
