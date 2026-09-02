import {
  findUnpublishedIdentity,
  getPublishedByNaic,
  insurerProfilePath,
  listPublishedInsurers,
  mayPublishLegalInsurerPilot,
} from '@/lib/national/legal-insurer-pilot';
import {
  INSURANCE_CLAIM_VALIDATION_CONTRACT,
  INSURANCE_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
  INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
  INSURANCE_CLAIM_VALIDATION_VERSION,
  insuranceClaimValidationRequestSchema,
  type InsuranceClaimEntityClass,
  type InsuranceClaimResultState,
} from './contract';

const PUBLIC_ORIGIN = 'https://www.insurancetrusthub.com';

export type InsuranceClaimValidationEnvelope = {
  contract: typeof INSURANCE_CLAIM_VALIDATION_CONTRACT;
  contractVersion: typeof INSURANCE_CLAIM_VALIDATION_VERSION;
  schemaFingerprint: string;
  contractFingerprint: string;
  hub: 'insurance';
  entityClass: InsuranceClaimEntityClass | null;
  resultState: InsuranceClaimResultState;
  errorCode?: string;
  message?: string;
  nativeProfileId: string | null;
  sourceIdentifier: { type: 'NAIC' | 'NPN'; value: string } | null;
  displayName: string | null;
  publicationState:
    | 'PUBLIC_PROFILE'
    | 'RESEARCH_ROW_ONLY'
    | 'PUBLICATION_HOLD'
    | 'RESTRICTED'
    | 'UNKNOWN';
  current: boolean;
  canonicalProfileUrl: string | null;
  provenance: {
    sourceFamily: string;
    sourceDataset: string;
    identityGrain: string;
    publicationSemantics: string;
  };
  limitations: string[];
};

const LIMITATIONS = [
  'This contract validates an exact currently public InsuranceTrustHub profile; AskTrustHub separately verifies claimant ownership or control.',
  'Legal insurer, agency, producer, brand, group, appointer, carrier relationship, and directory listing are distinct entity classes.',
  'Agency claims are blocked because public graph-agency profiles and canonical agency destinations are not currently published.',
  'Producer/person profiles and claims remain publication restricted.',
  'License is not appointment. Credential jurisdiction is not office location, service territory, or product availability.',
  'Complaint is not violation. Examination is not enforcement. Publication is not endorsement.',
  'Claim state cannot affect ranking, publication, indexing, or regulatory evidence.',
];

function base(
  resultState: InsuranceClaimResultState,
  entityClass: InsuranceClaimEntityClass | null = null,
): InsuranceClaimValidationEnvelope {
  return {
    contract: INSURANCE_CLAIM_VALIDATION_CONTRACT,
    contractVersion: INSURANCE_CLAIM_VALIDATION_VERSION,
    schemaFingerprint: INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
    contractFingerprint: INSURANCE_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
    hub: 'insurance',
    entityClass,
    resultState,
    nativeProfileId: null,
    sourceIdentifier: null,
    displayName: null,
    publicationState: 'UNKNOWN',
    current: false,
    canonicalProfileUrl: null,
    provenance: {
      sourceFamily: 'InsuranceTrustHub accepted regulatory identity graph',
      sourceDataset: 'ins-insurer-006-wave1',
      identityGrain: 'legal insurer × national_entities.id × NAIC Company Code',
      publicationSemantics:
        'Only the locked public legal-insurer Wave-1 cohort is claim-validation eligible.',
    },
    limitations: LIMITATIONS,
  };
}

export function claimValidationError(
  resultState: Exclude<InsuranceClaimResultState, 'EXACT_IDENTITY'>,
  errorCode: string,
  message: string,
  entityClass: InsuranceClaimEntityClass | null = null,
): InsuranceClaimValidationEnvelope {
  return { ...base(resultState, entityClass), errorCode, message };
}

function canonicalUrl(slug: string): string {
  return `${PUBLIC_ORIGIN}${insurerProfilePath(slug)}`;
}

