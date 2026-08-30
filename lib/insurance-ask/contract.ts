/** insurance-ask-v1 — structured InsuranceTrustHub Ask contract. */

export const INSURANCE_ASK_CONTRACT = 'insurance-ask-v1' as const;
export const INSURANCE_ASK_ROUTE = 'https://www.insurancetrusthub.com/ask';
export const INSURANCE_ASK_API = 'https://www.insurancetrusthub.com/api/ask';
export const INSURANCE_ASK_PAGE_SIZE = 20;

/** Homepage intel fingerprint — cache keys include this so aggregates do not reuse across payload changes. */
export const INSURANCE_ASK_SNAPSHOT_FINGERPRINT =
  '934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9';

/**
 * Locked INS-NAT-FINAL-006 / FL-INS-006 census. Used as labeled fallback when a live
 * distinct-entity count is unavailable. Never a combined “insurance providers” total.
 */
export const LOCKED_CENSUS = {
  asOf: '2026-08-28T14:43:51.753Z',
  agencies: 82071,
  persons: 1029860,
  legalInsurers: 6185,
  credentials: 1531158,
  agencyCredentials: 117354,
  marketplaceObservations: 1300108,
  flDistinctAgencies: 56939,
  flAgencyCredentialRows: 59189,
  flDistinctPersons: 691126,
  multiStateTwoPlus: 13289,
  publicDirectoryListings: 170499,
  publicPeople: 0,
  publicGraphAgencies: 0,
  publicLegalInsurerWave1: 26,
} as const;

export const INSURANCE_ASK_CAPABILITY = {
  contract: INSURANCE_ASK_CONTRACT,
  askStatus: 'live' as const,
  federatedExecution: 'execute' as const,
  askUrl: INSURANCE_ASK_ROUTE,
  apiUrl: INSURANCE_ASK_API,
  supportedModes: [
    'entity',
    'identifier',
    'count',
    'aggregate',
    'comparison',
    'evidence',
    'definition',
    'fail_closed',
  ] as const,
  entityClasses: ['person', 'agency', 'insurer'] as const,
  identifiers: ['labeled_npn', 'labeled_naic_cocode'] as const,
  credentialJurisdictions: ['FL', 'TX', 'MA', 'OH', 'VT'] as const,
  loaSupport:
    'Official LOA observation rows are source-limited (TX TDI, MA DOI, VT DFR). Florida DFS license class text is not a national LOA codebook.',
  appointmentLimitations:
    'Appointments are not a national census. LOA is not appointment. Florida county appointment files are not service territory.',
  marketplaceSupport:
    'CMS Marketplace observations exist as a federal overlay. Not a state license. Not certification. Public person pages = 0.',
  insurerSupport:
    'Legal insurer identities exist in the graph. Public legal-insurer profiles are a 26-firm Wave-1 cohort, not 6,185 pages.',
  geographySemantics:
    'credential jurisdiction ≠ recorded office ≠ domicile ≠ service territory',
  publicationLimitations:
    'Public people = 0. Public graph-agency profiles = 0. Directory listings are a separate ZIP surface (170,499). Ask does not mass-publish.',
};

export type InsuranceAskMode =
  | 'entity'
  | 'identifier'
  | 'count'
  | 'aggregate'
  | 'comparison'
  | 'evidence'
  | 'definition'
  | 'fail_closed';

export type InsuranceEntityClass = 'person' | 'agency' | 'insurer';

export type GeographyDimension =
  | 'credential_jurisdiction'
  | 'recorded_address_state'
  | 'regulatory_domicile'
  | 'insurer_market_geography';

export type InsuranceResearchQuery = {
  mode: InsuranceAskMode;
  entityClass?: InsuranceEntityClass;
  identifier?: { type: 'npn' | 'naic_company_code' | 'state_license'; value: string };
  jurisdiction?: { state: string; meaning: GeographyDimension };
  compareJurisdiction?: { state: string; meaning: GeographyDimension };
  credentialStatus?: 'active' | 'current_source' | 'any';
  linesOfAuthority?: string[];
  loaMatch?: 'all' | 'any';
  loaAsOfficialObservation?: boolean;
  domicile?: string;
  nameQuery?: string;
  marketplacePlanYear?: string;
  evidenceFamily?: 'credential' | 'marketplace' | 'appointment';
  appointerName?: string;
  sort?: 'name' | 'npn' | 'jurisdiction';
  page: number;
  definitionId?: string;
  failReason?: string;
  alternatives?: string[];
  aggregateMetric?: 'credentials_by_state' | 'entity_count' | 'multi_state_agencies';
};

export type InterpretationLine = { label: string; value: string };

export type ParsedInsuranceAsk = {
  raw: string;
  query: InsuranceResearchQuery;
  interpretation: InterpretationLine[];
};

export const ASK_DEFINITIONS: Record<string, { title: string; body: string }> = {
  npn: {
    title: 'National Producer Number (NPN)',
    body: 'An NPN is an identifier that may attach to an individual producer or to an organization/agency. It is not an endorsement. The same digits must not silently collapse a person into an agency.',
  },
  loa: {
    title: 'Line of authority (LOA)',
    body: 'A line of authority is what a credential authorizes, as the source defines it. LOA evidence in this graph is source-limited and is not one national codebook. LOA is not a carrier appointment.',
  },
  appointment: {
    title: 'Insurance appointment',
    body: 'An appointment is a sourced affiliation between a producer or agency and an appointing entity. It is not employment, not a quality rating, and not automatically a named NAIC legal insurer. A license plus LOA does not prove an appointment.',
  },
  domicile: {
    title: 'Insurer / agency domicile',
    body: 'Domicile is legal/regulatory home as the source records it. It is not the only market served, not office footprint, and not policyholder geography.',
  },
  marketplace: {
    title: 'CMS Marketplace registration evidence',
    body: 'This graph stores CMS FFM Marketplace observations as a federal overlay. That is not a state DOI license and is not labeled certification unless the source proves it. Plan year must be preserved.',
  },
  legal_insurer: {
    title: 'Legal insurer',
    body: 'A legal insurer is a specific regulated insurance company, typically identified by an NAIC company code. It is not a consumer brand, an agency, a producer, or an appointing-entity “carrier” row.',
  },
  agency_vs_insurer: {
    title: 'Agency vs insurer',
    body: 'An agency is a licensed business that may sell or service insurance. A legal insurer underwrites the policy. They are different regulated classes and must not be added into one “insurance providers” total.',
  },
};

export const CREDENTIAL_STATES = ['FL', 'TX', 'MA', 'OH', 'VT'] as const;
