import { executeInsuranceAsk, publicAskPayload, type InsuranceAskResult } from '@/lib/insurance-ask/execute';
import { INSURANCE_ASK_PAGE_SIZE, LOCKED_CENSUS } from '@/lib/insurance-ask/contract';
import { classifyBailBondDirectoryPublication } from '@/lib/directory/bail-bond-publication';
import { listPublishedInsurers, insurerProfilePath } from '@/lib/national/legal-insurer-pilot';
import {
  SPECIALIST_EXECUTION_CONTRACT,
  SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
  SPECIALIST_EXECUTION_MAX_LIMIT,
  SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  SPECIALIST_EXECUTION_VERSION,
  type ResultState,
  type SpecialistRequest,
  type V2EntityClass,
} from './contract';

const STATE_NAMES: Record<string, string> = {
  FL: 'Florida', TX: 'Texas', MA: 'Massachusetts', OH: 'Ohio', VT: 'Vermont',
};

type SafeRow = {
  entityClass: V2EntityClass;
  name: string;
  npn: string | null;
  naicCode: string | null;
  credentialJurisdiction: string | null;
  credentialStatus: string | null;
  licenseNumber?: string | null;
  licenseClass?: string | null;
  linesOfAuthority: string[];
  sourceDataset: string | null;
  sourceObservedAt: string | null;
  publicationState: 'RESEARCH_ROW_ONLY' | 'PUBLIC_PROFILE';
  destination: string | null;
  whyMatched: string;
};

export type SpecialistEnvelope = {
  contract: typeof SPECIALIST_EXECUTION_CONTRACT;
  contractVersion: typeof SPECIALIST_EXECUTION_VERSION;
  schemaFingerprint: string;
  contractFingerprint: string;
  queryInterpretation: Record<string, unknown>;
  appliedFilters: Record<string, unknown>;
  resultState: ResultState;
  rows: SafeRow[];
  total: number;
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
  availableRefinements: Array<{ key: string; values: string[]; limitation?: string }>;
  provenance: Record<string, unknown>;
  limitations: string[];
  destinations: Array<{ type: string; url: string }>;
  diagnostics: Record<string, unknown>;
  error?: { code: string; message: string; alternatives?: string[] };
};

class RequestError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const BASE_LIMITATIONS = [
  'Agency, individual producer, and legal insurer are separate entity classes.',
  'Credential jurisdiction is not office location, domicile, service territory, or product availability.',
  'License and line of authority are not appointments. County appointment is not service territory.',
  'Complaint is not violation. Complaint index is not enforcement. Examination is not enforcement.',
  'InsuranceTrustHub does not rank, recommend, score, or use paid ordering.',
];

function base(state: ResultState, page = 1, limit = INSURANCE_ASK_PAGE_SIZE): SpecialistEnvelope {
  return {
    contract: SPECIALIST_EXECUTION_CONTRACT,
    contractVersion: SPECIALIST_EXECUTION_VERSION,
    schemaFingerprint: SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
    contractFingerprint: SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
    queryInterpretation: {}, appliedFilters: {}, resultState: state, rows: [], total: 0,
    pagination: { page, limit, total: 0, hasMore: false },
    availableRefinements: [],
    provenance: {
      sourceFamily: 'InsuranceTrustHub accepted regulatory identity graph',
      sourceDataset: 'national_entities and source-native credential/evidence datasets',
      officialAsOf: '2026-08-28T14:43:51.753Z',
      retrievalDate: 'See row source clocks',
      publicationSemantics: 'Research rows do not create profiles. Producer profiles remain disabled. Legal insurers are limited to the accepted Wave-1 cohort.',
    },
    limitations: [...BASE_LIMITATIONS], destinations: [], diagnostics: {},
  };
}

function unsupported(code: string, message: string, alternatives: string[], interpretation: Record<string, unknown> = {}): SpecialistEnvelope {
  const out = base(code === 'producer_publication_restricted' ? 'PUBLICATION_RESTRICTED' : 'UNSUPPORTED_CAPABILITY');
  out.queryInterpretation = interpretation;
  out.error = { code, message, alternatives };
  return out;
}

