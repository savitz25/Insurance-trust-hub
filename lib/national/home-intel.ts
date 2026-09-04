/**
 * INTEL-006 — insurance-home-intel-v1
 * National homepage snapshot. Read-only. No graph writes.
 * Counts come from the accepted INS-NAT-FINAL-006 census, not JSX literals.
 */
import { createHash } from 'crypto';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '@/lib/national/fl-state-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '@/lib/national/publication';

export const INS_HOME_INTEL_VERSION = 'insurance-home-intel-v1' as const;
export const INS_HOME_INTEL_TASK = 'INTEL-006';
export const INS_HOME_CENSUS_TASK = 'INS-NAT-FINAL-006';
export const INS_HOME_CENSUS_AT = '2026-08-28T14:43:51.753Z';

/**
 * INS-HOME-003 / 003B SQL-locked agency × distinct credentialed-state rollup.
 * Grain: canonical agency × distinct attached credential state.
 * Wording: attached state credential evidence. LICENSED_IN ≠ SERVES.
 * Not active licenses. Not a 50-state service-territory census.
 */
export const AGENCY_MULTISTATE = {
  d1: 82071,
  d2: 82071,
  d3: 109927,
  d4: 117354,
  one: 62202,
  two: 13289,
  threeToFour: 6546,
  fiveToNine: 34,
  tenPlus: 0,
  retrievedAt: '2026-08-29T05:48:24.729Z',
  includedStates: ['FL', 'MA', 'OH', 'TX', 'VT'] as const,
  sourceDatasets: [
    'florida_dfs',
    'massachusetts_doi_regulatory',
    'ohio_odi',
    'texas_tdi',
    'vermont_dfr',
  ] as const,
} as const;

export const FORBIDDEN_HOME_COPY = [
  'trust score',
  'carrier risk score',
  'agent trust score',
  'complaint grade',
  'safety grade',
  'best insurer',
  'top agent',
  'top agents',
  'most trusted',
  'safest insurer',
  'paid ranking',
  'recommended carrier',
  'get a quote',
  'free quotes',
] as const;

export type CoverageStatus =
  | 'Available nationally'
  | 'Strong'
  | 'Partial'
  | 'State-dependent'
  | 'Source-limited'
  | 'Unavailable'
  | 'Not yet researched';

export type Metric = {
  id: string;
  label: string;
  value: number;
  display: string;
  entityClass: string;
  cohort: string;
  grain: string;
  denominator?: number;
  source: string;
  asOf: string;
  generatedAt: string;
  limitation: string;
  classification: 'SAFE' | 'SAFE_WITH_QUALIFIER';
};

export type Finding = {
  id: 'network' | 'multi-state-licensing' | 'lines-of-authority';
  type: 'BENCHMARK' | 'GAP';
  title: string;
  summary: string;
  chartCaption: string;
  series: Array<{ key: string; label: string; value: number; note?: string; shareOf?: number }>;
  whyItMatters: string;
  doesNotMean: string[];
  source: string;
  asOf: string;
  limitation: string;
};

export type EvidenceFamily = { family: string; status: CoverageStatus; note: string };

export type InsuranceHomeIntelV1 = {
  version: typeof INS_HOME_INTEL_VERSION;
  task: typeof INS_HOME_INTEL_TASK;
  generatedAt: string;
  asOf: string;
  db_writes: 0;
  fingerprint: string;
  population: {
    agencies: Metric;
    persons: Metric;
    legalInsurers: Metric;
    credentials: Metric;
    agencyCredentials: Metric;
    marketplaceObservations: Metric;
  };
  publicAvailability: {
    publicDirectoryProviders: number;
    publicGraphAgencies: number;
    publicPeople: number;
    publicLegalInsurers: number;
    publicPersonProfilesEnabled: boolean;
    mayPublishAgency: boolean;
    mayPublishPerson: boolean;
    mayPublishLegalInsurer: boolean;
  };
  featuredFindings: Finding[];
  licenseAuthorityComposition: Array<{ key: string; label: string; value: number; source: string }>;
  agencyMultistate: {
    d1: number;
    d2: number;
    d3: number;
    d4: number;
    includedStates: string[];
    sourceDatasets: string[];
  };
  multiStateDistribution: Array<{ key: string; label: string; value: number; shareOf: number }>;
  evidenceCoverage: EvidenceFamily[];
  geography: Array<{
    state: string;
    credentialRows: number;
    href: string;
    liveIntelligence: boolean;
    meaning: string;
  }>;
  federalOverlays: Array<{ id: string; label: string; status: CoverageStatus; note: string }>;
  sourceClocks: Array<{ id: string; label: string; asOf: string }>;
  sources: Array<{ id: string; name: string; usedFor: string; limitation: string }>;
  limitations: string[];
  denominatorDefinitions: string[];
  missingness: string[];
  verifyDirectly: string[];
  ask: Array<{ id: string; question: string; answer: string; href: string; hrefLabel: string }>;
  tools: Array<{ href: string; label: string; note: string }>;
  checklist: Array<{ id: string; label: string; href: string }>;
  evidenceJourney: Array<{ id: string; label: string; status: 'connected' | 'unavailable' | 'partial'; note: string }>;
};

