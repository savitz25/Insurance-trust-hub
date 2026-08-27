/**
 * MA-INS-000 — Massachusetts DOI regulatory extract adapter.
 * PERSON/AGENCY candidates + MA credentials + official LOAs + contacts.
 * NPN is the only CONFIRMED identity key. Name/address/email are never merge keys.
 * License class ≠ LOA. Domicile ≠ Massachusetts authorization. No WORKS_FOR.
 */

import { createHash } from 'crypto';
import { normalizeNpn } from './npn';
import { mapSourceStatus } from './freshness';
import { sourceFieldRole } from './loa';
import {
  normalizeEmail,
  parsePhone,
  normalizeAddressValue,
} from './contact-normalize';
import { mayPublishEntityKind, PUBLIC_PERSON_PROFILES_ENABLED } from './publication';
import type { IdentityConfidence, NationalEntityKind, RegulatoryStatus } from './types';

export const MA_DOI_REGULATORY_SOURCE = {
  regulator: 'Massachusetts Division of Insurance',
  jurisdiction: 'MA',
  sourceDataset: 'massachusetts_doi_regulatory',
  sourceTable: 'ma_doi_regulatory_csv',
  publicLists: 'https://www.mass.gov/lists/massachusetts-licensed-individuals-and-business-entities',
  sbsLookup: 'https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=MA',
  citation: 'Massachusetts Division of Insurance producer/business-entity licensing extract',
} as const;

export const MA_DOI_REGULATORY_HEADERS = [
  'LAST_NAME_OR_BUSINESS_NAME',
  'NPN',
  'PHONE1',
  'BUSINESS_EMAIL',
  'DOMICILE_STATE',
  'LICENSE_NO',
  'LICENSE_STATUS',
  'LICENSE_CLASS',
  'LICENSE_FIRST_ACTIVE_DATE',
  'LICENSE_EXPIRATION_DATE',
  'LOA_NAME',
  'BUS_ADDRESS1',
  'BUS_ADDRESS2',
  'BUS_ADDRESS3',
  'BUSINESS_CITY',
  'BUSINESS_STATE_ABBR',
  'BUSINESS_ZIP_EXCEL',
] as const;

const FIRM_TOKEN =
  /\b(LLC|L\.L\.C|INC\.?|INCORPORATED|CORP\.?|CORPORATION|LTD\.?|AGENCY|INSURANCE|BROKER|COMPANY|LLP|P\.?C\.?|PLC|ASSOCIATES|GROUP|SERVICES|PARTNERS|HOLDINGS|CO\.|PC|TRUST|BANK|CREDIT UNION)\b/i;