function validate(req: SpecialistRequest): void {
  if (req.contract && req.contract !== SPECIALIST_EXECUTION_CONTRACT) throw new RequestError('contract_mismatch', 'Unsupported specialist contract.');
  if (req.entityClass && !['agency', 'producer', 'legal_insurer'].includes(req.entityClass)) throw new RequestError('invalid_entity_class', 'Invalid insurance entity class.');
  if (req.identifier && !['NPN', 'NAIC'].includes(req.identifier.type)) throw new RequestError('invalid_identifier_type', 'Identifier type must be NPN or NAIC.');
  if (req.identifier?.type === 'NPN' && !/^\d{5,10}$/.test(req.identifier.value)) throw new RequestError('malformed_npn', 'NPN must contain 5–10 digits.');
  if (req.identifier?.type === 'NAIC' && !/^\d{3,5}$/.test(req.identifier.value)) throw new RequestError('malformed_naic', 'NAIC Company Code must contain 3–5 digits.');
  if (req.page != null && (!Number.isInteger(req.page) || req.page < 1)) throw new RequestError('invalid_page', 'Page must be a positive integer.');
  if (req.limit != null && (!Number.isInteger(req.limit) || req.limit < 1 || req.limit > SPECIALIST_EXECUTION_MAX_LIMIT)) throw new RequestError('invalid_limit', `Limit must be between 1 and ${SPECIALIST_EXECUTION_MAX_LIMIT}.`);
  if (req.geography?.stateCode && !/^[A-Z]{2}$/.test(req.geography.stateCode.toUpperCase())) throw new RequestError('invalid_state', 'State code must use two letters.');
}

function entityClassFromV1(value: string | null | undefined): V2EntityClass {
  if (value === 'person') return 'producer';
  if (value === 'insurer') return 'legal_insurer';
  return 'agency';
}

function safeRows(result: InsuranceAskResult): SafeRow[] {
  return result.results.flatMap((row) => {
    const cls = entityClassFromV1(row.entityClass);
    const bail = cls === 'agency' && classifyBailBondDirectoryPublication({
      businessNames: [row.displayName], licenseEvidence: [row.licenseClass, ...row.loas],
    }).excludeFromConsumerDirectory;
    if (bail) return [];
    return [{
      entityClass: cls, name: row.displayName, npn: row.npn, naicCode: row.naicCode,
      credentialJurisdiction: row.credentialJurisdiction, credentialStatus: row.credentialStatus,
      licenseNumber: row.licenseNumber, licenseClass: row.licenseClass, linesOfAuthority: row.loas,
      sourceDataset: row.sourceDataset, sourceObservedAt: row.sourceObservedAt,
      publicationState: row.href ? 'PUBLIC_PROFILE' as const : 'RESEARCH_ROW_ONLY' as const,
      destination: row.href, whyMatched: row.whyMatched,
    }];
  });
}

function stateFor(req: SpecialistRequest): string | undefined {
  if (req.geography?.stateCode) return req.geography.stateCode.toUpperCase();
  const wanted = req.geography?.stateName?.toLowerCase();
  return Object.entries(STATE_NAMES).find(([, name]) => name.toLowerCase() === wanted)?.[0];
}

function toCanonicalQuery(req: SpecialistRequest): string {
  if (req.query?.trim()) return req.query.trim();
  if (req.identifier) return req.identifier.type === 'NPN' ? `NPN ${req.identifier.value}` : `NAIC ${req.identifier.value}`;
  if (req.identityName) return `Find ${req.identityName}`;
  const state = stateFor(req);
  const cls = req.entityClass === 'producer' ? 'insurance agents' : req.entityClass === 'legal_insurer' ? 'insurance companies' : 'insurance agencies';
  const loa = req.filters?.lineOfAuthority?.join(' and ');
  return [loa, cls, state ? `in ${STATE_NAMES[state] ?? state}` : ''].filter(Boolean).join(' ');
}

