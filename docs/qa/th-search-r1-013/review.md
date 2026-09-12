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

Final adapter review also removed the remaining structured GET truncation and Wave-1 publication-as-credential status. Structured name rows now include the source match evidence and safe server-revalidated selection URLs. Runtime validation rejects malformed structured objects and duplicate GET parameters. The focused gate now has 58 passing checks.

A repeated optimized browser run caught intermittent source statement timeouts when the Texas LOA page and exact total were requested in one SQL operation. The final executor separates the filtered page from its exact filtered count, reusing the existing ten-minute count cache (keyed by class, jurisdiction, LOA operation/values and accepted fingerprint). No page-sized or unfiltered total substitutes for the count. A read-only post-change probe completed in 8,003 ms with the supported Texas rows. Multi-LOA alternatives that cannot be executed completely clarify rather than discarding all but the first term.
