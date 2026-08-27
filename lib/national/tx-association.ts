/**
 * Texas TDI kvqi-vsrr non-appointment business relationships.
 * Exact NPN only. Default label ASSOCIATED_WITH.
 * FIN531 / TDI open-data language is "associated with a licensed insurance agency"
 * and Designated Responsible Licensed Producer — not employment proof.
 * Employee association_type is preserved in raw metadata, never promoted to WORKS_FOR.
 */

import { normalizeNpn } from './npn';

export const TX_ASSOCIATION_SOURCE = {
  id: 'kvqi-vsrr',
  sourceDataset: 'texas_tdi_associations',
  url: 'https://data.texas.gov/dataset/Business-relationships-between-agents-agencies-adj/kvqi-vsrr',
  csv: 'https://data.texas.gov/api/views/kvqi-vsrr/rows.csv?accessType=DOWNLOAD',
  regulator: 'Texas Department of Insurance',
  /** Socrata rowsUpdatedAt unix from live view JSON (not ingest time). */
  rowsUpdatedAtUnix: 1787728376,
} as const;

export const TX_INDIVIDUAL_SOURCE = {
  id: 'kxv3-diwf',
  sourceDataset: 'texas_tdi_individual',
  url: 'https://data.texas.gov/dataset/Insurance-agents-adjusters-and-people-approved-to-/kxv3-diwf',
  csv: 'https://data.texas.gov/api/views/kxv3-diwf/rows.csv?accessType=DOWNLOAD',
  regulator: 'Texas Department of Insurance',
  rowsUpdatedAtUnix: 1787727701,
} as const;

export const DEFAULT_PERSON_AGENCY_RELATIONSHIP = 'ASSOCIATED_WITH' as const;

export type PersonAgencyRelStatus = 'unknown' | 'historical';
export type PersonAgencyRelCurrency = 'UNKNOWN' | 'HISTORICAL';

export type AssociationAttachResult =
  | {
      action: 'relate';
      personNpn: string;
      agencyNpn: string;
      relationshipType: typeof DEFAULT_PERSON_AGENCY_RELATIONSHIP;
      status: PersonAgencyRelStatus;
      currency: PersonAgencyRelCurrency;
      effectiveDate: string | null;
      reason: 'person_licensee_agency_associated' | 'person_associated_agency_licensee';
    }
  | {
      action: 'skip';
      reason:
        | 'missing_or_invalid_npn'
        | 'missing_person_entity'
        | 'missing_agency_entity'
        | 'same_kind'
        | 'carrier_or_naic_only'
        | 'kind_conflict_npn'
        | 'self_link';
    };

/** TDI does not document WORKS_FOR. Employee type stays ASSOCIATED_WITH. */
export function associationImpliesWorksFor(_associationType?: string | null): false {
  return false;
}

export function associationJoinUsesName(): false {
  return false;
}

export function personAgencyRelationshipType(
  _associationType?: string | null
): typeof DEFAULT_PERSON_AGENCY_RELATIONSHIP {
  void _associationType;
  return DEFAULT_PERSON_AGENCY_RELATIONSHIP;
}

export function relationshipStatusFromAssociation(input: {
  beginDate?: string | null;
  endDate?: string | null;
  status?: string | null;
}): { status: PersonAgencyRelStatus; currency: PersonAgencyRelCurrency } {
  const end = String(input.endDate || '').trim();
  const statusRaw = String(input.status || '').trim().toLowerCase();
  if (end || /terminat|inactiv|expir|historical|ended/.test(statusRaw)) {
    return { status: 'historical', currency: 'HISTORICAL' };
  }
  // Begin date alone, including dates through 2021, is not proof of current employment.
  // Snapshot age is not current-status proof.
  return { status: 'unknown', currency: 'UNKNOWN' };
}

export function classifyPersonAgencyAssociation(input: {
  licenseeNpn: string | null | undefined;
  associatedLicenseeNpn: string | null | undefined;
  associatedNaicId?: string | null;
  associationType?: string | null;
  beginDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  personNpns: Set<string>;
  agencyNpns: Set<string>;
}): AssociationAttachResult {
  const licensee = normalizeNpn(input.licenseeNpn ?? null);
  const associated = normalizeNpn(input.associatedLicenseeNpn ?? null);
  const time = relationshipStatusFromAssociation({
    beginDate: input.beginDate,
    endDate: input.endDate,
    status: input.status,
  });

  if (!licensee && !associated) {
    return { action: 'skip', reason: 'missing_or_invalid_npn' };
  }

  const licPerson = licensee ? input.personNpns.has(licensee) : false;
  const licAgency = licensee ? input.agencyNpns.has(licensee) : false;
  const assocPerson = associated ? input.personNpns.has(associated) : false;
  const assocAgency = associated ? input.agencyNpns.has(associated) : false;

  if ((licensee && licPerson && licAgency) || (associated && assocPerson && assocAgency)) {
    return { action: 'skip', reason: 'kind_conflict_npn' };
  }

  if (licensee && associated && licensee === associated) {
    return { action: 'skip', reason: 'self_link' };
  }

  if (licPerson && assocAgency && licensee && associated) {
    return {
      action: 'relate',
      personNpn: licensee,
      agencyNpn: associated,
      relationshipType: personAgencyRelationshipType(input.associationType),
      status: time.status,
      currency: time.currency,
      effectiveDate: input.beginDate || null,
      reason: 'person_licensee_agency_associated',
    };
  }

  if (assocPerson && licAgency && associated && licensee) {
    return {
      action: 'relate',
      personNpn: associated,
      agencyNpn: licensee,
      relationshipType: personAgencyRelationshipType(input.associationType),
      status: time.status,
      currency: time.currency,
      effectiveDate: input.beginDate || null,
      reason: 'person_associated_agency_licensee',
    };
  }

  if ((licPerson && assocPerson) || (licAgency && assocAgency)) {
    return { action: 'skip', reason: 'same_kind' };
  }

  const naic = String(input.associatedNaicId || '').trim();
  if (naic && !assocAgency && !licAgency) {
    return { action: 'skip', reason: 'carrier_or_naic_only' };
  }

  if (licPerson || assocPerson) {
    return { action: 'skip', reason: 'missing_agency_entity' };
  }
  if (licAgency || assocAgency) {
    return { action: 'skip', reason: 'missing_person_entity' };
  }
  return { action: 'skip', reason: 'missing_or_invalid_npn' };
}

export function associationSourceRecordId(input: {
  licenseeNpn: string;
  associatedNpn: string;
  associationType: string;
  beginDate: string | null;
}): string {
  return [
    input.licenseeNpn,
    input.associatedNpn,
    String(input.associationType || '').trim().toUpperCase(),
    input.beginDate || '',
  ].join('|');
}