const PERSON_COMMA = /^[A-Z][A-Z' -]+,\s+[A-Z]/i;
const US_STATES: Record<string, string> = {
  ALABAMA: 'AL', ALASKA: 'AK', ARIZONA: 'AZ', ARKANSAS: 'AR', CALIFORNIA: 'CA',
  COLORADO: 'CO', CONNECTICUT: 'CT', DELAWARE: 'DE', FLORIDA: 'FL', GEORGIA: 'GA',
  HAWAII: 'HI', IDAHO: 'ID', ILLINOIS: 'IL', INDIANA: 'IN', IOWA: 'IA', KANSAS: 'KS',
  KENTUCKY: 'KY', LOUISIANA: 'LA', MAINE: 'ME', MARYLAND: 'MD', MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI', MINNESOTA: 'MN', MISSISSIPPI: 'MS', MISSOURI: 'MO', MONTANA: 'MT',
  NEBRASKA: 'NE', NEVADA: 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND',
  OHIO: 'OH', OKLAHOMA: 'OK', OREGON: 'OR', PENNSYLVANIA: 'PA', 'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', TENNESSEE: 'TN', TEXAS: 'TX',
  UTAH: 'UT', VERMONT: 'VT', VIRGINIA: 'VA', WASHINGTON: 'WA', 'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI', WYOMING: 'WY', 'DISTRICT OF COLUMBIA': 'DC', 'PUERTO RICO': 'PR',
};

export function detectMaDoiRegulatoryHeaders(headers: string[]): boolean {
  const h = headers.map((x) => x.replace(/^\uFEFF/, '').trim().toUpperCase());
  return (
    h.includes('LAST_NAME_OR_BUSINESS_NAME') &&
    h.includes('NPN') &&
    h.includes('LICENSE_NO') &&
    h.includes('LOA_NAME')
  );
}

export function parseMaCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export function cleanMaCell(raw: string | undefined | null): string {
  if (raw == null) return '';
  let s = String(raw).replace(/^\uFEFF/, '').replace(/\t/g, '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\s+/g, ' ');
}

export function parseMaDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
}

export function normalizeMaZip(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

export function normalizeDomicileState(raw: string): string | null {
  const s = cleanMaCell(raw).toUpperCase();
  if (!s) return null;
  if (/^[A-Z]{2}$/.test(s)) return s;
  return US_STATES[s] ?? null;
}

export function splitMaLoas(raw: string): string[] {
  const s = cleanMaCell(raw);
  if (!s) return [];
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function licenseClassIsLoa(): false {
  return false;
}

export function loaIsAppointment(): false {
  return false;
}

export function domicileIsLicenseState(): false {
  return false;
}

export function nameIsIdentityKey(): false {
  return false;
}

export function emailIsIdentityKey(): false {
  return false;
}

export function addressIsIdentityKey(): false {
  return false;
}

export function appointmentBecomesWorksFor(): false {
  return false;
}

export function maIndividualsArePublic(): false {
  void PUBLIC_PERSON_PROFILES_ENABLED;
  void mayPublishEntityKind;
  return false;
}

export type MaEntityTypeDecision =
  | { type: 'CONFIRMED_BUSINESS'; reason: string }
  | { type: 'CONFIRMED_PERSON'; reason: string }
  | { type: 'REVIEW_REQUIRED_ENTITY_TYPE'; hint: 'business_candidate' | 'person_candidate' | 'mixed'; reason: string }
  | { type: 'UNRESOLVED'; reason: string };

export function decideMaEntityType(input: {
  name: string;
  officialEntityType?: string | null;
  licenseClass?: string | null;
}): MaEntityTypeDecision {
  const official = cleanMaCell(input.officialEntityType || '');
  if (/^(business|firm|agency|organization|company|entity)$/i.test(official)) {
    return { type: 'CONFIRMED_BUSINESS', reason: 'official_entity_type' };
  }
  if (/^(individual|person)$/i.test(official)) {
    return { type: 'CONFIRMED_PERSON', reason: 'official_entity_type' };
  }
  const name = cleanMaCell(input.name);
  if (!name) return { type: 'UNRESOLVED', reason: 'missing_name' };
  const firm = FIRM_TOKEN.test(name);
  const personish = PERSON_COMMA.test(name) || (!firm && /^[A-Za-z][A-Za-z'.-]+(?:\s+[A-Za-z][A-Za-z'.-]+){1,3}$/.test(name));
  if (firm && personish) {
    return {
      type: 'REVIEW_REQUIRED_ENTITY_TYPE',
      hint: 'mixed',
      reason: 'firm_token_and_person_pattern',
    };
  }
  if (firm) {
    return {
      type: 'REVIEW_REQUIRED_ENTITY_TYPE',
      hint: 'business_candidate',
      reason: 'name_firm_token_no_official_type',
    };
  }
  if (personish) {
    return {
      type: 'REVIEW_REQUIRED_ENTITY_TYPE',
      hint: 'person_candidate',
      reason: 'person_like_name_no_official_type',
    };
  }
  return { type: 'UNRESOLVED', reason: 'name_unclassified' };
}

export function maLicenseStatusFromSource(input: {
  statusRaw: string;
  expirationDate?: string | null;
  now?: Date;
}): { statusRaw: string; normalized: RegulatoryStatus; usedExpirationAlone: false } {
  const statusRaw = cleanMaCell(input.statusRaw);
  return {
    statusRaw,
    normalized: mapSourceStatus(statusRaw),
    usedExpirationAlone: false,
  };
}

export function maCredentialSourceRecordId(input: {
  npn: string | null;
  licenseNo: string;
  licenseClass: string;
}): string {
  return [input.npn || '', input.licenseNo, input.licenseClass.toUpperCase()].join('|');
}

export function maLoaSourceRecordId(input: {
  licenseNo: string;
  loa: string;
}): string {
  return `${input.licenseNo}|${input.loa.trim().toUpperCase()}`;
}

export type MaIdentityDecision =
  | { action: 'attach'; confidence: 'CONFIRMED'; path: 'exact_npn'; entityKind: NationalEntityKind; npn: string }
  | { action: 'net_new'; confidence: 'UNRESOLVED'; path: 'net_new_candidate'; npn: string | null; reason: string }
  | { action: 'skip'; confidence: 'REVIEW_REQUIRED'; reason: string }
  | { action: 'skip'; confidence: 'UNRESOLVED'; reason: string };

export function decideMaIdentityJoin(input: {
  npn: string | null;
  personByNpn: Set<string>;
  agencyByNpn: Set<string>;
  carrierByNpn?: Set<string>;
}): MaIdentityDecision {
  const npn = input.npn;
  if (!npn) {
    return { action: 'skip', confidence: 'UNRESOLVED', reason: 'missing_or_invalid_npn' };
  }
  const person = input.personByNpn.has(npn);
  const agency = input.agencyByNpn.has(npn);
  const carrier = input.carrierByNpn?.has(npn) ?? false;
  const hits = Number(person) + Number(agency) + Number(carrier);
  if (hits >= 2) {
    return { action: 'skip', confidence: 'REVIEW_REQUIRED', reason: 'npn_kind_conflict' };
  }
  if (person) {
    return { action: 'attach', confidence: 'CONFIRMED', path: 'exact_npn', entityKind: 'person', npn };
  }
  if (agency) {
    return { action: 'attach', confidence: 'CONFIRMED', path: 'exact_npn', entityKind: 'agency', npn };
  }
  if (carrier) {
    return { action: 'skip', confidence: 'REVIEW_REQUIRED', reason: 'npn_owned_by_carrier' };
  }
  return {
    action: 'net_new',
    confidence: 'UNRESOLVED',
    path: 'net_new_candidate',
    npn,
    reason: 'npn_not_in_graph',
  };
}

export function nameCannotOverrideNpn(): true {
  return true;
}

export const MA_INS_001_GATES = {
  sourceSha256: 'B5DBEB1DCA9B0AF88FBC041927AFF6FCD150508B9995B19BF418B25476BE48BD',
  semanticFingerprint: 'c42e7fb2252dcd835641bb274e6baed0b491dc571e811936c0be9f6b70135c40',
  sourceRows: 9151,
  distinctNpn: 9148,
  confirmedAgencyNpn: 7059,
  heldNetNewNpn: 2089,
  licenseLoaRelationships: 25918,
} as const;

export function ma001IsConfirmedAgency(join: MaIdentityDecision): boolean {
  return (
    join.action === 'attach' &&
    join.confidence === 'CONFIRMED' &&
    join.entityKind === 'agency'
  );
}

export function ma001EntityInsertsPredicted(): 0 {
  return 0;
}

export function ma001WorksForInsertsPredicted(): 0 {
  return 0;
}

export function identityUsesEmailPhoneAddressName(): false {
  return false;
}

export function maRowGrain(): 'LICENSE_PLUS_LOA_SET' {
  return 'LICENSE_PLUS_LOA_SET';
}

export function publicationClassForMa(input: {
  join: MaIdentityDecision;
  entityType: MaEntityTypeDecision;
}): 'READY_FOR_GRAPH' | 'INTERNAL_ONLY' | 'REVIEW_REQUIRED' | 'NOT_READY' {
  if (input.join.confidence === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (input.join.action === 'attach' && input.join.confidence === 'CONFIRMED') {
    if (input.join.entityKind === 'person') return 'INTERNAL_ONLY';
    return 'READY_FOR_GRAPH';
  }
  if (input.entityType.type === 'REVIEW_REQUIRED_ENTITY_TYPE') return 'REVIEW_REQUIRED';
  if (input.join.action === 'net_new') return 'REVIEW_REQUIRED';
  return 'NOT_READY';
}

export type MaParsedRow = {
  sourceRow: number;
  name: string;
  npnRaw: string;
  npn: string | null;
  phoneRaw: string;
  emailRaw: string;
  domicileRaw: string;
  domicile: string | null;
  licenseNo: string;
  licenseStatusRaw: string;
  licenseStatus: RegulatoryStatus;
  licenseClass: string;
  firstActive: string | null;
  expiration: string | null;
  loaRaw: string;
  loas: string[];
  address1: string;
  address2: string;
  address3: string;
  city: string;
  busState: string;
  zipRaw: string;
  zip: string | null;
  entityType: MaEntityTypeDecision;
  fingerprint: string;
};

export function parseMaRegulatoryRecord(
  rec: Record<string, string>,
  sourceRow: number
): MaParsedRow {
  const name = cleanMaCell(rec.LAST_NAME_OR_BUSINESS_NAME);
  const npnRaw = cleanMaCell(rec.NPN);
  const npn = normalizeNpn(npnRaw);
  const status = maLicenseStatusFromSource({
    statusRaw: rec.LICENSE_STATUS || '',
    expirationDate: parseMaDate(cleanMaCell(rec.LICENSE_EXPIRATION_DATE)),
  });
  const licenseNo = cleanMaCell(rec.LICENSE_NO);
  const licenseClass = cleanMaCell(rec.LICENSE_CLASS);
  const loaRaw = cleanMaCell(rec.LOA_NAME);
  const row: MaParsedRow = {
    sourceRow,
    name,
    npnRaw,
    npn,
    phoneRaw: cleanMaCell(rec.PHONE1),
    emailRaw: cleanMaCell(rec.BUSINESS_EMAIL),
    domicileRaw: cleanMaCell(rec.DOMICILE_STATE),
    domicile: normalizeDomicileState(rec.DOMICILE_STATE || ''),
    licenseNo,
    licenseStatusRaw: status.statusRaw,
    licenseStatus: status.normalized,
    licenseClass,
    firstActive: parseMaDate(cleanMaCell(rec.LICENSE_FIRST_ACTIVE_DATE)),
    expiration: parseMaDate(cleanMaCell(rec.LICENSE_EXPIRATION_DATE)),
    loaRaw,
    loas: splitMaLoas(loaRaw),
    address1: cleanMaCell(rec.BUS_ADDRESS1),
    address2: cleanMaCell(rec.BUS_ADDRESS2),
    address3: cleanMaCell(rec.BUS_ADDRESS3),
    city: cleanMaCell(rec.BUSINESS_CITY),
    busState: cleanMaCell(rec.BUSINESS_STATE_ABBR).toUpperCase(),
    zipRaw: cleanMaCell(rec.BUSINESS_ZIP_EXCEL),
    zip: normalizeMaZip(rec.BUSINESS_ZIP_EXCEL || ''),
    entityType: decideMaEntityType({ name, licenseClass }),
    fingerprint: '',
  };
  row.fingerprint = createHash('sha256')
    .update(
      [
        row.npn || '',
        row.licenseNo,
        row.licenseClass,
        row.loas.join('|'),
        row.licenseStatusRaw,
        row.firstActive || '',
        row.expiration || '',
      ].join('\n')
    )
    .digest('hex');
  return row;
}

export function maContactObservations(row: MaParsedRow): Array<{
  kind: 'email' | 'phone' | 'physical_address';
  value: string;
  label: string;
  raw: string;
}> {
  const out: Array<{
    kind: 'email' | 'phone' | 'physical_address';
    value: string;
    label: string;
    raw: string;
  }> = [];
  const email = normalizeEmail(row.emailRaw);
  if (email) {
    out.push({
      kind: 'email',
      value: email,
      label: `raw=${row.emailRaw};source_class=OFFICIAL_REGULATOR;addr_note=business_email_reported_to_ma_doi`,
      raw: row.emailRaw,
    });
  }
  const phone = parsePhone(row.phoneRaw);
  if (phone) {
    out.push({
      kind: 'phone',
      value: phone.e164,
      label: `raw=${row.phoneRaw};source_class=OFFICIAL_REGULATOR`,
      raw: row.phoneRaw,
    });
  }
  const addr = normalizeAddressValue({
    street: [row.address1, row.address2, row.address3].filter(Boolean).join(' '),
    city: row.city,
    state: row.busState,
    zip: row.zip,
  });
  if (addr) {
    out.push({
      kind: 'physical_address',
      value: addr,
      label: `raw=${[row.address1, row.city, row.busState, row.zipRaw].filter(Boolean).join(', ')};addr_class=unknown;note=business_address_reported_to_massachusetts_regulator`,
      raw: row.address1,
    });
  }
  return out;
}

export function maFieldRoles() {
  return {
    licenseClass: sourceFieldRole({
      jurisdiction: 'MA',
      sourceDataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      field: 'license_class',
    }),
    loaName: sourceFieldRole({
      jurisdiction: 'MA',
      sourceDataset: MA_DOI_REGULATORY_SOURCE.sourceDataset,
      field: 'loa_name',
    }),
  };
}

export function fingerprintLines(lines: string[]): string {
  return createHash('sha256').update(lines.slice().sort().join('\n')).digest('hex');
}

void licenseClassIsLoa;
void loaIsAppointment;
void domicileIsLicenseState;
void nameIsIdentityKey;
void emailIsIdentityKey;
void addressIsIdentityKey;
void appointmentBecomesWorksFor;
void maIndividualsArePublic;
void nameCannotOverrideNpn;
