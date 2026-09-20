/**
 * TH-SEARCH-R1-019F: insurance-name-candidates-v1 -- a narrow sibling of
 * trusthub-specialist-execution-v2 for ORGANIZATION-NAME candidate discovery with truthful
 * continuation. v2 is left intact (same contract, version and fingerprints) for its identifier /
 * cohort / evidence consumers; its `total` is read by consumers as an exact census, which a
 * continuing candidate stream cannot always honour, so continuation lives here instead.
 *
 * This file owns NO matching. It is an adapter over searchInsuranceNameCandidates (the same engine
 * native /ask uses), so the two surfaces cannot drift.
 */
import { createHash } from 'crypto';
import { INSURANCE_ASK_INPUT_LIMIT } from '@/lib/insurance-ask/contract';
import { searchInsuranceNameCandidates, type AskCard } from '@/lib/insurance-ask/execute';
import { NAME_CANDIDATE_MAX_PAGE, NAME_CANDIDATE_WINDOW } from '@/lib/insurance-ask/name-candidates';
import { distinctiveNameTokens, normalizeSourceName } from '@/lib/insurance-ask/name-match';
import { planInsuranceRequest } from '@/lib/insurance-ask/request';
import { classifyBailBondDirectoryPublication } from '@/lib/directory/bail-bond-publication';

export const INSURANCE_NAME_CANDIDATES_CONTRACT = 'insurance-name-candidates-v1' as const;
export const INSURANCE_NAME_CANDIDATES_VERSION = '1.0.0' as const;
export const INSURANCE_NAME_CANDIDATES_PATH = '/api/specialist-execution/name-candidates/v1' as const;
export const INSURANCE_NAME_CANDIDATES_MAX_LIMIT = NAME_CANDIDATE_WINDOW;

export const NAME_CANDIDATE_RESULT_STATES = ['CANDIDATES', 'NO_MATCH', 'PARTIAL_REFINE_REQUIRED', 'INVALID_REQUEST', 'UNSUPPORTED_OPERATION', 'RESTRICTED_SCOPE', 'SOURCE_UNAVAILABLE', 'TIMEOUT'] as const;
export type NameCandidateResultState = (typeof NAME_CANDIDATE_RESULT_STATES)[number];

const SCHEMA_SHAPE = {
  request: ['contract', 'operation', 'name', 'entityClass', 'page', 'limit'],
  response: ['contract', 'contractVersion', 'schemaFingerprint', 'hub', 'operation', 'resultState', 'name', 'scope', 'candidates', 'pagination', 'limitations', 'error'],
  name: ['supplied', 'normalized', 'distinctiveTokens', 'predicateApplied', 'predicate'],
  candidate: ['stableKey', 'entityClass', 'displayName', 'npn', 'naicCode', 'match', 'publicationState', 'action', 'profileUrl', 'selectionUrl', 'whyMatched'],
  match: ['field', 'value', 'method'],
  action: ['type', 'url'],
  pagination: ['page', 'limit', 'returned', 'hasMore', 'nextPage', 'outOfRange', 'matchedCount', 'matchedCountIsExact', 'completeness', 'suppressedByPublicationPolicy'],
  resultStates: NAME_CANDIDATE_RESULT_STATES,
  entityClasses: ['agency', 'legal_insurer'],
  publicationStates: ['PUBLIC_PROFILE', 'RESEARCH_ROW_ONLY'],
  actionTypes: ['PROFILE', 'RESEARCH'],
  completeness: ['COMPLETE', 'SCAN_BOUND_REACHED'],
} as const;
export const INSURANCE_NAME_CANDIDATES_SCHEMA_FINGERPRINT = createHash('sha256').update(JSON.stringify(SCHEMA_SHAPE)).digest('hex');