export type HomeIntelCountInput = {
  agencies: number;
  persons: number;
  legalInsurers: number;
  credentials: number;
  agencyCredentials: number;
  marketplace: number;
  publicDirectoryProviders: number;
  appointingCarrierEntities: number;
  flCredentialRows: number;
  txCredentialRows: number;
  vtCredentialRows: number;
  maCredentialRows: number;
  ohCredentialRows: number;
  texasLive: boolean;
  newestDocumentedSourceAsOf?: string | null;
};

const DEFAULT_HOME_COUNTS: HomeIntelCountInput = {
  agencies: 82071,
  persons: 1029860,
  legalInsurers: 6185,
  credentials: 1531158,
  agencyCredentials: 117354,
  marketplace: 1300108,
  publicDirectoryProviders: 170499,
  appointingCarrierEntities: 13547,
  flCredentialRows: 750316,
  txCredentialRows: 718894,
  vtCredentialRows: 50514,
  maCredentialRows: 7187,
  ohCredentialRows: 4247,
  texasLive: true,
  newestDocumentedSourceAsOf: '2026-09-03',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function stripVolatile(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripVolatile);
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'generatedAt' || key === 'fingerprint') continue;
    out[key] = stripVolatile(nested);
  }
  return out;
}

export function fingerprintHomeIntel(payload: InsuranceHomeIntelV1): string {
  return createHash('sha256').update(stableSerialize(stripVolatile(payload))).digest('hex');
}

function metric(
  partial: Omit<Metric, 'asOf' | 'generatedAt' | 'display'> & { generatedAt: string },
): Metric {
  return {
    ...partial,
    display: fmt(partial.value),
    asOf: INS_HOME_CENSUS_AT,
  };
}

