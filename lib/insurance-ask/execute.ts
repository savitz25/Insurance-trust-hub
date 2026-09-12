import { searchLegalInsurers } from '@/lib/national/legal-insurer-search';
import { AsyncLocalStorage } from 'node:async_hooks';
import { planInsuranceRequest, readInsuranceRequest } from './request';
import { invalidResearch } from './research-intent';
import { recoveryFor } from './recovery';
import { matchSourceName, distinctiveNameTokens, escapeNamePattern } from './name-match';
import type { InsuranceRequestOptions, RecoveryAction } from './contract';
import { createClient } from '@supabase/supabase-js';
import {
  ASK_DEFINITIONS,
  INSURANCE_ASK_CONTRACT,
  INSURANCE_ASK_PAGE_SIZE,
  LOCKED_CENSUS,
} from './contract';
import { askCacheKey, cacheGetCount, cacheSetCount } from './cache';
import type { ParsedInsuranceAsk } from './contract';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/config';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '@/lib/national/publication';
import { getPublishedByNaic, insurerProfilePath, searchPublishedInsurers, type PublishedInsurer } from '@/lib/national/legal-insurer-pilot';
import { AGENCY_MULTISTATE } from '@/lib/national/home-intel';
import { loaSourceDatasetsForJurisdiction } from '@/lib/national/loa';

export type AskCard = {
  entityId: string;
  entityClass: 'person' | 'agency' | 'insurer';
  displayName: string;
  npn: string | null;
  naicCode: string | null;
  credentialJurisdiction: string | null;
  credentialStatus: string | null;
  licenseNumber: string | null;
  licenseClass: string | null;
  loas: string[];
  sourceDataset: string | null;
  sourceObservedAt: string | null;
  href: string | null;
  publicationNote: string | null;
  whyMatched: string;
  evidenceFamily?: string;
  planYear?: string | null;
  matchEvidence?: { method: string; field: string; value: string; requested: string; entityId: string; entityClass: string; source: string; normalization: string[] };
  selectionHref?: string;
};

export type AskCountRow = { label: string; value: number; grain: string };

export type InsuranceAskResult = {
  terminalState?: string;
  candidateSelection?: boolean;
  candidateTruncated?: boolean;
  recoveryActions?: RecoveryAction[];
  contract: typeof INSURANCE_ASK_CONTRACT;
  queryText: string;
  parsed: ParsedInsuranceAsk;
  resultType: string;
  entityClass: string | null;
  results: AskCard[];
  counts: AskCountRow[];
  pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
  provenance: {
    sourceFamily: string;
    geographyMeaning: string;
    officialAsOf: string;
    grain: string;
    exclusions: string[];
  };
  limitations: string[];
  elapsedMs: number;
  coverageState: 'KNOWN' | 'UNKNOWN' | 'PARTIAL' | 'NOT_ACQUIRED' | 'REQUEST_ONLY' | 'UNSUPPORTED';
};

const LIMITATIONS = [
  'Person, agency, and legal insurer stay separate classes.',
  'Credential jurisdiction is not office location or service territory.',
  'Line of authority is not carrier appointment.',
  'Marketplace evidence is not a state license and not certification.',
  'Missing evidence is not a clean record.',
  'Public people pages = 0. Public graph-agency profiles = 0.',
];

export type AdminDb = {
  from: (table: string) => {
    select: (columns: string, opts?: { count?: 'exact'; head?: boolean }) => Chain;
  };
};

type Chain = {
  select: (columns: string, opts?: { count?: 'exact'; head?: boolean }) => Chain;
  eq: (col: string, val: string) => Chain;
  ilike: (col: string, val: string) => Chain;
  in: (col: string, val: string[]) => Chain;
  not: (col: string, op: string, val: unknown) => Chain;
  order: (col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => Chain;
  range: (from: number, to: number) => Chain;
  limit: (n: number) => PromiseLike<QueryResult> & Chain;
  then: Promise<QueryResult>['then'];
};

type QueryResult = { data: unknown[] | null; count: number | null; error: { message: string } | null };

const sourceContext = new AsyncLocalStorage<{db:AdminDb; insurers?:PublishedInsurer[]}>();
/** Fixture-only dependency scope; never accepted from a public request. */
export function withInsuranceSource<T>(source: AdminDb, task: () => Promise<T>, insurers?:PublishedInsurer[]): Promise<T> { return sourceContext.run({db:source,insurers}, task); }
function checkedSource(source: AdminDb): AdminDb {
  function guard(chain: Chain): Chain { return new Proxy(chain, { get(target, key) {
    if (key === "then") return (yes: (r: QueryResult) => unknown, no: (e: unknown) => unknown) => Promise.resolve(target).then(r => { if (r.error || r.data === null && r.count === null) throw new Error("Insurance research source unavailable"); return r; }).then(yes, no);
    const value = Reflect.get(target, key);
    return typeof value === "function" ? (...args: unknown[]) => guard(value.apply(target, args)) : value;
  } }); }
  return { from: table => ({ select: (columns, opts) => guard(source.from(table).select(columns, opts)) }) };
}
function db(): AdminDb {
  const fixture = sourceContext.getStore();
  if (fixture) return checkedSource(fixture.db);
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error('Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY (server-only).');
  }
  return checkedSource(createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([AbortSignal.timeout(15000), ...(init?.signal ? [init.signal] : [])]) }) },
  }) as unknown as AdminDb);
}

type EntityRow = {
  id: string;
  entity_kind: string;
  npn: string | null;
  display_name: string;
  legal_name: string;
  identity_kind?: string;
  identity_confidence?: string;
  license_credentials?: CredEmbed[] | CredEmbed | null;
  loa_observations?: Array<{ official_text: string; source_dataset?: string; source_observed_at?: string | null }> | null;
};

