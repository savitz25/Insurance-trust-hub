import { createHash } from 'crypto';
import { z } from 'zod';

export const INSURANCE_CLAIM_VALIDATION_CONTRACT =
  'insurance-customer-claim-validation-v1' as const;
export const INSURANCE_CLAIM_VALIDATION_VERSION = '1.0.0' as const;

export const INSURANCE_CLAIM_ENTITY_CLASSES = [
  'legal_insurer',
  'agency',
  'producer',
  'brand',
  'group',
  'carrier_relationship',
  'appointer_relationship',
  'directory_listing',
  'bail_bond',
] as const;

export const INSURANCE_CLAIM_RESULT_STATES = [
  'EXACT_IDENTITY',
  'INVALID_QUERY',
  'NO_CONFIDENT_MATCH',
  'PUBLICATION_RESTRICTED',
  'ENTITY_CLASS_RESTRICTED',
  'IDENTIFIER_MISMATCH',
  'NATIVE_PROFILE_MISMATCH',
  'CANONICAL_DESTINATION_MISMATCH',
  'PUBLICATION_HOLD',
  'BACKEND_UNAVAILABLE',
] as const;

export type InsuranceClaimEntityClass =
  (typeof INSURANCE_CLAIM_ENTITY_CLASSES)[number];
export type InsuranceClaimResultState =
  (typeof INSURANCE_CLAIM_RESULT_STATES)[number];

export const insuranceClaimValidationRequestSchema = z
  .object({
    contract: z.literal(INSURANCE_CLAIM_VALIDATION_CONTRACT),
    entityClass: z.enum(INSURANCE_CLAIM_ENTITY_CLASSES),
    nativeProfileId: z.string().uuid(),
    naicCode: z.string().regex(/^\d{5}$/).optional(),
    npn: z.string().regex(/^\d{5,10}$/).optional(),
    canonicalProfileUrl: z.string().url(),
  })
  .strict();

export const INSURANCE_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR = {
  request: [
    'contract',
    'entityClass',
    'nativeProfileId',
    'naicCode',
    'npn',
    'canonicalProfileUrl',
  ],
  response: [
    'contract',
    'contractVersion',
    'schemaFingerprint',
    'contractFingerprint',
    'hub',
    'entityClass',
    'resultState',
    'errorCode',
    'message',
    'nativeProfileId',
    'sourceIdentifier',
    'displayName',
    'publicationState',
    'current',
    'canonicalProfileUrl',
    'provenance',
    'limitations',
  ],
  entityClasses: INSURANCE_CLAIM_ENTITY_CLASSES,
  resultStates: INSURANCE_CLAIM_RESULT_STATES,
} as const;

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export const INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT = fingerprint(
  INSURANCE_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR,
);

export const INSURANCE_CLAIM_VALIDATION_CONTRACT_FINGERPRINT = fingerprint({
  contract: INSURANCE_CLAIM_VALIDATION_CONTRACT,
  version: INSURANCE_CLAIM_VALIDATION_VERSION,
  schema: INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
  identity:
    'legal_insurer:national_entities.id+naic_cocode+canonical-profile; agency:blocked; producer:restricted',
  publication: 'locked legal-insurer Wave-1 only; no publication expansion',
  writes: 'none',
});

export type InsuranceClaimValidationRequest = z.infer<
  typeof insuranceClaimValidationRequestSchema
>;
