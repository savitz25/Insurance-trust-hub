import { createHash } from 'crypto';

export const SPECIALIST_EXECUTION_CONTRACT = 'trusthub-specialist-execution-v2' as const;
export const SPECIALIST_EXECUTION_VERSION = '2.0.0' as const;
export const SPECIALIST_EXECUTION_MAX_LIMIT = 50;

export const RESULT_STATES = [
  'SUPPORTED_RESULTS',
  'ZERO_MATCHING_ROWS',
  'EXACT_IDENTITY',
  'AMBIGUOUS_IDENTITIES',
  'NO_CONFIDENT_MATCH',
  'UNSUPPORTED_CAPABILITY',
  'PUBLICATION_RESTRICTED',
  'INVALID_QUERY',
  'BACKEND_UNAVAILABLE',
  'TIMEOUT',
] as const;

export type ResultState = (typeof RESULT_STATES)[number];
export type V2EntityClass = 'agency' | 'producer' | 'legal_insurer';
export type GeographyIntent =
  | 'CREDENTIAL_JURISDICTION'
  | 'OFFICE_LOCATION'
  | 'DOMICILE'
  | 'SERVICE_TERRITORY';

export type SpecialistRequest = {
  contract?: typeof SPECIALIST_EXECUTION_CONTRACT;
  query?: string;
  queryType?: 'cohort' | 'identifier' | 'identity' | 'evidence';
  entityClass?: V2EntityClass;
  identifier?: { type: 'NPN' | 'NAIC'; value: string };
  identityName?: string;
  geography?: {
    stateCode?: string;
    stateName?: string;
    county?: string;
    city?: string;
    intent: GeographyIntent;
  };
  filters?: {
    credentialStatus?: string[];
    specialty?: string[];
    lineOfAuthority?: string[];
    publicationClass?: string[];
  };
  page?: number;
  limit?: number;
  requestedEvidence?: string[];
};

const SCHEMA_SHAPE = {
  request: ['contract', 'query', 'queryType', 'entityClass', 'identifier', 'identityName', 'geography', 'filters', 'page', 'limit', 'requestedEvidence'],
  response: ['contract', 'contractVersion', 'schemaFingerprint', 'contractFingerprint', 'queryInterpretation', 'appliedFilters', 'resultState', 'rows', 'total', 'pagination', 'availableRefinements', 'provenance', 'limitations', 'destinations', 'diagnostics', 'error'],
  resultStates: RESULT_STATES,
  entityClasses: ['agency', 'producer', 'legal_insurer'],
} as const;

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export const SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT = fingerprint(SCHEMA_SHAPE);
export const SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT = fingerprint({
  contract: SPECIALIST_EXECUTION_CONTRACT,
  version: SPECIALIST_EXECUTION_VERSION,
  schema: SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  publication: 'agency research rows; producer profiles disabled; legal-insurer Wave-1 only',
});