type CredEmbed = {
  id: string;
  jurisdiction: string;
  regulatory_status: string;
  license_number: string;
  license_class: string | null;
  source_dataset: string;
  source_observed_at: string | null;
  entity_kind?: string;
  loa_observations?: Array<{ official_text: string; source_dataset?: string; source_observed_at?: string | null }>;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function whyAgency(row: EntityRow, cred: CredEmbed | undefined, loas: string[]): string {
  const bits = [
    'it is classified as an agency',
    row.npn ? `its organization NPN is ${row.npn}` : 'it is a canonical agency identity in the graph',
    cred
      ? `it is linked to a ${cred.jurisdiction} credential (credential jurisdiction, not service territory)`
      : 'it is linked to indexed credential evidence',
  ];
  if (loas.length) {
    bits.push(
      cred?.jurisdiction === 'FL'
        ? `the indexed Florida DFS credential-class text includes ${loas.join(' and ')} (not an official national LOA codebook, and not an appointment)`
        : `indexed official LOA text includes ${loas.join(' and ')} (not an appointment)`,
    );
  }
  return `This agency matches because ${bits.join(', ')}.`;
}

export async function executeInsuranceAsk(raw: string, page = 1, pageSize = INSURANCE_ASK_PAGE_SIZE, options: InsuranceRequestOptions = {}): Promise<InsuranceAskResult> {
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50)return {...emptyBase(invalidResearch(raw,'Page size must be an integer from 1 to 50.'),Date.now()),terminalState:'INVALID_INPUT'};
  const result = await executeInsurancePlan(planInsuranceRequest(raw, page, options), pageSize);
  const q = result.parsed.query;
  result.recoveryActions = recoveryFor(q);
  if(q.identifier && new Set(result.results.map(r=>r.entityId)).size>1 && !q.selectedEntity){result.candidateSelection=true;result.terminalState='NEEDS_CLARIFICATION';for(const row of result.results)row.selectionHref='/ask?'+new URLSearchParams({q:raw,...q.requestOptions,selected:row.entityId});}
  result.terminalState ??= q.terminalState ?? (q.mode === 'fail_closed' ? q.refinement ? 'NEEDS_CLARIFICATION' : 'CAPABILITY_LIMITATION' : q.mode === 'directory' ? 'DIRECTORY_HANDOFF' : q.mode === 'definition' ? 'EXPLANATION' : result.results.length || result.counts.length ? 'RESULTS' : 'NO_MATCH');
  if (q.mode === 'directory') { result.provenance.sourceFamily = 'Separate public directory'; result.provenance.grain = 'Directory handoff; no regulatory identities retrieved'; result.provenance.geographyMeaning = `Selected ZIP ${q.directoryZip}; recorded directory address, not service territory`; }
  return result;
}
async function executeInsurancePlan(parsed: ParsedInsuranceAsk, pageSize: number): Promise<InsuranceAskResult> {
  const started = Date.now();
  parsed.query.pageSize = Math.max(1, Math.min(50, Math.floor(pageSize)));
  const q = parsed.query;
  const empty = emptyBase(parsed, started);

  if (q.mode === 'fail_closed' || q.mode === 'definition') {
    empty.elapsedMs = Date.now() - started;
    return empty;
  }

  if (q.mode === 'directory') {
    empty.elapsedMs = Date.now() - started;
    return empty;
  }

  if (!sourceContext.getStore() && !isSupabaseAdminConfigured()) {
    throw new Error("Insurance research source unavailable");
  }

  if (q.nameQuery) return lookupNameCandidates(parsed, started);

  if (q.mode === 'identifier' && q.identifier?.type === 'npn') {
    return lookupNpn(parsed, started);
  }

  if (q.mode === 'evidence' && q.identifier?.type === 'npn' && q.evidenceFamily === 'marketplace') {
    return lookupMarketplace(parsed, started);
  }

  if (q.mode === 'evidence' && q.identifier?.type === 'npn' && q.evidenceFamily === 'appointment') {
    return lookupAppointment(parsed, started);
  }

  if (q.mode === 'identifier' && q.identifier?.type === 'naic_company_code') {
    return lookupNaic(parsed, started);
  }

  if (q.entityClass === 'insurer' && q.mode === 'entity') {
    return listInsurers(parsed, started);
  }

  if (q.mode === 'count' || q.mode === 'aggregate' || q.mode === 'comparison') {
    return counts(parsed, started);
  }

  return listAgencies(parsed, started);
}

async function lookupNpn(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const npn = parsed.query.identifier!.value;
  const { data } = await db()
    .from('national_entities')
    .select('id, entity_kind, npn, display_name, legal_name, identity_kind, identity_confidence')
    .eq('npn', npn)
    .limit(20);
  let rows = (data ?? []) as EntityRow[];
  if (parsed.query.selectedEntity) { const selected = rows.find(r => r.id === parsed.query.selectedEntity); if (!selected) throw new Error('Candidate no longer matches the exact identifier'); rows = [selected]; }
  const results: AskCard[] = [];
  for (const row of rows) {
    const cls = classOf(row.entity_kind);
    const creds = await credentialsForEntity(row.id, 8);
    const cred = creds[0];
    const personBlocked = cls === 'person' && !PUBLIC_PERSON_PROFILES_ENABLED;
    results.push({
      entityId: row.id,
      entityClass: cls,
      displayName: row.display_name || row.legal_name,
      npn: row.npn,
      naicCode: null,
      credentialJurisdiction: cred?.jurisdiction ?? null,
      credentialStatus: cred?.regulatory_status ?? null,
      licenseNumber: cred?.license_number ?? null,
      licenseClass: cred?.license_class ?? null,
      loas: [],
      sourceDataset: cred?.source_dataset ?? null,
      sourceObservedAt: cred?.source_observed_at ?? null,
      href: null,
      publicationNote: personBlocked
        ? 'Research identity — public producer report is not currently published.'
        : cls === 'agency'
          ? 'Research identity — public graph-agency profile is not currently published. Directory listings are a separate ZIP surface.'
          : 'Research identity — public legal-insurer profile only if in the Wave-1 cohort.',
      whyMatched: `This ${cls} matches because its indexed NPN is ${npn}. NPN is an identifier, not an endorsement. Class was not assumed from the digits.`,
    });
  }
  return finish(
    parsed,
    results,
    results.length,
    started,
    rows.length > 1 ? 'Multiple entity classes share this NPN. They are not merged.' : 'Labeled NPN lookup',
  );
}

