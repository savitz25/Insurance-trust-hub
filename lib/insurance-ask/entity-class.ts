/**
 * TH-DISCOVERY-PARITY-001B — single, general provider-category classifier shared by interpret.ts
 * and research-intent.ts.
 *
 * Before this ticket each module carried its own divergent regex (interpret.ts's detectClass,
 * research-intent.ts's requestedClass). Neither recognized "broker"/"brokers" or a bare
 * "provider"/"providers" as the same category concept as "agent"/"agency", so unambiguous
 * provider-category requests like "insurance broker near Fort Worth" or "flood insurance provider
 * Miami" fell through to a parse-time "Clarification required" dead end instead of being read as a
 * normal discovery request. research-intent.ts's version was also missing "producer(s)" as a
 * person-class word, which interpret.ts already had -- a second, independent source of divergence.
 *
 * Order matters and is preserved from the original logic: a legal-insurer word is only honored
 * when no agency/person word is also present, and an agency word always wins over a person word
 * (an agency name such as "XYZ Insurance Agency Producers Inc" should not misclassify). This must
 * never blur the regulatory distinction between agency, producer/person, and legal insurer (see
 * contract.ts's ASK_DEFINITIONS.agency_vs_insurer) -- it only widens the VOCABULARY each class is
 * recognized from, not the classes themselves.
 */
import type { InsuranceEntityClass } from './contract';

export function detectRequestedEntityClass(q: string): InsuranceEntityClass | undefined {
  const hasAgencyWord = /\bagenc(?:y|ies)\b|\bbrokers?\b/i.test(q);
  const hasPersonWord = /\b(?:producers?|individuals?|persons?|agents?)\b/i.test(q);
  const hasInsurerWord = /\b(?:legal insurers?|insurers?|carriers?|insurance compan(?:y|ies))\b/i.test(q);
  const hasGenericProviderWord = /\bproviders?\b/i.test(q);

  if (hasInsurerWord && !hasAgencyWord && !hasPersonWord) return 'insurer';
  if (hasPersonWord && !hasAgencyWord) return 'person';
  if (hasAgencyWord) return 'agency';
  // A bare "provider"/"providers" (no agency/person/insurer word) names a generic provider
  // category, not one specific regulated class. Default it to agency -- the class this source can
  // actually browse as a real, honest inventory (see execute.ts's listAgencies) -- and let the
  // caller's own disclosures say this is a category default, never an asserted regulatory class.
  if (hasGenericProviderWord) return 'agency';
  return undefined;
}
