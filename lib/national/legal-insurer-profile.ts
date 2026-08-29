/**
 * INS-INSURER-001 — insurance-legal-insurer-profile-v1 contract.
 * Internal research shape. No proprietary score. No recommendation.
 */
export const LEGAL_INSURER_PROFILE_VERSION = 'insurance-legal-insurer-profile-v1' as const;

export type LegalInsurerSourceClock = {
  id: string;
  family: string;
  source: string;
  sourceDataset: string | null;
  sourceIdentifier: string | null;
  observedAt: string | null;
  retrievedAt: string;
  attachmentMethod: string;
  limitation: string;
};

export type LegalInsurerRegulatoryObservationV1 = {
  sourceNativeLabel: string;
  regulator: string;
  jurisdiction: string | null;
  eventDate: string | null;
  sourceIdentifier: string;
  description: string | null;
  sourceUrl: string | null;
  family: string;
  attachmentMethod: string;
  publicSafe: boolean;
};

export type LegalInsurerProfileV1 = {
  version: typeof LEGAL_INSURER_PROFILE_VERSION;
  entityId: string;
  slug: string | null;
  legalName: string;
  naicCode: string | null;
  domicile: string | null;
  identifiers: Array<{ scheme: string; value: string; confidence: string }>;
  credentialEvidence: never[];
  regulatoryEvidence: LegalInsurerRegulatoryObservationV1[];
  marketplaceEvidence: never[];
  federalEvidence: never[];
  sourceClocks: LegalInsurerSourceClock[];
  limitations: string[];
  whatThisDoesNotMean: string[];
  traceability: 'Trace This Record';
  score: null;
  recommendation: null;
  trustRating: null;
  enforcementScore: null;
  complaintScore: null;
};

export function emptyLegalInsurerProfile(partial: {
  entityId: string;
  legalName: string;
  naicCode: string | null;
  retrievedAt: string;
}): LegalInsurerProfileV1 {
  return {
    version: LEGAL_INSURER_PROFILE_VERSION,
    entityId: partial.entityId,
    slug: null,
    legalName: partial.legalName,
    naicCode: partial.naicCode,
    domicile: null,
    identifiers: partial.naicCode
      ? [{ scheme: 'naic_cocode', value: partial.naicCode, confidence: 'CONFIRMED' }]
      : [],
    credentialEvidence: [],
    regulatoryEvidence: [],
    marketplaceEvidence: [],
    federalEvidence: [],
    sourceClocks: [
      {
        id: 'identity',
        family: 'Identity',
        source: 'NAIC Listing of Companies',
        sourceDataset: 'naic_loc_jun_2026',
        sourceIdentifier: partial.naicCode,
        observedAt: '2026-08-27T00:00:00.000Z',
        retrievedAt: partial.retrievedAt,
        attachmentMethod: 'exact_naic_cocode',
        limitation: 'Legal name + NAIC identity is not a license, appointment, or product offering.',
      },
    ],
    limitations: [
      'Identity is not a recommendation.',
      'Missing evidence is not a zero or a clean record.',
      'Brand names are not legal insurers unless a CONFIRMED bridge exists.',
    ],
    whatThisDoesNotMean: [
      'Presence of a regulatory observation is not a quality score.',
      'Absence of an attached observation is not a clean record.',
      'A source event is not current license status unless that source proves it.',
    ],
    traceability: 'Trace This Record',
    score: null,
    recommendation: null,
    trustRating: null,
    enforcementScore: null,
    complaintScore: null,
  };
}