async function credentialsForEntity(entityId: string, limit: number): Promise<CredEmbed[]> {
  const { data } = await db()
    .from('license_credentials')
    .select('id, jurisdiction, regulatory_status, license_number, license_class, source_dataset, source_observed_at')
    .eq('entity_id', entityId)
    .order('jurisdiction', { ascending: true })
    .limit(limit);
  return (data ?? []) as CredEmbed[];
}

async function lookupMarketplace(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const npn = parsed.query.identifier!.value;
  const year = parsed.query.marketplacePlanYear;
  const identity = await lookupNpn(parsed, started);
  if (identity.results.length !== 1) {
    identity.terminalState = identity.results.length ? 'NEEDS_CLARIFICATION' : 'NO_MATCH';
    identity.limitations = ['Marketplace evidence requires a resolved source identity. NPN digits do not establish producer class.', ...identity.limitations];
    return identity;
  }
  let query = db()
    .from('cms_marketplace_observations')
    .select('id, npn, evidence_type, plan_year, status, source_dataset, source_observed_at, identity_attachment')
    .eq('npn', npn)
    .order('plan_year', { ascending: false })
    .limit(parsed.query.pageSize ?? INSURANCE_ASK_PAGE_SIZE);
  if (year) query = query.eq('plan_year', year);
  const { data } = await query;
  const rows = (data ?? []) as Array<{
    id: string;
    npn: string;
    evidence_type: string;
    plan_year: string | null;
    status: string | null;
    source_dataset: string;
    source_observed_at: string | null;
    identity_attachment: string;
  }>;
  const extra: AskCard[] = rows.map((row) => ({
    entityId: identity.results[0]!.entityId,
    entityClass: identity.results[0]!.entityClass,
    displayName: identity.results[0]!.displayName,
    npn: row.npn,
    naicCode: null,
    credentialJurisdiction: null,
    credentialStatus: null,
    licenseNumber: null,
    licenseClass: null,
    loas: [],
    sourceDataset: row.source_dataset,
    sourceObservedAt: row.source_observed_at,
    href: null,
    publicationNote: 'CMS Marketplace overlay. Not a state DOI license. Not certification.',
    whyMatched: `This row matches because CMS Marketplace evidence is attached to NPN ${npn}${row.plan_year ? ` for plan year ${row.plan_year}` : ''}. Marketplace evidence is not a state license and is not certification.`,
    evidenceFamily: row.evidence_type,
    planYear: row.plan_year,
  }));
  const limitations = [
    ...LIMITATIONS,
    'Marketplace evidence is a federal overlay. It does not prove a state line of authority or a carrier appointment.',
  ];
  const result = finish(
    parsed,
    extra.length ? extra : identity.results,
    extra.length || identity.results.length,
    started,
    year ? `CMS Marketplace overlay, plan year ${year}` : 'CMS Marketplace overlay (all indexed years for this NPN)',
  );
  result.limitations = limitations;
  result.counts = extra.length ? [{ label: 'Indexed Marketplace observations', value: extra.length, grain: 'Federal Marketplace observations for the selected NPN; not distinct providers or state licenses' }] : [];
  result.provenance.sourceFamily = 'cms_marketplace_observations; national_entities for identity';
  if (!extra.length) {
    result.terminalState = 'EVIDENCE_UNAVAILABLE';
    result.coverageState = 'PARTIAL';
    result.limitations = [
      'No CMS Marketplace observation is indexed for this labeled NPN (and plan year, if given). Missing is not a finding that the producer is unregistered.',
      ...limitations,
    ];
  }
  return result;
}