function restrictedClass(
  entityClass: Exclude<InsuranceClaimEntityClass, 'legal_insurer'>,
): InsuranceClaimValidationEnvelope {
  if (entityClass === 'agency') {
    return {
      ...claimValidationError(
        'PUBLICATION_RESTRICTED',
        'agency_claim_validation_blocked',
        'Agency claim validation is blocked: the accepted publication contract has no public canonical graph-agency profiles or destinations.',
        entityClass,
      ),
      publicationState: 'RESEARCH_ROW_ONLY',
    };
  }
  if (entityClass === 'producer') {
    return {
      ...claimValidationError(
        'PUBLICATION_RESTRICTED',
        'producer_claim_not_allowed',
        'Producer/person profiles and customer claims are not published.',
        entityClass,
      ),
      publicationState: 'RESTRICTED',
    };
  }
  return {
    ...claimValidationError(
      'ENTITY_CLASS_RESTRICTED',
      'entity_class_not_claimable',
      'This Insurance entity class is not eligible for customer-profile validation.',
      entityClass,
    ),
    publicationState: 'RESTRICTED',
  };
}

export function validateInsuranceClaim(input: unknown): InsuranceClaimValidationEnvelope {
  const parsed = insuranceClaimValidationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return claimValidationError(
      'INVALID_QUERY',
      'invalid_claim_validation_request',
      parsed.error.issues.map((issue) => issue.message).join(' '),
    );
  }
  const request = parsed.data;
  if (request.entityClass !== 'legal_insurer') {
    return restrictedClass(request.entityClass);
  }
  if (!request.naicCode || request.npn) {
    return claimValidationError(
      'INVALID_QUERY',
      'legal_insurer_requires_naic',
      'Legal-insurer validation requires one exact five-digit NAIC Company Code and does not accept an NPN.',
      request.entityClass,
    );
  }

  const byNaic = getPublishedByNaic(request.naicCode);
  const byNativeId = listPublishedInsurers().find(
    (row) => row.entity_id === request.nativeProfileId,
  );

  if (!byNaic && findUnpublishedIdentity(request.naicCode)) {
    return {
      ...claimValidationError(
        'PUBLICATION_RESTRICTED',
        'legal_insurer_not_in_public_wave1',
        'The exact legal-insurer identity exists as research evidence but is not in the currently published Wave-1 profile cohort.',
        request.entityClass,
      ),
      publicationState: 'RESEARCH_ROW_ONLY',
    };
  }
  if (!byNaic && !byNativeId) {
    return claimValidationError(
      'NO_CONFIDENT_MATCH',
      'legal_insurer_not_found',
      'The supplied exact legal-insurer identity did not resolve to a claimable public profile.',
      request.entityClass,
    );
  }
  if (!byNativeId) {
    return claimValidationError(
      'NATIVE_PROFILE_MISMATCH',
      'native_profile_mismatch',
      'The native profile identity does not match the supplied public legal insurer.',
      request.entityClass,
    );
  }
  if (byNativeId.naic_cocode !== request.naicCode || byNaic?.entity_id !== byNativeId.entity_id) {
    return claimValidationError(
      'IDENTIFIER_MISMATCH',
      'naic_native_identity_mismatch',
      'The NAIC Company Code and native profile identity do not identify the same legal insurer.',
      request.entityClass,
    );
  }

  const expectedUrl = canonicalUrl(byNativeId.slug);
  if (request.canonicalProfileUrl !== expectedUrl) {
    return claimValidationError(
      'CANONICAL_DESTINATION_MISMATCH',
      'canonical_destination_mismatch',
      'The supplied destination does not match the exact canonical public legal-insurer profile.',
      request.entityClass,
    );
  }
  if (
    !mayPublishLegalInsurerPilot({
      entityKind: 'legal_insurer',
      entityId: byNativeId.entity_id,
      naicCocode: byNativeId.naic_cocode,
    })
  ) {
    return {
      ...claimValidationError(
        'PUBLICATION_HOLD',
        'legal_insurer_publication_hold',
        'The exact legal-insurer profile is not currently publication eligible.',
        request.entityClass,
      ),
      publicationState: 'PUBLICATION_HOLD',
    };
  }

  return {
    ...base('EXACT_IDENTITY', 'legal_insurer'),
    nativeProfileId: byNativeId.entity_id,
    sourceIdentifier: { type: 'NAIC', value: byNativeId.naic_cocode },
    displayName: byNativeId.canonical_legal_name,
    publicationState: 'PUBLIC_PROFILE',
    current: true,
    canonicalProfileUrl: expectedUrl,
  };
}
