# InsuranceTrustHub specialist execution V2

Endpoint: `GET|POST /api/specialist-execution/v2`
Contract: `trusthub-specialist-execution-v2`
Version: `2.0.0`

The endpoint is a normalization adapter over `insurance-ask-v1`. It returns explicit
result states, public-safe rows, exact totals, bounded pagination, source-native
refinements, provenance, limitations and existing destinations.

## Classes and publication

- `agency`: source-backed research rows; graph-agency profiles remain zero.
- `producer`: labeled NPN verification only; public mass-person execution and
  producer profiles remain prohibited.
- `legal_insurer`: exact NAIC verification and the accepted 26-profile Wave-1
  cohort. The other graph identities do not become public profiles.

Directory listings are not canonical graph agencies. Legal insurer is not carrier
kind, brand, NAIC group, appointer row or CMS/Marketplace entity.

## Geography

Agency state cohorts mean **credential jurisdiction**. This is not office location,
domicile, service territory or product availability. Complete legal-insurer state
and domicile cohorts are unavailable. County appointments are not county service
territory.

## Result and HTTP states

- `200`: supported results, exact identity, true zero, no confident match
- `400`: malformed request or identifier
- `422`: unsupported capability or publication-restricted class
- `503`: backend unavailable
- `504`: timeout

Machine states are `SUPPORTED_RESULTS`, `ZERO_MATCHING_ROWS`, `EXACT_IDENTITY`,
`AMBIGUOUS_IDENTITIES`, `NO_CONFIDENT_MATCH`, `UNSUPPORTED_CAPABILITY`,
`PUBLICATION_RESTRICTED`, `INVALID_QUERY`, `BACKEND_UNAVAILABLE`, and `TIMEOUT`.

## Examples

`GET /api/specialist-execution/v2?q=insurance%20agencies%20in%20Florida` returns
bounded agency rows and the exact credential-jurisdiction total.

`GET ...?q=NPN%2010391484` performs labeled exact-NPN research. A person match may
have no internal profile destination.

`GET ...?q=NAIC%2010064` returns the exact accepted Wave-1 legal insurer and existing
profile destination.

`POST` Wave-1 request:

```json
{"contract":"trusthub-specialist-execution-v2","queryType":"cohort","entityClass":"legal_insurer","page":1,"limit":20}
```

`insurance company in Texas` returns `UNSUPPORTED_CAPABILITY`: current evidence is
not a complete publication-safe Texas domicile or availability cohort.

`insurance agents in Florida` returns `PUBLICATION_RESTRICTED`.

`insurance companies serving Texas` returns `UNSUPPORTED_CAPABILITY`; credentials
or regulator observations do not prove service territory or product availability.

## Semantics and safety

NPN and NAIC requests are exact labeled identifier research. Bare digits are not
guessed. License and LOA are not appointments. Complaint is not violation;
complaint index and examination are not enforcement. No TrustHub ranking, score,
recommendation or paid ordering is produced.

The source clock is the evidence clock, never deployment time. Request timeout and
backend failure remain distinct from a supported zero. Response limits are bounded
to 50 and execution remains server-side.