function classifyNaturalQuery(query: string): SpecialistEnvelope | null {
  if (/\bnpn\b/i.test(query) && !/\bnpn\s*#?\s*\d{5,10}\b/i.test(query)) {
    const out = base('INVALID_QUERY');
    out.error = { code: 'malformed_npn', message: 'A labeled NPN must contain 5–10 digits.' };
    return out;
  }
  if (/\bnaic(?:\s+company)?(?:\s+code)?\b/i.test(query) && !/\bnaic(?:\s+company)?(?:\s+code)?\s*#?\s*\d{3,5}\b/i.test(query)) {
    const out = base('INVALID_QUERY');
    out.error = { code: 'malformed_naic', message: 'A labeled NAIC Company Code must contain 3–5 digits.' };
    return out;
  }
  if (/\b(serv(?:e|es|ing)|available|cover my|near me)\b/i.test(query)) {
    return unsupported('service_territory_not_supported', 'Credential, domicile, and office evidence do not prove service territory or product availability.', ['Research an exact NPN or NAIC Company Code.', 'Research agencies by credential jurisdiction.']);
  }
  if (/\b(best|safest|recommended|top[- ]?rated|cheapest|trust score)\b/i.test(query)) {
    return unsupported('ranking_not_supported', 'InsuranceTrustHub does not recommend or rank insurance entities.', ['Research credential evidence.', 'Enter an exact NPN or NAIC Company Code.']);
  }
  if (/\binsurance (provider|business|professional)\b/i.test(query)) {
    return unsupported('entity_class_clarification_required', 'Choose insurance agency, legal insurer/insurance company, or individual producer. These classes are not interchangeable.', ['Insurance agencies credentialed in Florida.', 'NAIC 10064.', 'NPN 10391484.']);
  }
  if (/\b(agents?|producers?|individual insurance adviser)\b/i.test(query) && !/\bnpn\b/i.test(query)) {
    return unsupported('producer_publication_restricted', 'Public producer profiles and mass-person cohorts are not published.', ['Enter a labeled NPN for public-safe verification.', 'Research an insurance agency instead.'], { entityClass: 'producer' });
  }
  if (/\b(insurance compan(?:y|ies)|legal insurers?|insurers?)\b/i.test(query) && /\b(in|domiciled|texas|florida|california|new york)\b/i.test(query) && !/\bnaic\b/i.test(query)) {
    return unsupported('legal_insurer_state_cohort_unavailable', 'The current public legal-insurer evidence does not provide a complete, publication-safe state domicile or market-availability cohort.', ['Browse the accepted Wave-1 legal-insurer cohort.', 'Enter a five-digit NAIC Company Code.', 'Clarify whether you mean a state-credentialed insurance agency.'], { entityClass: 'legal_insurer', geographyMeaning: 'State understood; domicile and market availability unavailable.' });
  }
  return null;
}

function wave1(req: SpecialistRequest): SpecialistEnvelope {
  const all = listPublishedInsurers();
  const page = req.page ?? 1;
  const limit = Math.min(req.limit ?? INSURANCE_ASK_PAGE_SIZE, SPECIALIST_EXECUTION_MAX_LIMIT);
  const start = (page - 1) * limit;
  const chosen = all.slice(start, start + limit);
  const out = base(chosen.length ? 'SUPPORTED_RESULTS' : 'ZERO_MATCHING_ROWS', page, limit);
  out.queryInterpretation = { queryType: 'cohort', entityClass: 'legal_insurer', publicationClass: 'WAVE_1' };
  out.appliedFilters = { publicationClass: ['WAVE_1_PUBLIC_PROFILE'] };
  out.rows = chosen.map((row) => ({
    entityClass: 'legal_insurer', name: row.canonical_legal_name, npn: null, naicCode: row.naic_cocode,
    credentialJurisdiction: null, credentialStatus: row.public_safe_status, linesOfAuthority: [],
    sourceDataset: 'ins-insurer-006-wave1', sourceObservedAt: row.report_dates[0] ?? null,
    publicationState: 'PUBLIC_PROFILE', destination: insurerProfilePath(row.slug),
    whyMatched: 'This legal insurer is in the accepted Wave-1 public cohort because exact NAIC identity and public examination-evidence gates passed.',
  }));
  out.total = all.length;
  out.pagination = { page, limit, total: all.length, hasMore: start + chosen.length < all.length };
  out.destinations = [{ type: 'LEGAL_INSURER_RESEARCH', url: '/insurers' }];
  out.provenance = { ...out.provenance, sourceDataset: 'ins-insurer-006-wave1', queryGrain: '26 accepted public legal-insurer profiles', geographyMeaning: 'Not a state or service-territory cohort' };
  out.availableRefinements = [{ key: 'identifier', values: ['NAIC'] }];
  return out;
}

