export {
  CLASSIFICATION_REGISTRY_VERSION,
  type ClassificationConfidence,
  type ClassificationEntry,
  type ClassificationInput,
  type ClassifiedCredential,
  type DenominatorEligibility,
  type EntityClassification,
  type InsuranceRole,
  type ProductClass,
  type SourceEvidenceSnapshot,
} from './types';

export {
  CORE_AGENCY_DEFINITION,
  ENTITY_PRODUCT_PRIORITY,
  LOCATION_NETWORK_POLICY,
  MIXED_CREDENTIAL_POLICY,
  SOURCE_OFFICIAL_SUPPORT,
  pickPrimaryProductClass,
} from './taxonomy';

export {
  CLASSIFICATION_REGISTRY,
  heuristicClassify,
  listRegistryEntries,
  lookupClassification,
  normalizeRawType,
  registryLookupKey,
} from './registry';

export {
  DENOMINATOR_DEFINITIONS,
  classifyAndRollup,
  classifyCredential,
  collectRawTypes,
  credentialIsCurrent,
  identityKeyFor,
  isProposedConfirmedCore,
  researchDenominators,
  rollupEntityClassification,
  snapshotSourceEvidence,
} from './apply';