export type NameCandidatesRequest = { contract?: string; operation?: string; name?: unknown; entityClass?: unknown; page?: unknown; limit?: unknown };
export type NameCandidateRow = {
  stableKey: string;
  entityClass: 'agency' | 'legal_insurer';
  displayName: string;
  npn: string | null;
  naicCode: string | null;
  match: { field: string; value: string; method: string };
  publicationState: 'PUBLIC_PROFILE' | 'RESEARCH_ROW_ONLY';
  /** The ONE thing a consumer should link: a published hub profile, or the server-revalidated research continuation. */
  action: { type: 'PROFILE' | 'RESEARCH'; url: string };
  profileUrl: string | null;
  selectionUrl: string;
  whyMatched: string;
};
export type NameCandidatesEnvelope = {
  contract: typeof INSURANCE_NAME_CANDIDATES_CONTRACT;
  contractVersion: typeof INSURANCE_NAME_CANDIDATES_VERSION;
  schemaFingerprint: string;
  hub: 'insurance';
  operation: 'name_candidates';
  resultState: NameCandidateResultState;
  name: { supplied: string | null; normalized: string | null; distinctiveTokens: string[]; predicateApplied: boolean; predicate: string };
  scope: { searched: string[]; excluded: string[] };
  candidates: NameCandidateRow[];
  pagination: { page: number; limit: number; returned: number; hasMore: boolean; nextPage: number | null; outOfRange: boolean; matchedCount: number | null; matchedCountIsExact: boolean; completeness: 'COMPLETE' | 'SCAN_BOUND_REACHED'; suppressedByPublicationPolicy: number };
  limitations: string[];
  error?: { code: string; message: string };
};

const PREDICATE = 'One source-name field (agency legal_name or display_name; legal-insurer canonical_legal_name) contains every distinctive word of the supplied name as a whole word after case / whitespace / punctuation / ampersand normalization; an equal normalized name ranks first. Matching is applied to every source row BEFORE any window is cut.';
const SCOPE = {
  searched: ['Agency identities in the accepted national source graph (research rows; no public agency profile)', 'Legal insurers in the published Wave-1 cohort (public profiles)'],
  excluded: ['Individual producers / persons', 'Unpublished legal-insurer inventory', 'Directory listings', 'Consumer brands', 'Appointment carrier rows', 'Name-only complaint / examination / enforcement attachment'],
};
const LIMITATIONS = [
  'A name match is a candidate, not an identity finding, a license finding or an appointment finding.',
  'Agency and legal insurer are separate entity classes and are keyed independently.',
  'matchedCount is reported only when the source was read to its end; otherwise it is null and no total is asserted.',
  'A research-row action is a server-revalidated InsuranceTrustHub research continuation, not a profile.',
  // TH-SEARCH-R1-019F-R1 (publication-suppression review): INS-DIR-BAIL-001 retains bail-bond evidence and
  // keeps such businesses out of consumer insurance-agency LISTINGS; it does not remove them from the
  // research identity graph, and native /ask shows them as research rows. This network surface follows the
  // released trusthub-specialist-execution-v2 precedent (bailRowsSuppressedOnPage): the identity stays in
  // the one deterministic stream -- so windows, continuation and matchedCount are identical on every
  // surface -- and is withheld from THIS page's candidates, with the number withheld disclosed.
  'Bail-bond businesses are withheld from this network surface per the consumer-directory publication firewall: pagination.suppressedByPublicationPolicy counts identities withheld on this page, so returned may be below limit while hasMore is true. matchedCount counts matched source identities, including withheld ones.',
];

function envelope(state: NameCandidateResultState, page = 1, limit = INSURANCE_NAME_CANDIDATES_MAX_LIMIT): NameCandidatesEnvelope {
  return {
    contract: INSURANCE_NAME_CANDIDATES_CONTRACT, contractVersion: INSURANCE_NAME_CANDIDATES_VERSION, schemaFingerprint: INSURANCE_NAME_CANDIDATES_SCHEMA_FINGERPRINT,
    hub: 'insurance', operation: 'name_candidates', resultState: state,
    name: { supplied: null, normalized: null, distinctiveTokens: [], predicateApplied: false, predicate: PREDICATE },
    scope: SCOPE, candidates: [],
    pagination: { page, limit, returned: 0, hasMore: false, nextPage: null, outOfRange: false, matchedCount: null, matchedCountIsExact: false, completeness: 'COMPLETE', suppressedByPublicationPolicy: 0 },
    limitations: [...LIMITATIONS],
  };
}
function refuse(state: NameCandidateResultState, status: number, code: string, message: string, supplied: string | null = null) {
  const body = envelope(state); body.error = { code, message };
  if (supplied !== null) body.name = { ...body.name, supplied, normalized: normalizeSourceName(supplied), distinctiveTokens: distinctiveNameTokens(supplied) };
  return { status, body };
}

