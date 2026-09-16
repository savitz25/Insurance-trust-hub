import { US_STATES } from '@/lib/constants';
import { INSURANCE_ASK_INPUT_LIMIT, type InsuranceRequestOptions } from '@/lib/insurance-ask/contract';
import { executeInsuranceAsk, publicAskPayload, type InsuranceAskResult } from '@/lib/insurance-ask/execute';
import { INSURANCE_ASK_PAGE_SIZE, LOCKED_CENSUS } from '@/lib/insurance-ask/contract';
import { classifyBailBondDirectoryPublication } from '@/lib/directory/bail-bond-publication';
import { listPublishedInsurers, insurerProfilePath } from '@/lib/national/legal-insurer-pilot';
import { matchLaunchCounty } from '@/lib/dfs/launch-counties';
import { resolveZip } from '@/lib/tools/zip-resolve';
import type { Provider } from '@/types/provider';
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

const STATE_NAMES: Record<string,string> = Object.fromEntries(US_STATES.map(s=>[s.code,s.name]));

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
  matchEvidence?: InsuranceAskResult['results'][number]['matchEvidence'];
  selectionUrl?: string;
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
  if (!req || typeof req !== 'object' || Array.isArray(req)) throw new RequestError('invalid_query', 'Request must be a structured object.');
  if (req.query != null && typeof req.query !== 'string') throw new RequestError('invalid_query', 'Query must be text.');
  if (req.identityName != null && typeof req.identityName !== 'string') throw new RequestError('invalid_name', 'Identity name must be text.');
  if (req.query && req.query.length > INSURANCE_ASK_INPUT_LIMIT) throw new RequestError('input_too_long', 'Use at most 180 characters; the full request was rejected.');
  if (req.contract && req.contract !== SPECIALIST_EXECUTION_CONTRACT) throw new RequestError('contract_mismatch', 'Unsupported specialist contract.');
  if (req.entityClass && !['agency', 'producer', 'legal_insurer'].includes(req.entityClass)) throw new RequestError('invalid_entity_class', 'Invalid insurance entity class.');
  if (req.identifier && !['NPN', 'NAIC'].includes(req.identifier.type)) throw new RequestError('invalid_identifier_type', 'Identifier type must be NPN or NAIC.');
  if (req.identifier?.type === 'NPN' && !/^\d{4,12}$/.test(req.identifier.value)) throw new RequestError('malformed_npn', 'NPN must contain 5–10 digits.');
  if (req.identifier?.type === 'NAIC' && !/^\d{3,6}$/.test(req.identifier.value)) throw new RequestError('malformed_naic', 'NAIC Company Code must contain 3–5 digits.');
  if (req.page != null && (!Number.isInteger(req.page) || req.page < 1 || req.page > 200)) throw new RequestError('invalid_page', 'Page must be a positive integer.');
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
      matchEvidence: row.matchEvidence, selectionUrl: row.selectionHref,
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
  const meaning = req.geography?.intent === 'OFFICE_LOCATION' ? 'located in' : req.geography?.intent === 'DOMICILE' ? 'domiciled in' : 'credentialed in';
  return [cls, state ? `${meaning} ${STATE_NAMES[state] ?? state}` : ''].filter(Boolean).join(' ');
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
    credentialJurisdiction: null, credentialStatus: null, linesOfAuthority: [],
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

/**
 * TH-DISCOVERY-002B: recorded public-directory address lookup (agency grain only). This is a
 * distinct capability from the CREDENTIAL_JURISDICTION legal/regulatory graph below -- it wires
 * the same real, live `getProviders`/`searchProviders` query that already backs
 * InsuranceTrustHub's own /directory page (proven live for ZIP; county grain shares the identical
 * query path and verified-only gate) into the network contract, rather than building a second
 * city/ZIP matcher. Only ZIP and FL-launch-county grain are recognized -- city name resolution is
 * Ask's job (florida-municipality-crosswalk.ts already does it) and is deliberately not
 * duplicated here. A recorded directory address is never a service-territory claim.
 */