export function buildInsuranceHomeIntelV1(
  generatedAt = INS_HOME_CENSUS_AT,
  counts: HomeIntelCountInput = DEFAULT_HOME_COUNTS,
): InsuranceHomeIntelV1 {
  const agencies = counts.agencies;
  const persons = counts.persons;
  const legalInsurers = counts.legalInsurers;
  const credentials = counts.credentials;
  const agencyCredentials = counts.agencyCredentials;
  const personCredentials = credentials - agencyCredentials;
  const marketplace = counts.marketplace;
  const publicProviders = counts.publicDirectoryProviders;

  const credentialByState = [
    { state: 'FL', credentialRows: counts.flCredentialRows, href: '/florida', liveIntelligence: true },
    {
      state: 'TX',
      credentialRows: counts.txCredentialRows,
      href: counts.texasLive ? '/texas' : '/directory',
      liveIntelligence: counts.texasLive,
    },
    { state: 'VT', credentialRows: counts.vtCredentialRows, href: '/directory', liveIntelligence: false },
    { state: 'MA', credentialRows: counts.maCredentialRows, href: '/directory', liveIntelligence: false },
    { state: 'OH', credentialRows: counts.ohCredentialRows, href: '/directory', liveIntelligence: false },
  ] as const;

  const loa = [
    { key: 'texas_tdi_individual', label: 'Texas TDI individual LOA rows', value: 733324, source: 'Texas TDI' },
    { key: 'texas_tdi', label: 'Texas TDI agency LOA rows', value: 50348, source: 'Texas TDI' },
    { key: 'massachusetts', label: 'Massachusetts DOI regulatory LOA rows', value: 19177, source: 'Massachusetts DOI' },
    { key: 'vermont', label: 'Vermont DFR LOA rows', value: 20, source: 'Vermont DFR' },
  ];

  const draft: InsuranceHomeIntelV1 = {
    version: INS_HOME_INTEL_VERSION,
    task: INS_HOME_INTEL_TASK,
    generatedAt,
    asOf: INS_HOME_CENSUS_AT,
    db_writes: 0,
    fingerprint: '',
    population: {
      agencies: metric({
        id: 'graph-agencies',
        label: 'Agencies in the research graph',
        value: agencies,
        entityClass: 'agency',
        cohort: 'Canonical agency identities in the national insurance graph (NPN-keyed).',
        grain: 'canonical agency entity',
        source: `${INS_HOME_CENSUS_TASK} entity census`,
        generatedAt,
        limitation: 'Research-graph count. Public graph-agency profiles currently = 0.',
        classification: 'SAFE',
      }),
      persons: metric({
        id: 'graph-persons',
        label: 'Individuals in the regulatory research graph',
        value: persons,
        entityClass: 'person',
        cohort: 'Canonical person identities in the national insurance graph.',
        grain: 'canonical person entity',
        source: `${INS_HOME_CENSUS_TASK} entity census`,
        generatedAt,
        limitation: 'Not a public producer directory. Public person profiles = 0.',
        classification: 'SAFE_WITH_QUALIFIER',
      }),
      legalInsurers: metric({
        id: 'graph-legal-insurers',
        label: 'Legal insurer entities',
        value: legalInsurers,
        entityClass: 'legal_insurer',
        cohort: 'National NAIC legal-insurer identities in the graph.',
        grain: 'canonical legal_insurer entity',
        source: `${INS_HOME_CENSUS_TASK} entity census`,
        generatedAt,
        limitation: 'Internal identity spine. Public legal-insurer pages = 0.',
        classification: 'SAFE_WITH_QUALIFIER',
      }),
      credentials: metric({
        id: 'credentials-all',
        label: 'Credential observations',
        value: credentials,
        entityClass: 'credential',
        cohort: 'Person + agency credential rows currently stored in the graph.',
        grain: 'credential row',
        denominator: agencies + persons,
        source: `${INS_HOME_CENSUS_TASK} credentials census`,
        generatedAt,
        limitation: 'A credential is not an appointment and is not a quality rating. Coverage is source-state dependent.',
        classification: 'SAFE_WITH_QUALIFIER',
      }),
      agencyCredentials: metric({
        id: 'credentials-agency',
        label: 'Agency credential observations',
        value: agencyCredentials,
        entityClass: 'credential',
        cohort: 'Credential rows attached to agency entities.',
        grain: 'agency credential row',
        denominator: agencies,
        source: `${INS_HOME_CENSUS_TASK} credentials census`,
        generatedAt,
        limitation: 'Not a count of unique licensed states per agency. Not service territory.',
        classification: 'SAFE_WITH_QUALIFIER',
      }),
      marketplaceObservations: metric({
        id: 'cms-marketplace',
        label: 'CMS Marketplace observations',
        value: marketplace,
        entityClass: 'marketplace_observation',
        cohort: 'CMS Marketplace registration observations in the graph.',
        grain: 'CMS Marketplace observation',
        source: `${INS_HOME_CENSUS_TASK} cms census`,
        generatedAt,
        limitation: 'Marketplace evidence is not a state license and is not certification unless the source proves it.',
        classification: 'SAFE_WITH_QUALIFIER',
      }),
    },
    publicAvailability: {
      publicDirectoryProviders: publicProviders,
      publicGraphAgencies: 0,
      publicPeople: 0,
      publicLegalInsurers: 0,
      publicPersonProfilesEnabled: PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishAgency: mayPublishEntityKind('agency'),
      mayPublishPerson: mayPublishEntityKind('person'),
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
    },
    featuredFindings: [
      {
        id: 'network',
        type: 'BENCHMARK',
        title: 'Insurance is a network, not one company list',
        summary:
          'The legal insurer underwriting coverage, the agency that sells or services it, and the licensed person a consumer talks to may be different regulated entities.',
        chartCaption: 'Research-graph identity classes (not a single combined “insurance entities” total)',
        series: [
          { key: 'legal_insurer', label: 'Legal insurers', value: legalInsurers, note: 'NAIC identity spine' },
          { key: 'agency', label: 'Agencies', value: agencies, note: 'canonical graph agencies' },
          { key: 'person', label: 'Producers / persons', value: persons, note: 'research graph only' },
        ],
        whyItMatters:
          'Consumers often treat a brand, an agency, and an individual as one “insurance company.” Public records keep those classes separate.',
        doesNotMean: [
          'Entity role is quality.',
          'Appointment is employment.',
          'Appointment is endorsement.',
          'A consumer brand is a legal insurer unless sourced.',
          'These three counts can be added into one national total.',
        ],
        source: `${INS_HOME_CENSUS_TASK} entity census`,
        asOf: INS_HOME_CENSUS_AT,
        limitation: 'Relationship edges are incomplete nationally. Do not infer employment or carrier identity from an appointment.',
      },
      {
        id: 'multi-state-licensing',
        type: 'BENCHMARK',
        title: 'Some agencies hold credentials across multiple states',
        summary:
          'Insurance businesses may hold credentials in more than one state. That can matter when researching a business operating across jurisdictions, but a state credential does not mean every office, individual producer, product or policy is available everywhere in that state. LICENSED_IN is not SERVES.',
        chartCaption: `Canonical agencies grouped by distinct credentialed states among ${fmt(AGENCY_MULTISTATE.d2)} agencies with at least one attached state credential in FL, TX, VT, MA, or OH`,
        series: [
          { key: '1', label: '1 credentialed state', value: AGENCY_MULTISTATE.one, shareOf: AGENCY_MULTISTATE.d2 },
          { key: '2', label: '2 credentialed states', value: AGENCY_MULTISTATE.two, shareOf: AGENCY_MULTISTATE.d2 },
          { key: '3-4', label: '3–4 credentialed states', value: AGENCY_MULTISTATE.threeToFour, shareOf: AGENCY_MULTISTATE.d2 },
          { key: '5-9', label: '5–9 credentialed states', value: AGENCY_MULTISTATE.fiveToNine, shareOf: AGENCY_MULTISTATE.d2 },
          { key: '10+', label: '10+ credentialed states', value: AGENCY_MULTISTATE.tenPlus, shareOf: AGENCY_MULTISTATE.d2 },
        ],
        whyItMatters:
          'Consumers may encounter agencies operating across multiple jurisdictions and should verify the exact credential relevant to their state.',
        doesNotMean: [
          'LICENSED_IN means SERVES.',
          'Nationwide service.',
          'Every producer at the agency is licensed in those states.',
          'Every insurance product is authorized there.',
          'A physical office exists there.',
          'Domicile or business address is a licensed state.',
          'Appointment evidence increases the state count.',
          'Quality or TrustHub endorsement.',
          'This is a complete 50-state licensing census.',
        ],
        source: `Agency license_credentials only (${AGENCY_MULTISTATE.sourceDatasets.join(', ')}). Retrieved ${AGENCY_MULTISTATE.retrievedAt}.`,
        asOf: AGENCY_MULTISTATE.retrievedAt,
        limitation:
          `Denominator D2=${fmt(AGENCY_MULTISTATE.d2)} agencies with ≥1 included 2-letter jurisdiction credential. D1 canonical agencies=${fmt(AGENCY_MULTISTATE.d1)}. D3 agency×state pairs=${fmt(AGENCY_MULTISTATE.d3)}. D4 contributing credential rows=${fmt(AGENCY_MULTISTATE.d4)}. Person credentials, appointments, domicile, and addresses are excluded. Included states: ${AGENCY_MULTISTATE.includedStates.join(', ')}.`,
      },
      {
        id: 'lines-of-authority',
        type: 'GAP',
        title: 'Lines of authority matter — and they are not one national taxonomy yet',
        summary:
          'An active insurance credential does not automatically authorize every insurance product. LOA rows in this graph come from specific state sources with different field systems. They are not collapsed into a fake national Property / Life pie.',
        chartCaption: 'LOA observation rows by source family (not nationally comparable product categories)',
        series: loa.map((row) => ({
          key: row.key,
          label: row.label,
          value: row.value,
        })),
        whyItMatters:
          'Consumers need to know what a license actually authorizes. This page shows where LOA evidence exists — and that it is incomplete nationally.',
        doesNotMean: [
          'These bars are national Property vs Casualty vs Life shares.',
          'Missing LOA rows mean the producer can sell everything.',
          'Florida DFS LOA modules are a national substitute.',
          'Authority equals experience or quality.',
        ],
        source: `${INS_HOME_CENSUS_TASK} LOA census`,
        asOf: INS_HOME_CENSUS_AT,
        limitation: 'LOA semantics are state-source-specific. Do not compare Texas TDI classes to Vermont or Massachusetts as if they were one codebook.',
      },
    ],
    licenseAuthorityComposition: loa,
    agencyMultistate: {
      d1: AGENCY_MULTISTATE.d1,
      d2: AGENCY_MULTISTATE.d2,
      d3: AGENCY_MULTISTATE.d3,
      d4: AGENCY_MULTISTATE.d4,
      includedStates: [...AGENCY_MULTISTATE.includedStates],
      sourceDatasets: [...AGENCY_MULTISTATE.sourceDatasets],
    },
    multiStateDistribution: [
      { key: '1', label: '1 credentialed state', value: AGENCY_MULTISTATE.one, shareOf: AGENCY_MULTISTATE.d2 },
      { key: '2', label: '2 credentialed states', value: AGENCY_MULTISTATE.two, shareOf: AGENCY_MULTISTATE.d2 },
      { key: '3-4', label: '3–4 credentialed states', value: AGENCY_MULTISTATE.threeToFour, shareOf: AGENCY_MULTISTATE.d2 },
      { key: '5-9', label: '5–9 credentialed states', value: AGENCY_MULTISTATE.fiveToNine, shareOf: AGENCY_MULTISTATE.d2 },
      { key: '10+', label: '10+ credentialed states', value: AGENCY_MULTISTATE.tenPlus, shareOf: AGENCY_MULTISTATE.d2 },
    ],
    evidenceCoverage: [
      { family: 'Identity', status: 'Partial', note: 'Agency/person/legal-insurer identities exist in the graph; public profiles are gated.' },
      { family: 'State licensing', status: 'State-dependent', note: 'Credential rows for FL, TX, VT, MA, OH source families in this extract.' },
      { family: 'Lines of authority', status: 'Source-limited', note: 'LOA rows exist for some state sources; not a unified national codebook.' },
      { family: 'Appointments / affiliations', status: 'Partial', note: 'Some appointed_by and ASSOCIATED_WITH edges exist. Appointment ≠ employment or NAIC identity.' },
      { family: 'Regulatory history', status: 'Source-limited', note: 'Complaint observations exist as INTERNAL_ONLY. Not a national enforcement census.' },
      { family: 'Complaint evidence', status: 'Source-limited', note: 'CMS/complaint rows are not violations and not a clean-record proof when absent.' },
      { family: 'Federal Marketplace evidence', status: 'Partial', note: 'CMS Marketplace observations are a separate lane from state licenses.' },
      { family: 'Medicare market evidence', status: 'Partial', note: 'Existing Medicare research tools and carrier rollups; not legal-insurer pages.' },
      { family: 'Corporate / domicile evidence', status: 'Not yet researched', note: 'Not a V1 national homepage metric.' },
    ],
    geography: credentialByState.map((row) => ({
      state: row.state,
      credentialRows: row.credentialRows,
      href: row.href,
      liveIntelligence: row.liveIntelligence,
      meaning: 'Credential-row volume in the research graph. Not service territory. Not a quality ranking.',
    })),
    federalOverlays: [
      {
        id: 'cms-marketplace',
        label: 'CMS Marketplace evidence — Plan Year 2026',
        status: 'Partial',
        note: `${fmt(marketplace)} observations. Appears in source-defined Marketplace registration evidence. Not a state license and not “Marketplace Certified.”`,
      },
      {
        id: 'medicare',
        label: 'Medicare research tools',
        status: 'Partial',
        note: 'Existing /medicare and complaint-index surfaces. Separate from state DOI credentials.',
      },
    ],
    sourceClocks: [
      { id: 'census', label: 'INS-NAT-FINAL-006 entity/credential census', asOf: INS_HOME_CENSUS_AT },
      { id: 'florida-snapshot', label: 'Locked Florida state snapshot (untouched)', asOf: CANONICAL_SNAPSHOT_FINGERPRINT },
      { id: 'texas-snapshot', label: 'Locked Texas state snapshot', asOf: 'insurance-tx-state-intel-v1' },
      {
        id: 'network-metrics',
        label: 'insurance-network-metrics-v1 newest documented sourceAsOf',
        asOf: counts.newestDocumentedSourceAsOf ?? INS_HOME_CENSUS_AT,
      },
    ],
    sources: [
      {
        id: 'ins-nat-final-006',
        name: 'InsuranceTrustHub national graph census',
        usedFor: 'Agency, person, legal-insurer, credential, LOA, CMS observation totals',
        limitation: 'Accepted production census at task SHA. Not a live browser query.',
      },
      {
        id: 'state-doi',
        name: 'State insurance-department credential extracts (FL, TX, VT, MA, OH families present)',
        usedFor: 'Licensing coverage finding',
        limitation: 'Other states may have 0 rows because they are not ingested here, not because no market exists.',
      },
      {
        id: 'cms',
        name: 'CMS Marketplace observations',
        usedFor: 'Federal overlay lane',
        limitation: 'Not certification or state licensing.',
      },
    ],
    limitations: [
      'Do not add agencies + persons + legal insurers into one “insurance entities” total.',
      'Public people and public legal-insurer pages are 0.',
      'Public graph-agency profiles are 0; the live directory is a separate provider listing surface.',
      'Appointment is not employment and is not NAIC legal-insurer identity.',
      'Credential is not appointment.',
      'Marketplace evidence is not a state license.',
      'Complaint observations are not violations.',
      'No matching action is not a clean record.',
      'Address / licensed-in is not service territory.',
      'Florida is richer than many states and is not the national dataset.',
    ],
    denominatorDefinitions: [
      `agency_credentials (${agencyCredentials}) are rows, not unique states.`,
      `person_credentials (${personCredentials}) + agency_credentials (${agencyCredentials}) = credentials (${credentials}).`,
      'Legal insurers, agencies, and persons are different grains and must not be summed.',
    ],
    missingness: [
      'States publish different credential fields.',
      'Appointment data is not equally available nationally.',
      'Appointment does not necessarily identify employment.',
      'Address does not prove service territory.',
      'Carrier brands may represent multiple legal entities.',
      'Complaint datasets vary and are not a TrustHub grade.',
      'No matching enforcement event in researched sources is not proof of a clean record.',
      'Federal program evidence is distinct from state licensing.',
      'Plan-year / program-year data can expire.',
      'An active credential does not authorize every insurance product.',
    ],
    verifyDirectly: [
      'Open the official state insurance-department record for the license number.',
      'Confirm the legal name of the insurer on the policy, not only the consumer brand.',
      'Ask whether the person is appointed for the product you are considering, and for which agency.',
      'Re-check Marketplace or Medicare.gov for the relevant plan year.',
      'Compare another licensed option in the same jurisdiction.',
    ],
    ask: [
      {
        id: 'carrier-agency',
        question: 'What is the difference between a carrier and an agency?',
        answer:
          'A carrier / legal insurer underwrites the policy. An agency is a separate licensed business that may sell or service insurance. They are not the same entity class in this research graph.',
        href: '#findings',
        hrefLabel: 'See the network finding',
      },
      {
        id: 'producer',
        question: 'What is a producer?',
        answer:
          'A producer is a licensed individual (person) who may sell or service insurance. This graph organizes more than one million person identities internally. Public producer profile pages are not published.',
        href: '#record',
        hrefLabel: 'See public vs research-graph availability',
      },
      {
        id: 'license',
        question: 'What does an active license mean?',
        answer:
          'It means a regulator credential record in the sourced extract reports an active or equivalent status as of that source clock. It is not InsuranceTrustHub endorsement and not authorization for every product.',
        href: '#findings',
        hrefLabel: 'See licensing coverage',
      },
      {
        id: 'loa',
        question: 'What is a line of authority?',
        answer:
          'A line of authority (LOA) is the product class a credential authorizes, as the source defines it. LOA evidence here is source-limited and not one national codebook.',
        href: '#findings',
        hrefLabel: 'See LOA finding',
      },
      {
        id: 'appointment',
        question: 'What does an appointment mean?',
        answer:
          'An appointment is a sourced affiliation between a producer or agency and an appointing entity. It is not employment, not a quality rating, and not automatically a named NAIC legal insurer.',
        href: '#gaps',
        hrefLabel: 'Read missingness',
      },
      {
        id: 'complaint',
        question: 'What does a complaint record tell me?',
        answer:
          'It is a regulatory or program observation as the source filed it. It is not automatically a violation, and the absence of a matching record is not a clean history.',
        href: '#gaps',
        hrefLabel: 'Read what we don’t know',
      },
      {
        id: 'marketplace',
        question: 'What is Marketplace registration evidence?',
        answer: `This graph stores ${fmt(marketplace)} CMS Marketplace observations. That federal overlay is not a state DOI license and is not labeled certification unless the source proves it.`,
        href: '#axis',
        hrefLabel: 'See federal overlays',
      },
      {
        id: 'verify',
        question: 'What should I verify before choosing an insurance professional?',
        answer:
          'Identity, state credential, lines of authority, agency relationship, appointment evidence where available, and the official regulator record. Then compare another option. InsuranceTrustHub does not rank or recommend.',
        href: '#use',
        hrefLabel: 'Open the research checklist',
      },
    ],
    tools: [
      { href: '/directory', label: 'Agency directory', note: 'Live public search of licensed agency/provider listings. Not a producer-profile search.' },
      { href: '/florida', label: 'Florida Insurance Intelligence', note: 'Live state intelligence page. Locked snapshot. Not the national dataset.' },
      { href: '/tools/coverage-compass', label: 'Coverage Compass', note: 'Educational coverage-need path.' },
      { href: '/medicare', label: 'Medicare research', note: 'Existing Medicare intelligence surfaces.' },
      { href: '/tools/marketplace-plan-research', label: 'Marketplace plan research', note: 'ACA Marketplace landscape by ZIP. Federal overlay, not a DOI license.' },
      { href: '/methodology', label: 'Methodology', note: 'How verification and research work here.' },
      { href: '/carriers', label: 'Carrier research (public-data rollups)', note: `Existing Medicare-evidenced carrier research. Not ${fmt(legalInsurers)} public legal-insurer pages.` },
      { href: '/texas', label: 'Texas Insurance Intelligence', note: 'Live TDI agency, appointment, complaint, and rate-filing snapshot. Not a person directory.' },
      { href: '/my-insurance', label: 'My Insurance', note: 'Save research. Not a quote funnel.' },
      { href: '/my-insurance/compare', label: 'Compare saved options', note: 'Existing My Insurance compare session. Not a ranking board.' },
    ],
    checklist: [
      { id: 'identity', label: 'Verify identity (legal name, not only a brand)', href: '/directory' },
      { id: 'credential', label: 'Verify the state credential', href: '/tools/license-verification' },
      { id: 'loa', label: 'Review lines of authority where sourced', href: '#findings' },
      { id: 'agency', label: 'Confirm agency relationship where sourced', href: '#findings' },
      { id: 'appointment', label: 'Review appointment evidence where available', href: '#gaps' },
      { id: 'history', label: 'Review available regulatory history as source text', href: '/methodology' },
      { id: 'official', label: 'Open the official regulator record', href: '/methodology' },
      { id: 'compare', label: 'Compare another licensed option', href: '/directory' },
    ],
    evidenceJourney: [
      { id: 'identity', label: 'Producer / agency identity', status: 'partial', note: 'Graph identities exist; public people = 0.' },
      { id: 'credential', label: 'State credential', status: 'partial', note: 'Source-state dependent.' },
      { id: 'loa', label: 'Lines of authority', status: 'partial', note: 'Not a unified national taxonomy.' },
      { id: 'relationship', label: 'Agency / professional relationship', status: 'partial', note: 'Some ASSOCIATED_WITH / appointment edges.' },
      { id: 'appointment', label: 'Appointment evidence', status: 'partial', note: 'Not employment; not NAIC identity.' },
      { id: 'federal', label: 'Federal program evidence', status: 'partial', note: 'CMS Marketplace and Medicare tools, separate lane.' },
      { id: 'regulatory', label: 'Regulatory observations', status: 'partial', note: 'Internal complaint observations; not a clean-record proof.' },
      { id: 'view', label: 'InsuranceTrustHub research view', status: 'connected', note: 'This national homepage plus /directory, /florida, /texas, /new-jersey, and /california.' },
    ],
  };

  return { ...draft, fingerprint: fingerprintHomeIntel(draft) };
}

export function floridaFingerprintLocked(): string {
  return CANONICAL_SNAPSHOT_FINGERPRINT;
}

export function credentialIsAppointment(): false {
  return false;
}
export function appointmentIsInsurerIdentity(): false {
  return false;
}
export function licenseIsEndorsement(): false {
  return false;
}
export function marketplaceIsLicense(): false {
  return false;
}
export function complaintIsViolation(): false {
  return false;
}
export function noMatchIsClean(): false {
  return false;
}
export function geographyIsServiceTerritory(): false {
  return false;
}
export function brandIsLegalInsurer(): false {
  return false;
}