export function insuranceNameCandidatesCapability() {
  return {
    contract: INSURANCE_NAME_CANDIDATES_CONTRACT, contractVersion: INSURANCE_NAME_CANDIDATES_VERSION, schemaFingerprint: INSURANCE_NAME_CANDIDATES_SCHEMA_FINGERPRINT,
    hub: 'insurance', operation: 'name_candidates', endpoint: INSURANCE_NAME_CANDIDATES_PATH, method: 'POST',
    request: { required: ['operation', 'name'], optional: ['contract', 'entityClass', 'page', 'limit'], nameLength: [2, INSURANCE_ASK_INPUT_LIMIT - 5], entityClasses: ['agency', 'legal_insurer'], defaultLimit: INSURANCE_NAME_CANDIDATES_MAX_LIMIT, maxLimit: INSURANCE_NAME_CANDIDATES_MAX_LIMIT, maxPage: NAME_CANDIDATE_MAX_PAGE },
    continuation: 'Deterministic page continuation: page N is the Nth window of one match-first, deterministically ordered candidate stream. Follow pagination.nextPage while pagination.hasMore is true. No exact total is required; matchedCount is null unless matchedCountIsExact.',
    resultStates: NAME_CANDIDATE_RESULT_STATES, predicate: PREDICATE, scope: SCOPE, limitations: LIMITATIONS,
  };
}

