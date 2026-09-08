# Trust Hub Specialist Search V1 — Insurance port

Status: Insurance local implementation. Reference: Contractor `697052a4fd2d1ba2ced985c5373315fd16517ed8`; Move `bb7177cdf7eb9c26ffe8c24884212a4f16950d07`; Lender `964faacdb780d0421f7a404c6f9daecaf0af17d3`; Senior `060952b994aded2edd4e0aa41abfb9bba2fe022b`.

## Shared network behavior

The local contract preserves the network anatomy: a question-first bounded input, one Research action, examples, Advanced filters, visible/removable interpretation, identity and evidence result anatomy, structure-derived match reasons, per-result trace, explicit capability states, safe no-match handling, normalized analytics, and keyboard/touch layouts from 320px upward. `/ask` remains `noindex,follow`.

## Insurance domain adapter

`lib/insurance-ask` remains the specialist brain. It owns NPN and NAIC syntax, agency/person/legal-insurer classes, credentials, source-native LOA, appointments, Marketplace plan-year evidence, geography meaning, publication gates, counts and source execution. Natural language may interpret; only parameterized source execution establishes facts.

The adapter never equates NPN with NAIC, agency with producer or legal insurer, LOA with appointment, Marketplace evidence with a state license, domicile/credential/ZIP with service territory, or complaint/exam/rate-filing observations with wrongdoing. Public people and graph-agency profiles remain unpublished; search does not bypass those gates.

## Homepage and directory boundary

The Specialist Search shell is the primary homepage research entry. ZIP directory search remains a secondary handoff. Directory listings are a distinct publication grain, not canonical regulatory identity or proof of service territory.

## Capability and failure contract

States are `KNOWN`, `UNKNOWN`, `PARTIAL`, `NOT_ACQUIRED`, `REQUEST_ONLY`, and `UNSUPPORTED`. Complete Texas authorized-company, New Jersey surplus-lines, and California admitted-insurer rosters are not acquired; absence is never rendered as zero. Regulatory-query failure returns a bounded unavailable state without exposing credentials or stack traces.

## Ordering and privacy

Exact labeled identifiers precede structured identity/evidence discovery. Ordering is neutral relevance, never quality, price, safety, or recommendation. Analytics records normalized intent/class/state/filter/result buckets only; raw questions and exact identifiers are excluded.