async function lookupAppointment(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const npn = parsed.query.identifier!.value;
  const named = (parsed.query.appointerName ?? '').trim().toLowerCase();
  const { data: entities } = await db()
    .from('national_entities')
    .select('id, entity_kind, npn, display_name, legal_name')
    .eq('npn', npn)
    .limit(20);
  let rows = (entities ?? []) as EntityRow[];
  if (parsed.query.selectedEntity) rows = rows.filter(r=>r.id === parsed.query.selectedEntity);
  if(rows.length>1)return {...await lookupNpn(parsed,started),terminalState:'NEEDS_CLARIFICATION',limitations:['Select the source class/identity before attaching appointment evidence.',...LIMITATIONS]};
  if (!rows.length) {
    return finish(parsed, [], 0, started, 'Labeled NPN had no indexed entity for appointment lookup');
  }
  if(!named)return {...await lookupNpn(parsed,started),terminalState:'NEEDS_CLARIFICATION',limitations:['Specify the appointing entity; LOA is not appointment.',...LIMITATIONS]};
  const {data: namedAppointers} = await db().from('national_entities').select('id, entity_kind, npn, display_name, legal_name').eq('entity_kind','carrier').ilike('display_name', `%${escapeNamePattern(named)}%`).order('id').limit(11);
  const targets = (namedAppointers??[]) as EntityRow[];
  if(targets.length===11)return {...await lookupNpn(parsed,started),terminalState:'NEEDS_CLARIFICATION',limitations:['The appointing name is too broad. Enter a more specific source name.',...LIMITATIONS]};
  const targetIds=targets.map(t=>t.id);
  if(!targetIds.length)return {...await lookupNpn(parsed,started),terminalState:'EVIDENCE_UNAVAILABLE',limitations:['No indexed appointing identity matches this name. This is not a finding of unauthorized activity.',...LIMITATIONS]};
  const results: AskCard[] = [];
  for (const row of rows) {
    const { data: rels } = await db()
      .from('national_relationships')
      .select('id, relationship_type, status, source_dataset, source_observed_at, to_entity_id, from_entity_id')
      .eq('from_entity_id', row.id)
      .in('to_entity_id', targetIds)
      .in('relationship_type', ['appointed_by', 'APPOINTED_TO', 'appointed_to', 'APPOINTED_BY'])
      .limit(parsed.query.pageSize ?? INSURANCE_ASK_PAGE_SIZE);
    const relRows = (rels ?? []) as Array<{
      id: string;
      relationship_type: string;
      status: string | null;
      source_dataset: string;
      source_observed_at: string | null;
      to_entity_id: string;
    }>;
    const toIds = relRows.map((r) => r.to_entity_id).filter(Boolean);
    const names = new Map<string, EntityRow>();
    if (toIds.length) {
      const { data: tos } = await db()
        .from('national_entities')
        .select('id, entity_kind, npn, display_name, legal_name')
        .in('id', toIds)
        .limit(parsed.query.pageSize ?? INSURANCE_ASK_PAGE_SIZE);
      for (const t of (tos ?? []) as EntityRow[]) names.set(t.id, t);
    }
    for (const rel of relRows) {
      const appointer = names.get(rel.to_entity_id);
      const label = appointer?.display_name || appointer?.legal_name || rel.to_entity_id;
      if (named && !label.toLowerCase().includes(named.replace(/\?$/, '').slice(0, 48))) continue;
      results.push({
        entityId: row.id,
        entityClass: classOf(row.entity_kind),
        displayName: row.display_name || row.legal_name,
        npn: row.npn,
        naicCode: null,
        credentialJurisdiction: null,
        credentialStatus: null,
        licenseNumber: null,
        licenseClass: null,
        loas: [],
        sourceDataset: rel.source_dataset,
        sourceObservedAt: rel.source_observed_at,
        href: null,
        publicationNote:
          'Indexed appointment relationship. Not employment. Not a legal-insurer identity unless a confirmed APPOINTER_RESOLVES_TO crosswalk exists. County appointment files are not service territory.',
        whyMatched: `This ${classOf(row.entity_kind)} matches because NPN ${npn} is linked to an indexed ${rel.relationship_type} relationship with ${label}. A line of authority does not establish this appointment.`,
        evidenceFamily: 'appointment',
      });
    }
  }
  const result = finish(
    parsed,
    results,
    results.length,
    started,
    'Indexed appointment relationships only (not LOA, not service territory)',
  );
  if (!results.length) {
    result.results = (await lookupNpn(parsed,started)).results;
    result.terminalState='EVIDENCE_UNAVAILABLE';
    result.coverageState='PARTIAL';
    result.limitations = [
      'Indexed appointment evidence does not currently prove this relationship. That is not a finding of “unauthorized,” and a state license or LOA does not fill the gap.',
      ...LIMITATIONS,
    ];
  }
  return result;
}

async function lookupNaic(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const code = parsed.query.identifier!.value.padStart(5, '0');
  const published = publishedByNaic(code) ?? publishedByNaic(parsed.query.identifier!.value);
  const results: AskCard[] = published
    ? [
        {
          entityId: published.entity_id,
          entityClass: 'insurer',
          displayName: published.canonical_legal_name,
          npn: null,
          naicCode: published.naic_cocode,
          credentialJurisdiction: null,
          credentialStatus: null,
          licenseNumber: null,
          licenseClass: null,
          loas: [],
          sourceDataset: 'ins-insurer-006-wave1',
          sourceObservedAt: published.report_dates[0] ?? null,
          href: insurerProfilePath(published.slug),
          publicationNote: null,
          whyMatched: `This legal insurer matches because the official record lists NAIC company code ${published.naic_cocode}. A consumer brand is not assumed.`,
        },
      ]
    : [];
  const result = finish(
    parsed,
    results,
    results.length,
    started,
    'NAIC company code (Wave-1 public cohort unless unpublished)',
  );
  if (!results.length) {
    result.limitations = [
      UNPUBLISHED_NAIC,
      ...LIMITATIONS,
    ];
  }
  return result;
}

const UNPUBLISHED_NAIC =
  'InsuranceTrustHub has not published a legal-insurer research profile for this NAIC company code. Graph identity may still exist. Absence of a public page is not a finding about the company.';

async function listInsurers(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  if (parsed.query.nameQuery) {
    const matches = publishedSearch(parsed.query.nameQuery).slice(0, parsed.query.pageSize ?? INSURANCE_ASK_PAGE_SIZE);
    const results: AskCard[] = matches.flatMap((match) => {
      const published = publishedByNaic(match.naicCode ?? '');
      if (!published) return [];
      return [{
      entityId: published.entity_id,
      entityClass: 'insurer',
      displayName: published.canonical_legal_name,
      npn: null,
      naicCode: published.naic_cocode,
      credentialJurisdiction: null,
      credentialStatus: null,
      licenseNumber: null,
      licenseClass: null,
      loas: [],
      sourceDataset: 'ins-insurer-006-wave1',
      sourceObservedAt: published.report_dates[0] ?? null,
      href: insurerProfilePath(published.slug),
      publicationNote: null,
      whyMatched: 'This published legal-insurer identity is a bounded normalized-name candidate. The legal name and NAIC code on the profile establish identity; the consumer brand is not assumed.',
    }];
    });
    return finish(parsed, results, results.length, started, 'Wave-1 published legal-insurer normalized-name candidates');
  }
  const base = emptyBase(parsed, started);
  const reason =
    parsed.query.jurisdiction?.meaning === 'regulatory_domicile' || parsed.query.domicile
      ? 'Legal-insurer domicile is not a complete national Ask field in this extract. Wave-1 public profiles (26) store domicile as null; 6,185 graph identities are not a domicile census. Use a labeled NAIC company code.'
      : 'Ask does not list all 6,185 legal insurers as a directory. Use a labeled NAIC company code, or browse the published Wave-1 /insurers cohort.';
  return {
    ...base,
    resultType: 'fail_closed',
    parsed: {
      ...parsed,
      query: {
        ...parsed.query,
        mode: 'fail_closed',
        failReason: reason,
        alternatives: ['What is a legal insurer?', 'Find insurer NAIC code 10064.'],
      },
    },
    elapsedMs: Date.now() - started,
    coverageState: 'UNSUPPORTED',
  };
}