export async function executeInsuranceNameCandidatesV1(req: NameCandidatesRequest): Promise<{ status: number; body: NameCandidatesEnvelope }> {
  if (!req || typeof req !== 'object' || Array.isArray(req)) return refuse('INVALID_REQUEST', 400, 'invalid_request', 'Request must be a JSON object.');
  const known = ['contract', 'operation', 'name', 'entityClass', 'page', 'limit'];
  const unknown = Object.keys(req).filter((key) => !known.includes(key));
  if (unknown.length) return refuse('INVALID_REQUEST', 400, 'unknown_field', `Unsupported field(s): ${unknown.join(', ')}. Nothing was ignored.`);
  if (req.contract != null && req.contract !== INSURANCE_NAME_CANDIDATES_CONTRACT) return refuse('INVALID_REQUEST', 400, 'contract_mismatch', 'Unsupported contract.');
  if (req.operation !== 'name_candidates') return refuse('UNSUPPORTED_OPERATION', 422, 'unsupported_operation', 'The only operation is name_candidates.');
  if (typeof req.name !== 'string') return refuse('INVALID_REQUEST', 400, 'invalid_name', 'name must be text.');
  const name = req.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > INSURANCE_ASK_INPUT_LIMIT - 5) return refuse('INVALID_REQUEST', 400, 'invalid_name_length', `name must be 2 to ${INSURANCE_ASK_INPUT_LIMIT - 5} characters; nothing was truncated.`, name);
  const page = req.page ?? 1, limit = req.limit ?? INSURANCE_NAME_CANDIDATES_MAX_LIMIT;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > NAME_CANDIDATE_MAX_PAGE) return refuse('INVALID_REQUEST', 400, 'invalid_page', `page must be an integer from 1 to ${NAME_CANDIDATE_MAX_PAGE}.`, name);
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > INSURANCE_NAME_CANDIDATES_MAX_LIMIT) return refuse('INVALID_REQUEST', 400, 'invalid_limit', `limit must be an integer from 1 to ${INSURANCE_NAME_CANDIDATES_MAX_LIMIT}.`, name);
  if (req.entityClass === 'producer' || req.entityClass === 'person') return refuse('RESTRICTED_SCOPE', 422, 'producer_name_discovery_restricted', 'Individual producers are not searched by unscoped name discovery.', name);
  if (req.entityClass != null && req.entityClass !== 'agency' && req.entityClass !== 'legal_insurer') return refuse('INVALID_REQUEST', 400, 'invalid_entity_class', 'entityClass must be agency or legal_insurer.', name);
  if (!distinctiveNameTokens(name).length) return refuse('INVALID_REQUEST', 400, 'no_distinctive_name_word', 'Enter a distinctive organization name. Generic insurance / agency / company words do not identify a business.', name);

  // The hub-owned research link re-enters native /ask as "Find <name>". It is only honest to issue it
  // if native /ask reads that text as THIS name -- otherwise the link could not be revalidated there.
  const q = `Find ${name}`, native = planInsuranceRequest(q, 1, {}).query;
  if (native.mode === 'fail_closed' || !native.nameQuery || normalizeSourceName(native.nameQuery) !== normalizeSourceName(name)) {
    return refuse('UNSUPPORTED_OPERATION', 422, 'not_an_organization_name', 'This input is not read as a single organization name (it may contain an identifier, a place, or a research task). Nothing was searched.', name);
  }
  const requestedClass = req.entityClass === 'legal_insurer' ? 'insurer' as const : req.entityClass === 'agency' ? 'agency' as const : undefined;
  const nativeClass = native.entityClass === 'agency' || native.entityClass === 'insurer' ? native.entityClass : undefined;
  if (native.entityClass === 'person') return refuse('RESTRICTED_SCOPE', 422, 'producer_name_discovery_restricted', 'Individual producers are not searched by unscoped name discovery.', name);
  if (requestedClass && nativeClass && requestedClass !== nativeClass) return refuse('INVALID_REQUEST', 400, 'entity_class_conflict', 'entityClass conflicts with the class the name itself states. Nothing was substituted.', name);

  let search;
  try {
    search = await searchInsuranceNameCandidates({ name: native.nameQuery, entityClass: requestedClass ?? nativeClass, page, limit, q });
  } catch (error) {
    // A source failure is never a miss, an empty window, or a last page.
    const message = error instanceof Error ? error.message : '';
    const timeout = /timeout|timed out|aborted/i.test(message);
    return refuse(timeout ? 'TIMEOUT' : 'SOURCE_UNAVAILABLE', timeout ? 504 : 503, timeout ? 'source_timeout' : 'source_unavailable', timeout ? 'The source search timed out. This is not a no-match result.' : 'The source search is unavailable. This is not a no-match result.', name);
  }

  const { window, stream, cards } = search;
  const published = (card: AskCard) => !(card.entityClass === 'agency' && classifyBailBondDirectoryPublication({ businessNames: [card.displayName], licenseEvidence: [card.licenseClass, ...card.loas] }).excludeFromConsumerDirectory);
  const visible = cards.filter(published);
  const bounded = window.completeness === 'SCAN_BOUND_REACHED';
  const state: NameCandidateResultState = bounded ? 'PARTIAL_REFINE_REQUIRED' : stream.candidates.length ? 'CANDIDATES' : 'NO_MATCH';
  const body = envelope(state, page, limit);
  body.name = { supplied: name, normalized: normalizeSourceName(name), distinctiveTokens: stream.tokens, predicateApplied: true, predicate: PREDICATE };
  body.candidates = visible.map((card) => {
    const cls = card.entityClass === 'insurer' ? 'legal_insurer' as const : 'agency' as const;
    // Publication truth: a profile action exists only where the engine supplied a published profile.
    const profileUrl = card.href ?? null, selectionUrl = card.selectionHref!;
    return {
      stableKey: `insurance:${cls}:${card.entityId}`, entityClass: cls, displayName: card.displayName, npn: card.npn, naicCode: card.naicCode,
      match: { field: card.matchEvidence!.field, value: card.matchEvidence!.value, method: card.matchEvidence!.method },
      publicationState: profileUrl ? 'PUBLIC_PROFILE' as const : 'RESEARCH_ROW_ONLY' as const,
      action: profileUrl ? { type: 'PROFILE' as const, url: profileUrl } : { type: 'RESEARCH' as const, url: selectionUrl },
      profileUrl, selectionUrl, whyMatched: card.whyMatched,
    };
  });
  body.pagination = { page: window.page, limit: window.limit, returned: body.candidates.length, hasMore: window.hasMore, nextPage: window.nextPage, outOfRange: window.outOfRange, matchedCount: window.matchedCount, matchedCountIsExact: window.matchedCount !== null, completeness: window.completeness, suppressedByPublicationPolicy: cards.length - visible.length };
  if (bounded) body.limitations = ['The name is broad enough that the source scan bound was reached: this is not a complete candidate list and no total is asserted. Refine the name.', ...body.limitations];
  return { status: 200, body };
}
