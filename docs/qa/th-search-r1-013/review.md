# Separate review pass

Method: self-review of the complete diff and automated behavioral/contract/browser checks. No independent human review is claimed. Ask's `lib/network/insurance-ask.ts` was inspected read-only from current main: it checks insurance-ask-v1 and accepts additive query/result metadata. Existing name/npn/entityClass/count/provenance fields remain compatible. Parent routing/choice rendering is not certified here.

Reviewed identity/class precedence, legal/display-name provenance, escaped parameterized ILIKE, bounded predicates before limits, stable candidate selection, held-profile boundaries, typed overrides, input/cache parity, geography meanings, LOA/appointment/Marketplace separation, recovery allowlists, source failure, and first interaction.

Findings repaired during review:
- Bare-name inference intercepted a generic clean-record question; generic question structures now retain the safety branch.
- Marketplace previously defaulted unresolved identity to person and used overlay status as credential status; it now requires resolved source identity and labels observations separately.
- Wave-1 publication status and examination jurisdiction were exposed as credential fields; those unsupported claims are absent.
- LOA and credential predicates could use different issuer jurisdictions; the maintained source-dataset jurisdiction contract is required before pagination.
- Appointer name lookup searched unrelated agency/person names; it now uses the existing carrier-class source spine.
- Directory ZIP was previously ignored while county/state metadata broadened retrieval; recorded address ZIP is now the actual bounded predicate.
- A baseline nested footer link causes React hydration replacement and first-input loss. Only the redundant outer anchor was removed; real footer rendering and browser first-entry checks cover it.

No data/schema/auth/publication changes. No new raw-name analytics. Search pages retain noindex and profile links retain existing eligibility. Global lint and older stale homepage-fingerprint/label assertions are reported against the exact baseline, not weakened.