async function counts(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const q = parsed.query;
  if (q.mode === 'comparison' && q.jurisdiction && q.compareJurisdiction) {
    const a = await countEntities('agency', q.jurisdiction.state);
    const b = await countEntities('agency', q.compareJurisdiction.state);
    return finish(
      parsed,
      [],
      0,
      started,
      'same-class credential comparison',
      [
        { label: `${q.jurisdiction.state} agency identities with attached credentials`, value: a, grain: 'canonical agency' },
        { label: `${q.compareJurisdiction.state} agency identities with attached credentials`, value: b, grain: 'canonical agency' },
      ],
    );
  }
  if (q.aggregateMetric === 'credentials_by_state') {
    const states = ['FL', 'TX', 'MA', 'OH', 'VT'];
    const rows: AskCountRow[] = [];
    for (const st of states) {
      rows.push({
        label: `${st} agency credentials (credential jurisdiction)`,
        value: await countCredentialRows('agency', st),
        grain: 'license_credentials rows',
      });
    }
    return finish(parsed, [], 0, started, 'credentials by credential jurisdiction', rows);
  }
  if (q.aggregateMetric === 'multi_state_agencies') {
    return finish(parsed, [], 0, started, 'multi-state agencies', [
      {
        label: 'Agencies with 2 credentialed states (FL/TX/MA/OH/VT extracts)',
        value: AGENCY_MULTISTATE.two,
        grain: 'canonical agency (locked INS-HOME-003 rollup; NPN identity, not name merge)',
      },
    ]);
  }
  const kind = q.entityClass === 'person' ? 'person' : q.entityClass === 'insurer' ? 'legal_insurer' : 'agency';
  const state = q.jurisdiction?.state;
  if (kind === 'legal_insurer') {
    const n = await countKind('legal_insurer', LOCKED_CENSUS.legalInsurers);
    return finish(parsed, [], 0, started, 'legal insurer count', [
      { label: 'Legal insurer entities in the graph', value: n, grain: 'canonical legal_insurer (not public pages; not consumer brands)' },
    ]);
  }
  const n = await countEntities(kind, state, q.linesOfAuthority);
  return finish(parsed, [], n, started, q.jurisdiction ? `${q.jurisdiction.meaning} = ${state}` : 'national extract', [
    {
      label:
        kind === 'person'
          ? `Person identities with attached ${state ?? ''} credentials`.trim()
          : `Agency identities with attached ${state ?? ''} credentials`.trim(),
      value: n,
      grain: kind === 'person' ? 'canonical person entity' : 'canonical agency entity',
    },
  ]);
}

async function countKind(kind: string, fallback: number): Promise<number> {
  const key = askCacheKey(['kind', kind]);
  const cached = cacheGetCount(key);
  if (cached != null) return cached;
  try {
    const { count, error } = await db()
      .from('national_entities')
      .select('id', { count: 'exact', head: true })
      .eq('entity_kind', kind);
    if (error || count == null) return cacheSetCount(key, fallback);
    return cacheSetCount(key, count);
  } catch {
    return cacheSetCount(key, fallback);
  }
}