export async function executeSpecialistV2(req: SpecialistRequest): Promise<{ status: number; body: SpecialistEnvelope }> {
  try { validate(req); } catch (error) {
    const e = error as RequestError;
    const out = base('INVALID_QUERY'); out.error = { code: e.code ?? 'invalid_query', message: e.message };
    return { status: 400, body: out };
  }
  const page = req.page ?? 1;
  const limit = Math.min(req.limit ?? INSURANCE_ASK_PAGE_SIZE, SPECIALIST_EXECUTION_MAX_LIMIT);
  if (req.geography?.intent === 'SERVICE_TERRITORY') return { status: 422, body: unsupported('service_territory_not_supported', 'Service territory and product availability are not supported by credential geography.', ['Use credential-jurisdiction research.']) };
  if (req.entityClass === 'producer' && !req.identifier) return { status: 422, body: unsupported('producer_publication_restricted', 'Public producer profiles and mass-person cohorts are not published.', ['Enter a labeled NPN.']) };
  if (req.entityClass === 'legal_insurer' && req.queryType === 'cohort') {
    if (req.geography) return { status: 422, body: unsupported('legal_insurer_state_cohort_unavailable', 'Complete legal-insurer domicile and market-availability cohorts are unavailable.', ['Browse Wave 1.', 'Enter a NAIC Company Code.']) };
    return { status: 200, body: wave1(req) };
  }
  const query = toCanonicalQuery(req);
  if (!query) { const out = base('INVALID_QUERY'); out.error = { code: 'missing_query', message: 'Provide a query or structured research request.' }; return { status: 400, body: out }; }
  const preflight = classifyNaturalQuery(query);
  if (preflight) return { status: preflight.resultState === 'INVALID_QUERY' ? 400 : 422, body: preflight };
  if (/\b(?:legal[- ]insurer|insurer)\s+wave\s*1\b/i.test(query)) return { status: 200, body: wave1(req) };
  try {
    const v1 = await executeInsuranceAsk(query, page, limit);
    const publicV1 = publicAskPayload(v1);
    const rows = safeRows(v1).slice(0, limit);
    let state: ResultState = rows.length ? 'SUPPORTED_RESULTS' : 'ZERO_MATCHING_ROWS';
    if (v1.parsed.query.mode === 'identifier') state = rows.length === 1 ? 'EXACT_IDENTITY' : rows.length > 1 ? 'AMBIGUOUS_IDENTITIES' : 'NO_CONFIDENT_MATCH';
    if (v1.parsed.query.mode === 'fail_closed') state = 'UNSUPPORTED_CAPABILITY';
    const out = base(state, page, limit);
    out.queryInterpretation = { sourceContract: v1.contract, mode: v1.parsed.query.mode, entityClass: entityClassFromV1(v1.entityClass), identifier: v1.parsed.query.identifier, geography: v1.parsed.query.jurisdiction, interpretation: v1.parsed.interpretation };
    out.appliedFilters = { jurisdiction: v1.parsed.query.jurisdiction, linesOfAuthority: v1.parsed.query.linesOfAuthority, publication: 'public-safe response allowlist' };
    out.rows = rows; out.total = v1.pagination.total; out.pagination = { page, limit, total: v1.pagination.total, hasMore: page * limit < v1.pagination.total };
    out.provenance = { ...v1.provenance, sourceDataset: rows[0]?.sourceDataset ?? 'accepted InsuranceTrustHub source datasets', publicationSemantics: 'Research rows do not create public profiles.' };
    out.limitations = [...v1.limitations, ...BASE_LIMITATIONS.filter((x) => !v1.limitations.includes(x))];
    out.destinations = Array.from(new Set(rows.map((r) => r.destination).filter((x): x is string => Boolean(x)))).map((url) => ({ type: url.startsWith('/insurers/') ? 'LEGAL_INSURER_PROFILE' : 'DIRECTORY_RESEARCH', url }));
    out.availableRefinements = entityClassFromV1(v1.entityClass) === 'agency' ? [{ key: 'credentialJurisdiction', values: ['FL', 'TX', 'MA', 'OH', 'VT'], limitation: 'Credential jurisdiction is not service territory.' }, { key: 'lineOfAuthority', values: v1.parsed.query.jurisdiction?.state === 'FL' ? [] : ['source-native labels only'], limitation: 'LOA is not appointment.' }] : [{ key: 'identifier', values: ['NPN', 'NAIC'] }];
    out.diagnostics = { sourceContract: v1.contract, sourceResultType: v1.resultType, elapsedMs: v1.elapsedMs, publicPayloadContract: publicV1.contract, bailRowsSuppressedOnPage: v1.results.length - rows.length };
    if (state === 'UNSUPPORTED_CAPABILITY') out.error = { code: 'unsupported_capability', message: v1.parsed.query.failReason ?? 'This query is not supported.', alternatives: v1.parsed.query.alternatives };
    return { status: state === 'UNSUPPORTED_CAPABILITY' ? 422 : 200, body: out };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Research backend unavailable.';
    const timeout = /timeout|timed out/i.test(message);
    const out = base(timeout ? 'TIMEOUT' : 'BACKEND_UNAVAILABLE', page, limit);
    out.error = { code: timeout ? 'execution_timeout' : 'backend_unavailable', message: timeout ? 'The research request timed out.' : 'The research backend is temporarily unavailable.' };
    return { status: timeout ? 504 : 503, body: out };
  }
}

export const INS_CAP_LOCKS = {
  publicPeople: LOCKED_CENSUS.publicPeople,
  publicGraphAgencies: LOCKED_CENSUS.publicGraphAgencies,
  publicLegalInsurerWave1: LOCKED_CENSUS.publicLegalInsurerWave1,
  noDatabaseWrites: true,
} as const;
