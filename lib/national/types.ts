/**
 * INS-NAT-002 national identity + credential graph types.
 * In-memory model mirrors supabase/migrations/20260826120000_national_identity_graph.sql.
 */

export type NationalEntityKind =
  | 'person'
  | 'agency'
  | 'carrier'
  | 'legal_insurer'
  | 'insurance_group'
  | 'consumer_brand';
export type NationalIdentityKind = 'npn' | 'provisional';
export type IdentityConfidence =
  | 'CONFIRMED'
  | 'HIGH_CONFIDENCE'
  | 'REVIEW_REQUIRED'
  | 'UNRESOLVED';

export type RegulatoryStatus =
  | 'active'
  | 'inactive'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'cancelled'
  | 'unknown';

export type ContactObservationKind =
  | 'email'
  | 'phone'
  | 'website'
  | 'physical_address'
  | 'mailing_address'
  | 'named_contact'
  | 'contact_title';

export type NationalEntity = {
  id: string;
  entityKind: NationalEntityKind;
  identityKind: NationalIdentityKind;
  npn: string | null;
  provisionalKey: string | null;
  legalName: string;
  displayName: string;
  identityConfidence: IdentityConfidence;
  identityNotes: string | null;
};

export type LicenseCredential = {
  id: string;
  entityId: string | null;
  entityKind: NationalEntityKind;
  jurisdiction: string;
  regulator: string;
  licenseNumber: string;
  licenseClass: string | null;
  licenseNamespace: import('./credential-namespace').LicenseNamespace;
  regulatoryStatus: RegulatoryStatus;
  issueDate: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  renewalDate: string | null;
  terminationDate: string | null;
  sourceDataset: string;
  sourceRecordId: string | null;
  sourceUrl: string | null;
  sourceObservedAt: string | null;
  ingestedAt: string;
  attributionConfidence: IdentityConfidence;
};

export type LoaObservation = {
  id: string;
  entityId: string | null;
  credentialId: string | null;
  officialText: string;
  officialCode: string | null;
  loaStatus: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  sourceDataset: string;
  regulator: string | null;
  sourceObservedAt: string | null;
  consumerGroup: string | null;
};

export type ContactObservation = {
  id: string;
  entityId: string;
  contactKind: ContactObservationKind;
  value: string;
  label: string | null;
  sourceDataset: string;
  sourceRecordId: string | null;
  sourceObservedAt: string | null;
  attributionConfidence: IdentityConfidence;
  publicEligible: boolean;
};

export type IdentityConflict = {
  id: string;
  npn: string | null;
  entityKind: NationalEntityKind | null;
  reason: string;
  leftSourceDataset: string | null;
  leftSourceRecordId: string | null;
  leftName: string | null;
  rightSourceDataset: string | null;
  rightSourceRecordId: string | null;
  rightName: string | null;
  existingEntityId: string | null;
  status: 'REVIEW_REQUIRED';
};

export type ProviderEntityBridge = {
  providerId: string;
  entityId: string | null;
  matchMethod: string;
  confidence: IdentityConfidence;
  source: string | null;
  matchedAt: string;
  notes: string | null;
};

export type SourceCredentialInput = {
  sourceDataset: string;
  sourceRecordId: string;
  sourceTable?: string;
  sourceUrl?: string | null;
  entityKind: NationalEntityKind;
  npn?: string | null;
  jurisdiction: string;
  regulator: string;
  licenseNumber: string;
  licenseClass?: string | null;
  licenseTypes?: string[] | null;
  licenseNamespace?: import('./credential-namespace').LicenseNamespace | null;
  legalName: string;
  displayName?: string | null;
  regulatoryStatus?: RegulatoryStatus | string | null;
  issueDate?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  sourceObservedAt?: string | null;
  ingestedAt?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  physicalAddress?: string | null;
  mailingAddress?: string | null;
  namedContact?: string | null;
  contactTitle?: string | null;
  loas?: Array<{
    officialText: string;
    officialCode?: string | null;
    loaStatus?: string | null;
    effectiveDate?: string | null;
    expirationDate?: string | null;
  }>;
  /** Optional legacy public.providers id — never mutated by ingest. */
  providerId?: string | null;
};

export type IngestResult = {
  entity: NationalEntity | null;
  credential: LicenseCredential;
  identityConfidence: IdentityConfidence;
  createdEntity: boolean;
  conflict: IdentityConflict | null;
};
