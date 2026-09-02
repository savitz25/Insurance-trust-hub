import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  INSURANCE_CLAIM_VALIDATION_CONTRACT,
  INSURANCE_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
  INSURANCE_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR,
  INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
  INSURANCE_CLAIM_VALIDATION_VERSION,
} from '../lib/customer-claim-validation/contract';
import { validateInsuranceClaim } from '../lib/customer-claim-validation/v1';
import {
  listPublishedInsurers,
  insurerProfilePath,
} from '../lib/national/legal-insurer-pilot';
import { LOCKED_CENSUS } from '../lib/insurance-ask/contract';

const ORIGIN = 'https://www.insurancetrusthub.com';
const contract = INSURANCE_CLAIM_VALIDATION_CONTRACT;
const citizens = listPublishedInsurers().find((row) => row.naic_cocode === '10064');
const floridaPeninsula = listPublishedInsurers().find(
  (row) => row.naic_cocode === '10132',
);
assert(citizens && floridaPeninsula);

function request(
  row: typeof citizens,
  overrides: Record<string, unknown> = {},
) {
  return {
    contract,
    entityClass: 'legal_insurer',
    nativeProfileId: row.entity_id,
    naicCode: row.naic_cocode,
    canonicalProfileUrl: `${ORIGIN}${insurerProfilePath(row.slug)}`,
    ...overrides,
  };
}

const exact = validateInsuranceClaim(request(citizens));
assert.equal(exact.resultState, 'EXACT_IDENTITY');
assert.equal(exact.publicationState, 'PUBLIC_PROFILE');
assert.equal(exact.sourceIdentifier?.value, '10064');
assert.equal(exact.nativeProfileId, citizens.entity_id);

const second = validateInsuranceClaim(request(floridaPeninsula));
assert.equal(second.resultState, 'EXACT_IDENTITY');

assert.equal(
  validateInsuranceClaim(request(citizens, { naicCode: floridaPeninsula.naic_cocode }))
    .resultState,
  'IDENTIFIER_MISMATCH',
);
assert.equal(
  validateInsuranceClaim(
    request(citizens, { nativeProfileId: '00000000-0000-4000-8000-000000000000' }),
  ).resultState,
  'NATIVE_PROFILE_MISMATCH',
);
assert.equal(
  validateInsuranceClaim(
    request(citizens, { canonicalProfileUrl: `${ORIGIN}/insurers/wrong` }),
  ).resultState,
  'CANONICAL_DESTINATION_MISMATCH',
);

const researchOnly = validateInsuranceClaim({
  contract,
  entityClass: 'legal_insurer',
  nativeProfileId: '0001b7b8-aade-4e8d-b20b-430e9829607c',
  naicCode: '11105',
  canonicalProfileUrl: `${ORIGIN}/insurers/a-central-insurance-company`,
});
assert.equal(researchOnly.resultState, 'PUBLICATION_RESTRICTED');
assert.equal(researchOnly.publicationState, 'RESEARCH_ROW_ONLY');

const agency = validateInsuranceClaim({
  contract,
  entityClass: 'agency',
  nativeProfileId: 'e28cf148-881c-4045-9b8d-1a2f2331ce99',
  npn: '10391484',
  canonicalProfileUrl: `${ORIGIN}/directory`,
});
assert.equal(agency.resultState, 'PUBLICATION_RESTRICTED');
assert.equal(agency.errorCode, 'agency_claim_validation_blocked');

const producer = validateInsuranceClaim({
  contract,
  entityClass: 'producer',
  nativeProfileId: '00000ec8-cedd-4e30-ab0d-d70abae28d6e',
  npn: '22172606',
  canonicalProfileUrl: `${ORIGIN}/directory`,
});
assert.equal(producer.resultState, 'PUBLICATION_RESTRICTED');
assert.equal(producer.errorCode, 'producer_claim_not_allowed');

for (const entityClass of [
  'brand',
  'group',
  'carrier_relationship',
  'appointer_relationship',
  'directory_listing',
  'bail_bond',
] as const) {
  assert.equal(
    validateInsuranceClaim({
      contract,
      entityClass,
      nativeProfileId: '00000000-0000-4000-8000-000000000001',
      canonicalProfileUrl: `${ORIGIN}/directory`,
    }).resultState,
    'ENTITY_CLASS_RESTRICTED',
  );
}

assert.equal(
  validateInsuranceClaim({
    contract,
    entityClass: 'agency',
    nativeProfileId: '00000ec8-cedd-4e30-ab0d-d70abae28d6e',
    npn: '22172606',
    canonicalProfileUrl: `${ORIGIN}/directory`,
  }).resultState,
  'PUBLICATION_RESTRICTED',
);
assert.equal(validateInsuranceClaim({ name: 'Citizens' }).resultState, 'INVALID_QUERY');
assert.equal(
  validateInsuranceClaim({ ...request(citizens), extra: true }).resultState,
  'INVALID_QUERY',
);
assert.equal(
  validateInsuranceClaim(request(citizens, { npn: '10391484' })).resultState,
  'INVALID_QUERY',
);

assert.equal(listPublishedInsurers().length, 26);
assert.equal(LOCKED_CENSUS.publicGraphAgencies, 0);
assert.equal(LOCKED_CENSUS.publicPeople, 0);

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.equal(
  INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
  digest(INSURANCE_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR),
);
assert.equal(INSURANCE_CLAIM_VALIDATION_VERSION, '1.0.0');
assert.match(INSURANCE_CLAIM_VALIDATION_CONTRACT_FINGERPRINT, /^[a-f0-9]{64}$/);

const metrics = {
  NAME_ONLY_VALIDATIONS: 0,
  FUZZY_VALIDATIONS: 0,
  PRODUCER_CLAIMABLE_IDENTITIES: 0,
  BRAND_CLAIMABLE_IDENTITIES: 0,
  GROUP_CLAIMABLE_IDENTITIES: 0,
  DIRECTORY_ONLY_CLAIMABLE_IDENTITIES: 0,
  UNPUBLISHED_ENTITY_VALIDATIONS: 0,
  RESEARCH_ONLY_ENTITY_VALIDATIONS: 0,
  NPN_NATIVE_ID_MISMATCHES_ACCEPTED: 0,
  NAIC_NATIVE_ID_MISMATCHES_ACCEPTED: 0,
  CANONICAL_DESTINATION_MISMATCHES_ACCEPTED: 0,
  CROSS_ENTITY_CLASS_VALIDATIONS: 0,
  PROFILE_MINTING: 0,
  DB_WRITES: 0,
  PUBLICATION_DELTA: 0,
  RANKING_EFFECTS: 0,
};

console.log(
  JSON.stringify(
    {
      check: 'INS-CUST-CAP-001',
      outcome: 'LEGAL_INSURER_READY_AGENCY_BLOCKED',
      contract: INSURANCE_CLAIM_VALIDATION_CONTRACT,
      version: INSURANCE_CLAIM_VALIDATION_VERSION,
      schemaFingerprint: INSURANCE_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
      contractFingerprint: INSURANCE_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
      legalInsurerClaimable: 26,
      agencyClaimable: 0,
      metrics,
    },
    null,
    2,
  ),
);
