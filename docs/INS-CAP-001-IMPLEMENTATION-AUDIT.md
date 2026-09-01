# INS-CAP-001 implementation audit

Audited base: `a758a34812dc47a119156ce12d3be74cd8552e0b`.

The accepted `insurance-ask-v1` path already provides deterministic entity-class
interpretation, exact labeled NPN/NAIC execution, agency credential-jurisdiction
cohorts, neutral pagination, source clocks and the legal-insurer Wave-1 gate.

The missing layer was normalization: explicit V2 result states, strict structured
POST validation, class clarification, refinements, publication-aware destinations
and machine-readable unsupported-capability responses. The implementation therefore
wraps `executeInsuranceAsk`; it does not add a query engine or database write path.

Locked semantics:

- agency, producer/person and legal insurer remain separate;
- Florida agency geography means credential jurisdiction;
- legal-insurer state/domicile cohorts remain unsupported;
- producer mass publication remains prohibited;
- bail-bond-only rows are suppressed from ordinary agency responses;
- service territory and product availability fail closed;
- only the accepted 26-profile legal-insurer Wave 1 may return insurer profiles.
