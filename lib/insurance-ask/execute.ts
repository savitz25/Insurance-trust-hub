import { createClient } from '@supabase/supabase-js';
import {
  ASK_DEFINITIONS,
  INSURANCE_ASK_CONTRACT,
  INSURANCE_ASK_PAGE_SIZE,
  LOCKED_CENSUS,
} from './contract';
import { askCacheKey, cacheGetCount, cacheSetCount } from './cache';
import { interpretInsuranceAskQuery } from './interpret';
import type { ParsedInsuranceAsk } from './contract';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/config';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '@/lib/national/publication';
import { getPublishedByNaic, insurerProfilePath } from '@/lib/national/legal-insurer-pilot';
import { AGENCY_MULTISTATE } from '@/lib/national/home-intel';

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
};

export type AskCountRow = { label: string; value: number; grain: string };

export type InsuranceAskResult = {
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
};

const LIMITATIONS = [
  'Person, agency, and legal insurer stay separate classes.',
  'Credential jurisdiction is not office location or service territory.',
  'Line of authority is not carrier appointment.',
  'Marketplace evidence is not a state license and not certification.',
  'Missing evidence is not a clean record.',
  'Public people pages = 0. Public graph-agency profiles = 0.',
];

type AdminDb = {
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

function db(): AdminDb {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error('Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY (server-only).');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as AdminDb;
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

export async function executeInsuranceAsk(raw: string, page = 1): Promise<InsuranceAskResult> {
  const started = Date.now();
  const parsed = interpretInsuranceAskQuery(raw, page);
  const q = parsed.query;
  const empty = emptyBase(parsed, started);

  if (q.mode === 'fail_closed' || q.mode === 'definition') {
    empty.elapsedMs = Date.now() - started;
    return empty;
  }

  if (!isSupabaseAdminConfigured()) {
    empty.limitations = ['Research database is not configured in this environment.', ...LIMITATIONS];
    empty.elapsedMs = Date.now() - started;
    return empty;
  }

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
  const rows = (data ?? []) as EntityRow[];
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
  let query = db()
    .from('cms_marketplace_observations')
    .select('id, npn, evidence_type, plan_year, status, source_dataset, source_observed_at, identity_attachment')
    .eq('npn', npn)
    .order('plan_year', { ascending: false })
    .limit(INSURANCE_ASK_PAGE_SIZE);
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
    entityId: row.id,
    entityClass: identity.results[0]?.entityClass ?? 'person',
    displayName: identity.results[0]?.displayName ?? `NPN ${npn}`,
    npn: row.npn,
    naicCode: null,
    credentialJurisdiction: null,
    credentialStatus: row.status,
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
  if (!extra.length) {
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
  const rows = (entities ?? []) as EntityRow[];
  if (!rows.length) {
    return finish(parsed, [], 0, started, 'Labeled NPN had no indexed entity for appointment lookup');
  }
  const results: AskCard[] = [];
  for (const row of rows) {
    const { data: rels } = await db()
      .from('national_relationships')
      .select('id, relationship_type, status, source_dataset, source_observed_at, to_entity_id, from_entity_id')
      .eq('from_entity_id', row.id)
      .in('relationship_type', ['appointed_by', 'APPOINTED_TO', 'appointed_to', 'APPOINTED_BY'])
      .limit(INSURANCE_ASK_PAGE_SIZE);
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
        .limit(INSURANCE_ASK_PAGE_SIZE);
      for (const t of (tos ?? []) as EntityRow[]) names.set(t.id, t);
    }
    for (const rel of relRows) {
      const appointer = names.get(rel.to_entity_id);
      const label = appointer?.display_name || appointer?.legal_name || rel.to_entity_id;
      if (named && !label.toLowerCase().includes(named.replace(/\?$/, '').slice(0, 48))) continue;
      results.push({
        entityId: rel.id,
        entityClass: classOf(row.entity_kind),
        displayName: row.display_name || row.legal_name,
        npn: row.npn,
        naicCode: null,
        credentialJurisdiction: null,
        credentialStatus: rel.status,
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
    result.limitations = [
      'Indexed appointment evidence does not currently prove this relationship. That is not a finding of “unauthorized,” and a state license or LOA does not fill the gap.',
      ...LIMITATIONS,
    ];
  }
  return result;
}

async function lookupNaic(parsed: ParsedInsuranceAsk, started: number): Promise<InsuranceAskResult> {
  const code = parsed.query.identifier!.value.padStart(5, '0');
  const published = getPublishedByNaic(code) ?? getPublishedByNaic(parsed.query.identifier!.value);
  const results: AskCard[] = published
    ? [
        {
          entityId: published.entity_id,
          entityClass: 'insurer',
          displayName: published.canonical_legal_name,
          npn: null,
          naicCode: published.naic_cocode,
          credentialJurisdiction: published.jurisdiction[0] ?? null,
          credentialStatus: published.public_safe_status,
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
  const from = (page - 1) * INSURANCE_ASK_PAGE_SIZE;
  const to = from + INSURANCE_ASK_PAGE_SIZE - 1;
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
  const from = (page - 1) * INSURANCE_ASK_PAGE_SIZE;
  const fetchTo = q.loaMatch === 'all' && loas.length > 1 ? from + INSURANCE_ASK_PAGE_SIZE * 3 - 1 : from + INSURANCE_ASK_PAGE_SIZE - 1;
  const { data, count } = await db()
    .from('national_entities')
    .select(
      'id, entity_kind, npn, display_name, legal_name, identity_kind, identity_confidence, license_credentials!inner(id, jurisdiction, regulatory_status, license_number, license_class, source_dataset, source_observed_at, entity_kind), loa_observations!inner(official_text, source_dataset, source_observed_at)',
      { count: 'exact' },
    )
    .eq('entity_kind', 'agency')
    .eq('license_credentials.jurisdiction', state)
    .ilike('loa_observations.official_text', `%${primary}%`)
    .order('display_name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, fetchTo);
  let rows = (data ?? []) as EntityRow[];
  if (q.loaMatch === 'all' && loas.length > 1) {
    rows = rows.filter((row) => {
      const texts = asArray(row.loa_observations).map((l) => l.official_text.toLowerCase());
      return loas.every((loa) => texts.some((t) => t.includes(loa.toLowerCase())));
    });
    rows = rows.slice(0, INSURANCE_ASK_PAGE_SIZE);
  }
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
  if (kind === 'legal_insurer' || kind === 'insurance_group') return 'insurer';
  return 'agency';
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
    pagination: { page: parsed.query.page, pageSize: INSURANCE_ASK_PAGE_SIZE, total: 0, hasMore: false },
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
  return {
    contract: INSURANCE_ASK_CONTRACT,
    queryText: parsed.raw,
    parsed,
    resultType: parsed.query.mode,
    entityClass: parsed.query.entityClass ?? results[0]?.entityClass ?? null,
    results,
    counts: counts.length ? counts : total ? [{ label: 'Matching research identities', value: total, grain }] : [],
    pagination: {
      page,
      pageSize: INSURANCE_ASK_PAGE_SIZE,
      total,
      hasMore: page * INSURANCE_ASK_PAGE_SIZE < total,
    },
    provenance: {
      sourceFamily: 'national_entities ⋈ license_credentials (service-role; not public RLS; not a client-side table dump)',
      geographyMeaning: parsed.query.jurisdiction
        ? `${parsed.query.jurisdiction.meaning} = ${parsed.query.jurisdiction.state}`
        : 'Not geography-filtered',
      officialAsOf: results[0]?.sourceObservedAt ?? 'See credential source_observed_at',
      grain,
      exclusions: LIMITATIONS,
    },
    limitations: LIMITATIONS,
    elapsedMs: Date.now() - started,
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
    interpretation: result.parsed.interpretation,
    query: {
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
    })),
    counts: result.counts,
    pagination: result.pagination,
    provenance: result.provenance,
    limitations: result.limitations,
    elapsedMs: result.elapsedMs,
    definition: result.parsed.query.definitionId ? ASK_DEFINITIONS[result.parsed.query.definitionId] : undefined,
  };
}