async function localDirectory(req: SpecialistRequest, page: number, limit: number): Promise<SpecialistEnvelope> {
  // TH-DISCOVERY-002B: reuse the exact same ZIP-validity guard the real /directory page already
  // relies on (resolveZip, backed by the curated ZIP_COUNTY crosswalk plus a real US ZIP-prefix
  // range check) before ever querying the directory. Without this, a ZIP that merely looks
  // syntactically valid (5 digits) but isn't a real US ZIP -- e.g. the reserved/placeholder value
  // "00000" -- could match a genuine data-quality artifact in the source (some records carry that
  // literal sentinel) and be misreported as real recorded-address evidence. /directory itself
  // never queries getProviders for a ZIP that fails this same check.
  const zip = req.geography?.zip && resolveZip(req.geography.zip) ? req.geography.zip : undefined;
  const county = !zip ? matchLaunchCounty(req.geography?.county) : undefined;
  if (!zip && !county) {
    const out = unsupported('local_directory_geography_not_recognized', 'This ZIP or county is not in the accepted public-directory geography set.', ['Research the state cohort instead.'], { geography: req.geography });
    out.resultState = 'UNSUPPORTED_CAPABILITY';
    return out;
  }
  const offset = (page - 1) * limit;
  let providers: Provider[];
  let total: number;
  try {
    // Dynamic import: lib/providers/queries.ts transitively imports the 'server-only'-guarded
    // Supabase client wrapper, which throws immediately on a top-level static import outside
    // Next's own server runtime -- including in plain-tsx CI scripts (e.g. check-th-search-r1-013)
    // that import executeSpecialistV2 but never reach this OFFICE_LOCATION branch. A dynamic
    // import defers module evaluation until this branch actually executes.
    const { getProviders } = await import('@/lib/providers/queries');
    const filters = zip ? { zip, limit, offset } : { launchCountyId: county!.id, limit, offset };
    const result = await getProviders(filters);
    providers = result.providers;
    total = result.total;
  } catch {
    const out = base('BACKEND_UNAVAILABLE', page, limit);
    out.error = { code: 'directory_source_unavailable', message: 'The public-directory research backend is temporarily unavailable.' };
    return out;
  }
  const place = zip ? `ZIP ${zip}` : `${county!.displayName} County, Florida`;
  const out = base(providers.length ? 'SUPPORTED_RESULTS' : 'ZERO_MATCHING_ROWS', page, limit);
  out.queryInterpretation = { queryType: 'cohort', entityClass: 'agency', geographyGrain: zip ? 'RECORDED_ZIP' : 'RECORDED_COUNTY', geography: { zip, county: county?.displayName } };
  out.appliedFilters = zip ? { zip } : { launchCountyId: county!.id };
  out.rows = providers.map((p) => ({
    entityClass: 'agency' as const,
    name: p.name,
    npn: null,
    naicCode: null,
    credentialJurisdiction: p.license_state ?? p.state ?? null,
    credentialStatus: null,
    licenseNumber: p.license_number ?? null,
    licenseClass: null,
    linesOfAuthority: Array.isArray(p.insurance_types) ? p.insurance_types.map(String) : [],
    sourceDataset: 'ins-directory-providers',
    sourceObservedAt: p.license_checked_at ?? null,
    publicationState: 'PUBLIC_PROFILE' as const,
    destination: `/providers/${p.slug}`,
    whyMatched: `Recorded public-directory address in ${place}. A recorded address is not a confirmed service area -- a directory record does not mean this agency serves every customer in the surrounding area.`,
  }));
  out.total = total;
  out.pagination = { page, limit, total, hasMore: page * limit < total };
  out.provenance = {
    sourceFamily: 'InsuranceTrustHub verified public agency directory',
    sourceDataset: 'ins-directory-providers',
    officialAsOf: 'See row source clocks',
    retrievalDate: 'Live query at request time',
    publicationSemantics: 'Recorded public-directory address only. Not a service-territory, appointment, licensing, or ranking claim.',
    geographyMeaning: 'OFFICE_LOCATION',
  };
  out.limitations = [
    'Recorded public-directory address is not a confirmed service area, appointment territory, or product availability.',
    'This directory is a separate source from the regulatory credential graph and does not confirm licensing, appointments, or lines of authority.',
    ...BASE_LIMITATIONS,
  ];
  out.destinations = out.rows.map((r) => ({ type: 'DIRECTORY_PROFILE', url: r.destination! }));
  out.availableRefinements = total > out.rows.length ? [{ key: 'page', values: [], limitation: `First page shown; ${total} total verified directory record(s) match this geography.` }] : [];
  out.diagnostics = { sourceContract: 'ins-directory-providers', geographyGrain: zip ? 'zip' : 'county' };
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
  if ((!req.entityClass || req.entityClass === 'agency') && req.geography?.intent === 'OFFICE_LOCATION' && (req.geography.zip || req.geography.county)) {
    const body = await localDirectory(req, page, limit);
    return { status: body.resultState === 'UNSUPPORTED_CAPABILITY' ? 422 : body.resultState === 'BACKEND_UNAVAILABLE' ? 503 : 200, body };
  }
  if (req.geography?.intent === 'SERVICE_TERRITORY') return { status: 422, body: unsupported('service_territory_not_supported', 'Service territory and product availability are not supported by credential geography.', ['Use credential-jurisdiction research.']) };
  if (req.entityClass === 'producer' && !req.identifier) return { status: 422, body: unsupported('producer_publication_restricted', 'Public producer profiles and mass-person cohorts are not published.', ['Enter a labeled NPN.']) };
  if (req.entityClass === 'legal_insurer' && req.queryType === 'cohort') {
    // TH-DISCOVERY-RESET-001B: a resolved state (credential jurisdiction) is not a genuine domicile
    // question -- listInsurers (lib/insurance-ask/execute.ts, reached via the fallthrough below)
    // already broadens that case to real, explicitly-labeled insurance agencies instead of a bare
    // stonewall. Only a true domicile cohort request has nothing an agency result can answer, so
    // that alone still returns the unsupported response immediately.
    if (req.geography && req.geography.intent === 'DOMICILE') return { status: 422, body: unsupported('legal_insurer_state_cohort_unavailable', 'Complete legal-insurer domicile and market-availability cohorts are unavailable.', ['Browse Wave 1.', 'Enter a NAIC Company Code.']) };
    if (!req.geography) return { status: 200, body: wave1(req) };
  }
  const query = toCanonicalQuery(req);
  if (!query) { const out = base('INVALID_QUERY'); out.error = { code: 'missing_query', message: 'Provide a query or structured research request.' }; return { status: 400, body: out }; }
  if ((req.filters?.lineOfAuthority?.length ?? 0) > 1) return {status:422,body:unsupported('multiple_loa_refinement','Multiple LOA filters require an explicit supported operation; none were discarded.',[],{requestedFilters:req.filters})};
  if(req.query && req.identifier && !query.includes(req.identifier.value))return {status:422,body:unsupported('conflicting_identity_inputs','The query and supplied identifier must agree. No identifier was substituted.',[])};
  if(req.query && req.geography && req.geography.intent !== 'CREDENTIAL_JURISDICTION')return {status:422,body:unsupported('geography_refinement','Structured office/domicile conditions cannot be replaced by credential jurisdiction.',[],{geography:req.geography,query})};
  if (/\b(?:legal[- ]insurer|insurer)\s+wave\s*1\b/i.test(query)) return { status: 200, body: wave1(req) };
  try {
    const options: InsuranceRequestOptions = { entity: req.entityClass === 'producer' ? 'person' : req.entityClass === 'legal_insurer' ? 'insurer' : req.entityClass, state: req.query && req.geography?.intent === 'CREDENTIAL_JURISDICTION' ? stateFor(req) : undefined, loa: req.filters?.lineOfAuthority?.[0]?.toLowerCase() };
    const v1 = await executeInsuranceAsk(query, page, limit, options);
    const publicV1 = publicAskPayload(v1);
    const rows = safeRows(v1).slice(0, limit);
    let state: ResultState = rows.length ? 'SUPPORTED_RESULTS' : 'ZERO_MATCHING_ROWS';
    if (v1.parsed.query.mode === 'identifier') state = rows.length === 1 ? 'EXACT_IDENTITY' : rows.length > 1 ? 'AMBIGUOUS_IDENTITIES' : 'NO_CONFIDENT_MATCH';
    if (v1.parsed.query.mode === 'fail_closed' || v1.parsed.query.mode === 'directory') state = 'UNSUPPORTED_CAPABILITY';
    if(v1.parsed.query.mode==='fail_closed' && v1.parsed.query.entityClass==='person' && !v1.parsed.query.identifier)state='PUBLICATION_RESTRICTED';
    if(v1.candidateSelection)state='AMBIGUOUS_IDENTITIES';
    if(v1.terminalState==='INVALID_INPUT')state='INVALID_QUERY';
    const out = base(state, page, limit);
    out.queryInterpretation = { sourceContract: v1.contract, mode: v1.parsed.query.mode, entityClass: v1.entityClass ? entityClassFromV1(v1.entityClass) : null, terminalState:v1.terminalState, directoryContext:v1.parsed.query.directoryContext, conditions:v1.parsed.query.conditions, identifier: v1.parsed.query.identifier, geography: v1.parsed.query.jurisdiction, interpretation: v1.parsed.interpretation };
    out.appliedFilters = { jurisdiction: v1.parsed.query.jurisdiction, linesOfAuthority: v1.parsed.query.linesOfAuthority, publication: 'public-safe response allowlist' };
    out.rows = rows; out.total = v1.pagination.total; out.pagination = { page, limit, total: v1.pagination.total, hasMore: page * limit < v1.pagination.total };
    out.provenance = { ...v1.provenance, sourceDataset: rows[0]?.sourceDataset ?? 'accepted InsuranceTrustHub source datasets', publicationSemantics: 'Research rows do not create public profiles.' };
    out.limitations = [...v1.limitations, ...BASE_LIMITATIONS.filter((x) => !v1.limitations.includes(x))];
    out.destinations = Array.from(new Set(rows.map((r) => r.destination).filter((x): x is string => Boolean(x)))).map((url) => ({ type: url.startsWith('/insurers/') ? 'LEGAL_INSURER_PROFILE' : 'DIRECTORY_RESEARCH', url }));
    out.destinations.push(...(v1.recoveryActions??[]).map(a=>({type:a.type,url:a.destination})));
    out.destinations.push(...rows.filter(r=>r.selectionUrl).map(r=>({type:'IDENTITY_SELECTION',url:r.selectionUrl!})));
    if(v1.parsed.query.directoryZip)out.destinations.push({type:'DIRECTORY_RESEARCH',url:'/directory?'+new URLSearchParams({zip:v1.parsed.query.directoryZip,insuranceContext:v1.parsed.query.directoryContext?.requestedInsuranceContext.join(',')??'',requestedPlace:v1.parsed.query.directoryContext?.requestedLocation??''})});
    out.availableRefinements = entityClassFromV1(v1.entityClass) === 'agency' ? [{ key: 'credentialJurisdiction', values: ['FL', 'TX', 'MA', 'OH', 'VT'], limitation: 'Credential jurisdiction is not service territory.' }, { key: 'lineOfAuthority', values: v1.parsed.query.jurisdiction?.state === 'FL' ? [] : ['source-native labels only'], limitation: 'LOA is not appointment.' }] : [{ key: 'identifier', values: ['NPN', 'NAIC'] }];
    out.diagnostics = { sourceContract: v1.contract, sourceResultType: v1.resultType, elapsedMs: v1.elapsedMs, publicPayloadContract: publicV1.contract, bailRowsSuppressedOnPage: v1.results.length - rows.length };
    if (state === 'UNSUPPORTED_CAPABILITY' || state === 'PUBLICATION_RESTRICTED' || state === 'INVALID_QUERY') out.error = { code: state==='INVALID_QUERY'?'invalid_query':state==='PUBLICATION_RESTRICTED'?'producer_publication_restricted':/does not rank/.test(v1.parsed.query.failReason??'')?'ranking_not_supported':/service territory/.test(v1.parsed.query.failReason??'')?'service_territory_not_supported':v1.parsed.query.entityClass==='insurer'?'legal_insurer_state_cohort_unavailable':v1.parsed.query.refinement==='class'?'entity_class_clarification_required':'unsupported_capability', message: v1.parsed.query.failReason ?? 'This query is not supported.', alternatives: v1.parsed.query.alternatives };
    return { status: state === 'INVALID_QUERY' ? 400 : state === 'UNSUPPORTED_CAPABILITY' || state === 'PUBLICATION_RESTRICTED' ? 422 : 200, body: out };
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
