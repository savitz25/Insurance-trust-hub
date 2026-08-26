/**
 * INS-NAT-003 classification overlay.
 * Four separate concepts: entity kind, credential namespace, insurance role,
 * product / denominator eligibility. Does not mutate source evidence.
 */

import type { LicenseNamespace } from '../credential-namespace';
import type { IdentityConfidence, NationalEntityKind, RegulatoryStatus } from '../types';

export const CLASSIFICATION_REGISTRY_VERSION = '1.0.0';

export type ClassificationConfidence =
  | 'CONFIRMED'
  | 'HIGH_CONFIDENCE'
  | 'REVIEW_REQUIRED'
  | 'UNRESOLVED';

export type ProductClass =
  | 'core_agency'
  | 'specialty_insurance'
  | 'ancillary_distribution'
  | 'claims_service'
  | 'warranty_service'
  | 'title'
  | 'bail'
  | 'tpa'
  | 'carrier'
  | 'out_of_scope'
  | 'unknown';

export type InsuranceRole =
  | 'core_producer_agency'
  | 'specialty_producer'
  | 'ancillary_distributor'
  | 'claims_adjuster'
  | 'warranty_association'
  | 'title_agency'
  | 'bail_agency'
  | 'tpa'
  | 'carrier'
  | 'unknown';

export type DenominatorEligibility =
  | 'core_agency_eligible'
  | 'specialty_only'
  | 'ancillary_only'
  | 'claims_only'
  | 'warranty_only'
  | 'title_only'
  | 'bail_only'
  | 'tpa_only'
  | 'carrier_only'
  | 'out_of_scope'
  | 'unknown_pending_classification';

export type OfficialSourceSupport = {
  regulator: string;
  citations: string[];
  notes: string;
};

export type ClassificationEntry = {
  registryVersion: string;
  jurisdiction: string;
  sourceDataset: string;
  rawTypeNormalized: string;
  licenseNamespace: LicenseNamespace;
  insuranceRole: InsuranceRole;
  productClass: ProductClass;
  denominatorEligibility: DenominatorEligibility;
  coreAgencyEligible: boolean;
  confidence: ClassificationConfidence;
  officialSource: string;
  notes: string;
};

export type SourceEvidenceSnapshot = {
  licenseClass: string | null;
  licenseTypes: string[];
  loaOfficialTexts: string[];
};

export type ClassifiedCredential = {
  registryVersion: string;
  jurisdiction: string;
  sourceDataset: string;
  sourceRecordId: string;
  licenseNumber: string;
  entityKind: NationalEntityKind;
  npn: string | null;
  legalName: string;
  rawTypesPreserved: string[];
  evidence: SourceEvidenceSnapshot;
  matches: ClassificationEntry[];
  productClasses: ProductClass[];
  primaryProductClass: ProductClass;
  insuranceRoles: InsuranceRole[];
  licenseNamespaces: LicenseNamespace[];
  coreAgencyEligible: boolean;
  confidence: ClassificationConfidence;
  classificationUnknown: boolean;
  current: boolean | null;
  regulatoryStatus: RegulatoryStatus | 'missing';
  published: boolean;
};

export type EntityClassification = {
  identityKey: string;
  identityKind: 'npn' | 'provisional';
  identityConfidence: IdentityConfidence;
  npn: string | null;
  entityKind: NationalEntityKind;
  legalName: string;
  credentialCount: number;
  jurisdictions: string[];
  productClasses: ProductClass[];
  primaryProductClass: ProductClass;
  coreAgencyEligible: boolean;
  currentCoreAgency: boolean | null;
  classificationUnknown: boolean;
  mixedCredential: boolean;
  locationNetwork: boolean;
  publishedAny: boolean;
};

export type ClassificationInput = {
  sourceDataset: string;
  sourceRecordId: string;
  jurisdiction: string;
  entityKind: NationalEntityKind;
  licenseNumber: string;
  legalName?: string | null;
  npn?: string | null;
  licenseClass?: string | null;
  licenseTypes?: string[] | null;
  loas?: Array<{ officialText: string }> | null;
  regulatoryStatus?: string | null;
  published?: boolean | null;
};