async function countCredentialRows(kind: string, state: string): Promise<number> {
  const key = askCacheKey(['cred-rows', kind, state]);
  const cached = cacheGetCount(key);
  if (cached != null) return cached;
  const { count } = await db()
    .from('license_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('entity_kind', kind)
    .eq('jurisdiction', state);
  return cacheSetCount(key, count ?? 0);
}

async function countEntities(kind: string, state?: string, loas?: string[]): Promise<number> {
  const key = askCacheKey(['entities', kind, state, (loas ?? []).join('+')]);
  const cached = cacheGetCount(key);
  if (cached != null) return cached;
  const fallback =
    kind === 'agency' && state === 'FL' && !loas?.length
      ? LOCKED_CENSUS.flDistinctAgencies
      : kind === 'person' && state === 'FL' && !loas?.length
        ? LOCKED_CENSUS.flDistinctPersons
        : kind === 'agency' && !state
          ? LOCKED_CENSUS.agencies
          : kind === 'person' && !state
            ? LOCKED_CENSUS.persons
            : 0;
  try {
    let query = db()
      .from('national_entities')
      .select('id, license_credentials!inner(id)', { count: 'exact', head: true })
      .eq('entity_kind', kind);
    if (state) query = query.eq('license_credentials.jurisdiction', state);
    if (loas?.length) {
      for (const loa of loas) query = query.ilike('license_credentials.license_class', `%${loa}%`);
    }
    const { count, error } = await query;
    if (error || count == null) return cacheSetCount(key, fallback);
    return cacheSetCount(key, count);
  } catch {
    return cacheSetCount(key, fallback);
  }
}

async function listAgencies(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const q = parsed.query;
  const state = q.jurisdiction?.state;
  const official = Boolean(q.loaAsOfficialObservation && state && state !== 'FL' && q.linesOfAuthority?.length);
  if (official) return listAgenciesOfficialLoa(parsed, started);

  const page = q.page;
  const pageSize = q.pageSize ?? INSURANCE_ASK_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = db()
    .from('national_entities')
    .select(
      'id, entity_kind, npn, display_name, legal_name, identity_kind, identity_confidence, license_credentials!inner(id, jurisdiction, regulatory_status, license_number, license_class, source_dataset, source_observed_at, entity_kind)',
      { count: 'exact' },
    )
    .eq('entity_kind', 'agency')
    .eq('license_credentials.entity_kind', 'agency')
    .order('display_name', { ascending: true })
    .order('npn', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);
  if (state) query = query.eq('license_credentials.jurisdiction', state);
  if (q.linesOfAuthority?.length) {
    for (const loa of q.linesOfAuthority) {
      query = query.ilike('license_credentials.license_class', `%${loa}%`);
    }
  }
  if (q.nameQuery) query = query.ilike('display_name', `%${q.nameQuery.slice(0, 80)}%`);
  const { data, count } = await query;
  const rows = (data ?? []) as EntityRow[];
  const results = rows.map((row) => cardFromEntity(row, q.linesOfAuthority ?? []));
  const result = finish(
    parsed,
    results,
    count ?? results.length,
    started,
    q.jurisdiction ? `${q.jurisdiction.meaning} = ${q.jurisdiction.state}` : 'agency credential list',
  );
  if (!results.length && state === 'FL' && q.linesOfAuthority?.length) {
    result.limitations = [
      'Florida DFS agency credentials are typically license class “AGENCY LICENSE.” Official Florida LOA observation rows = 0. Property / Casualty / Life / Health in Florida DFS are individual license-class texts, not an agency LOA codebook, and not appointments. Empty is not “no agencies have that authority.”',
      ...LIMITATIONS,
    ];
  }
  return result;
}

async function listAgenciesOfficialLoa(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const q = parsed.query;
  const state = q.jurisdiction!.state;
  const loas = q.linesOfAuthority ?? [];
  const primary = loas[0]!;
  const page = q.page;
  const pageSize = q.pageSize ?? INSURANCE_ASK_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  // The maintained issuer-dataset contract establishes LOA jurisdiction. Both predicates run before pagination.
  if (loas.length > 1 && q.loaMatch !== 'all') {
    q.mode = 'fail_closed'; q.terminalState = 'NEEDS_CLARIFICATION'; q.coverageState = 'UNSUPPORTED';
    q.failReason = 'Select one official line of authority, or explicitly request all listed lines. An alternative-line cohort is not executed by this source query; no requested line was discarded.';
    return emptyBase(parsed, started);
  }
  const requestedLoas = q.loaMatch === 'all' ? loas : [primary];
  const embeds = requestedLoas.map((_, i) => `loa${i}:loa_observations!inner(official_text, source_dataset, source_observed_at)`).join(',');
  function selectLoa(head: boolean) {
    let query = db().from('national_entities').select(
      `id, entity_kind, npn, display_name, legal_name, identity_kind, identity_confidence, license_credentials!inner(id, jurisdiction, regulatory_status, license_number, license_class, source_dataset, source_observed_at, entity_kind), ${embeds}`,
      head ? { count: 'exact', head: true } : undefined,
    ).eq('entity_kind', 'agency').eq('license_credentials.jurisdiction', state);
    requestedLoas.forEach((loa, i) => { query = query.ilike(`loa${i}.official_text`, `%${escapeNamePattern(loa)}%`).in(`loa${i}.source_dataset`, loaSourceDatasetsForJurisdiction(state)); });
    return head ? query : query.order('display_name', {ascending:true}).order('id', {ascending:true}).range(from, from + pageSize - 1);
  }
  const { data } = await selectLoa(false);
  const countKey = askCacheKey(['agency', 'official-loa', state, ...requestedLoas, q.loaMatch]);
  let count = sourceContext.getStore() ? undefined : cacheGetCount(countKey);
  if (count === undefined) {
    const counted = await selectLoa(true);
    if (counted.count === null) throw new Error('Insurance research count source unavailable');
    count = counted.count;
    if (!sourceContext.getStore()) cacheSetCount(countKey, count);
  }
  const rows = ((data ?? []) as EntityRow[]).map(row => ({ ...row, loa_observations: requestedLoas.flatMap((_, i) => (row as unknown as Record<string, NonNullable<EntityRow['loa_observations']>>)[`loa${i}`] ?? []) }));
  const results = rows.map((row) => cardFromEntity(row, loas, true));
  return finish(
    parsed,
    results,
    count ?? results.length,
    started,
    `official LOA observation text in ${state} (not appointment; not a national codebook)`,
  );
}

function cardFromEntity(row: EntityRow, wantedLoas: string[], official = false): AskCard {
  const creds = asArray(row.license_credentials);
  const cred = creds[0];
  const officialLoas = asArray(row.loa_observations).map((l) => l.official_text);
  const classText = cred?.license_class ?? '';
  const displayLoas = official
    ? officialLoas
    : officialLoas.length
      ? officialLoas
      : wantedLoas.filter((loa) => classText.toLowerCase().includes(loa.toLowerCase()));
  return {
    entityId: row.id,
    entityClass: 'agency',
    displayName: row.display_name || row.legal_name || 'Unnamed agency',
    npn: row.npn,
    naicCode: null,
    credentialJurisdiction: cred?.jurisdiction ?? null,
    credentialStatus: cred?.regulatory_status ?? null,
    licenseNumber: cred?.license_number ?? null,
    licenseClass: cred?.license_class ?? null,
    loas: displayLoas,
    sourceDataset: cred?.source_dataset ?? null,
    sourceObservedAt: cred?.source_observed_at ?? asArray(row.loa_observations)[0]?.source_observed_at ?? null,
    href: null,
    publicationNote: 'Research identity — public graph-agency profile is not currently published.',
    whyMatched: whyAgency(row, cred, wantedLoas.length ? wantedLoas : displayLoas),
  };
}

function classOf(kind: string): AskCard['entityClass'] {
  if (kind === 'person') return 'person';
  if (kind === 'legal_insurer') return 'insurer';
  if(kind === 'agency')return 'agency';
  throw new Error('Unsupported source identity class');
}

function emptyBase(parsed: ParsedInsuranceAsk, started: number): InsuranceAskResult {
  return {
    contract: INSURANCE_ASK_CONTRACT,
    queryText: parsed.raw,
    parsed,
    resultType: parsed.query.mode,
    entityClass: parsed.query.entityClass ?? null,
    results: [],
    counts: [],
    pagination: { page: parsed.query.page, pageSize: parsed.query.pageSize ?? INSURANCE_ASK_PAGE_SIZE, total: 0, hasMore: false },
    provenance: {
      sourceFamily: 'InsuranceTrustHub national identity graph',
      geographyMeaning: parsed.query.jurisdiction
        ? `${parsed.query.jurisdiction.meaning} = ${parsed.query.jurisdiction.state}`
        : 'Not geography-filtered',
      officialAsOf: 'Source credential clocks',
      grain: parsed.query.entityClass ?? parsed.query.mode,
      exclusions: LIMITATIONS,
    },
    limitations: LIMITATIONS,
    elapsedMs: Date.now() - started,
    coverageState: parsed.query.coverageState ?? (parsed.query.mode === 'fail_closed' ? 'UNSUPPORTED' : 'KNOWN'),
  };
}

function finish(
  parsed: ParsedInsuranceAsk,
  results: AskCard[],
  total: number,
  started: number,
  grain: string,
  counts: AskCountRow[] = [],
): InsuranceAskResult {
  const page = parsed.query.page;
  const pageSize = parsed.query.pageSize ?? INSURANCE_ASK_PAGE_SIZE;
  return {
    contract: INSURANCE_ASK_CONTRACT,
    queryText: parsed.raw,
    parsed,
    resultType: parsed.query.mode,
    entityClass: parsed.query.entityClass ?? (new Set(results.map(r=>r.entityClass)).size === 1 ? results[0]?.entityClass ?? null : null),
    results,
    counts: counts.length ? counts : total ? [{ label: 'Matching research identities', value: total, grain }] : [],
    pagination: {
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    },
    provenance: {
      sourceFamily: 'national_entities with source-native credential or evidence observations',
      geographyMeaning: parsed.query.jurisdiction
        ? `${parsed.query.jurisdiction.meaning} = ${parsed.query.jurisdiction.state}`
        : 'Not geography-filtered',
      officialAsOf: results[0]?.sourceObservedAt ?? 'See credential source_observed_at',
      grain,
      exclusions: LIMITATIONS,
    },
    limitations: LIMITATIONS,
    elapsedMs: Date.now() - started,
    coverageState: parsed.query.coverageState ?? 'KNOWN',
  };
}

export function publicAskPayload(result: InsuranceAskResult) {
  return {
    contract: result.contract,
    capability: {
      federatedExecution: 'execute',
      askStatus: 'live',
      entityClasses: ['person', 'agency', 'insurer'],
    },
    terminalState: result.terminalState,
    candidateSelection: result.candidateSelection,
    candidateTruncated: result.candidateTruncated,
    recoveryActions: result.recoveryActions,
    interpretation: result.parsed.interpretation,
    query: {
      ...result.parsed.query,
      mode: result.parsed.query.mode,
      entityClass: result.parsed.query.entityClass,
      jurisdiction: result.parsed.query.jurisdiction,
      identifier: result.parsed.query.identifier,
      linesOfAuthority: result.parsed.query.linesOfAuthority,
      evidenceFamily: result.parsed.query.evidenceFamily,
      failReason: result.parsed.query.failReason,
      alternatives: result.parsed.query.alternatives,
      definitionId: result.parsed.query.definitionId,
      page: result.parsed.query.page,
    },
    resultType: result.resultType,
    entityClass: result.entityClass,
    results: result.results.map((row) => ({
      entityClass: row.entityClass,
      name: row.displayName,
      npn: row.npn,
      naicCode: row.naicCode,
      credentialJurisdiction: row.credentialJurisdiction,
      credentialStatus: row.credentialStatus,
      loas: row.loas,
      sourceObservedAt: row.sourceObservedAt,
      href: row.href,
      publicationNote: row.publicationNote,
      whyMatched: row.whyMatched,
      evidenceFamily: row.evidenceFamily,
      planYear: row.planYear,
      matchEvidence: row.matchEvidence,
      selectionHref: row.selectionHref,
    })),
    counts: result.counts,
    pagination: result.pagination,
    provenance: result.provenance,
    limitations: result.limitations,
    elapsedMs: result.elapsedMs,
    coverageState: result.coverageState,
    definition: result.parsed.query.definitionId ? ASK_DEFINITIONS[result.parsed.query.definitionId] : undefined,
  };
}

async function lookupNameCandidates(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const q = parsed.query, name = q.nameQuery!, tokens = distinctiveNameTokens(name);
  if (!tokens.length) return { ...emptyBase(parsed, started), terminalState: 'NEEDS_CLARIFICATION', limitations: ['Enter a distinctive company name. Generic insurance/agency/company words do not identify a business.', ...LIMITATIONS] };
  const matches = new Map<string, AskCard>(); let truncated = false;
  if (!q.entityClass || q.entityClass === 'agency') {
    for (const field of ['legal_name', 'display_name'] as const) {
      for (const exact of [true, false]) {
        let query = db().from('national_entities').select('id, entity_kind, npn, display_name, legal_name, identity_kind, identity_confidence').eq('entity_kind','agency');
        if (exact) query = query.ilike(field, escapeNamePattern(name));
        else for (const token of tokens) query = query.ilike(field, `%${escapeNamePattern(token)}%`);
        const {data} = await query.order(field).order('id').limit(11);
        const rows = (data ?? []) as EntityRow[]; if (rows.length === 11) truncated = true;
        for (const row of rows) {
          const relation = matchSourceName(name, row[field]); if (!relation) continue;
          const old = matches.get(row.id); if (old?.matchEvidence?.method === 'normalized_exact_name') continue;
          const card = cardFromEntity(row, []);
          card.matchEvidence = { method: relation.method, field, value: row[field], requested: name, entityId: row.id, entityClass: 'agency', source: 'national_entities source legal/display name', normalization: relation.normalization };
          card.whyMatched = `Name candidate: requested ?${name}? matches source ${field} ?${row[field]}? (${relation.method}). NPN ${row.npn ?? 'not recorded'} identifies the source agency; similarity is not a license or appointment finding.`;
          matches.set(row.id, card);
        }
      }
    }
  }
  if (!q.entityClass || q.entityClass === 'insurer') {
    // Existing publication-permitted Wave-1 names; no expansion to unpublished profiles.
    for (const hit of publishedSearch(name)) {
      const row = publishedByNaic(hit.naicCode ?? ''); if (!row) continue;
      const relation = matchSourceName(name, row.canonical_legal_name); if (!relation) continue;
      const exact = await lookupNaic({ ...parsed, query: { ...q, identifier: {type:'naic_company_code',value:row.naic_cocode} } }, started);
      const card = exact.results[0]; if (!card) continue;
      card.matchEvidence = {method:relation.method, field:'canonical_legal_name',value:row.canonical_legal_name,requested:name,entityId:row.entity_id,entityClass:'insurer',source:'ins-insurer-006-wave1',normalization:relation.normalization};
      card.whyMatched = `Name candidate: requested ?${name}? matches source canonical_legal_name ?${row.canonical_legal_name}? (${relation.method}); NAIC company code ${row.naic_cocode}. This is not a consumer-brand or agency association.`;
      matches.set(row.entity_id,card);
    }
  }
  const ordered=[...matches.values()].sort((a,b)=>Number(b.matchEvidence?.method==='normalized_exact_name')-Number(a.matchEvidence?.method==='normalized_exact_name')||a.displayName.localeCompare(b.displayName)||a.entityId.localeCompare(b.entityId));
  truncated ||= ordered.length>10;
  const candidates=ordered.slice(0,10);
  if(q.selectedEntity){
    const chosen=candidates.find(c=>c.entityId===q.selectedEntity);
    if(!chosen)return {...emptyBase(parsed,started),terminalState:'NEEDS_CLARIFICATION',limitations:['The selected identity is not a current candidate for this request. Refine or select again.',...LIMITATIONS]};
    if(q.requestedTask==='appointment'){
      if(!chosen.npn||!q.appointerName)return {...finish(parsed,[chosen],1,started,'Selected source identity'),terminalState:'NEEDS_CLARIFICATION',limitations:['Appointment research requires the selected NPN and an appointing entity. No LOA substitution was made.',...LIMITATIONS]};
      const result=await lookupAppointment({...parsed,query:{...q,identifier:{type:'npn',value:chosen.npn},evidenceFamily:'appointment'}},started);
      if(!result.results.length)result.results=[chosen];
      result.terminalState ??= 'EVIDENCE_RESULT';return result;
    }
    if(chosen.entityClass==='agency'){const creds=await credentialsForEntity(chosen.entityId,8);const first=creds[0];chosen.credentialJurisdiction=first?.jurisdiction??null;chosen.credentialStatus=first?.regulatory_status??null;chosen.licenseNumber=first?.license_number??null;chosen.licenseClass=first?.license_class??null;chosen.sourceDataset=first?.source_dataset??chosen.sourceDataset;chosen.sourceObservedAt=first?.source_observed_at??null;}
    return {...finish(parsed,[chosen],1,started,'Server-revalidated selected source identity'),terminalState:'IDENTITY_FOUND'};
  }
  for(const card of candidates)card.selectionHref='/ask?'+new URLSearchParams({q:parsed.raw,...q.requestOptions,selected:card.entityId});
  const result=finish(parsed,candidates,candidates.length,started,'Displayed source-name candidates; not an exhaustive market count');
  result.candidateSelection=Boolean(candidates.length);result.candidateTruncated=truncated;
  result.counts = candidates.length ? [{label:'Displayed source-name candidates',value:candidates.length,grain:'Bounded candidate identities; not an exhaustive market count'}] : [];
  result.terminalState=candidates.length?'NEEDS_CLARIFICATION':'NO_MATCH';
  result.pagination.hasMore=false;
  result.limitations=[...(truncated?['Candidate retrieval is capped at 10 displayed identities. Refine the name; no exact total or uniqueness is asserted.']:[]),'Agency graph names and published Wave-1 legal-insurer names are searched separately. Display names are not assumed to be official DBAs.',...LIMITATIONS];
  return result;
}

export async function executeInsuranceRequest(input: URLSearchParams | Record<string,string|string[]|undefined>): Promise<InsuranceAskResult> {
 const request = readInsuranceRequest(input);
 if(request.error)return {...emptyBase(invalidResearch(request.raw,request.error),Date.now()),terminalState:'INVALID_INPUT',recoveryActions:[]};
 return executeInsuranceAsk(request.raw,request.page,INSURANCE_ASK_PAGE_SIZE,request.options);
}

function publishedByNaic(code:string):PublishedInsurer|undefined { const fixtures=sourceContext.getStore()?.insurers; return fixtures ? fixtures.find(x=>x.naic_cocode===code) : getPublishedByNaic(code)??undefined; }
function publishedSearch(name:string) { const fixtures=sourceContext.getStore()?.insurers; return fixtures ? searchLegalInsurers(name,fixtures.map(x=>({entityId:x.entity_id,legalName:x.canonical_legal_name,naicCode:x.naic_cocode,domicile:null}))) : searchPublishedInsurers(name); }
