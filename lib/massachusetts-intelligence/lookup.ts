import companiesJson from './accepted-companies.json';
import actionsJson from './accepted-actions.json';

export type MaDesignationCode = '6G' | '6E' | '6B' | 'ESL' | 'DOM_LIFE' | 'DOM_PC' | '4';

export interface MaCompanyIdentity {
  naic: string;
  name: string;
  other_names?: string[];
  types: string[];
  designations: MaDesignationCode[];
  city: string | null;
  address_state: string | null;
  in_national_identity_index: boolean;
}

export interface MaNoNaicRow {
  type: string | null;
  name: string;
  city: string | null;
  address_state: string | null;
}

export interface MaAdministrativeAction {
  id: string;
  table_year: number;
  ma_license_numbers: string[];
  license_type_as_listed: string | null;
  case_or_docket_as_listed: string;
  docket_numbers: string[];
  primary_allegations_as_listed: string;
  disposition_as_listed: string;
  disposition_class: string;
  fine_restitution_as_listed: string | null;
  licensing_action_as_listed: string | null;
  effective_date: string;
  document_urls: string[];
}

const companies = companiesJson as unknown as {
  source_as_of: string;
  designation_codes: Record<MaDesignationCode, string>;
  identities: MaCompanyIdentity[];
  no_naic_rows: MaNoNaicRow[];
};
const actions = (actionsJson as unknown as { rows: MaAdministrativeAction[] }).rows;

const BY_NAIC = new Map(companies.identities.map((row) => [row.naic, row]));

export const MA_DESIGNATION_LABELS = companies.designation_codes;
export const MA_COMPANY_LIST_AS_OF = companies.source_as_of;

/** Exact NAIC company code on the DOI Licensed or Approved Companies list. Never a name match. */
export function lookupMassachusettsNaic(raw: string): MaCompanyIdentity | null {
  const digits = raw.replace(/\D/g, '');
  if (!/^\d{3,5}$/.test(digits)) return null;
  return BY_NAIC.get(digits.padStart(5, '0')) ?? null;
}

export function massachusettsCompanyLabel(row: MaCompanyIdentity): string {
  const designations = row.designations.map((code) => MA_DESIGNATION_LABELS[code]);
  return `${row.name} (NAIC ${row.naic}; ${row.types.join(' + ')}${designations.length ? `; ${designations.join(', ')}` : ''})`;
}

const NOISE = new Set([
  'massachusetts', 'mass', 'ma', 'doi', 'insurer', 'insurers', 'insurance', 'company', 'companies', 'co', 'licensed',
  'approved', 'list', 'the', 'of', 'in', 'a', 'an', 'and', 'for', 'is', 'on', 'find', 'show', 'search', 'check', 'look',
  'up', 'lookup', 'naic', 'carrier', 'carriers', 'legal', 'what', 'which', 'who', 'near', 'me', 'my', 'authorized',
  'admitted', 'active', 'current', 'currently', 'state', 'statewide', 'doing', 'business', 'with', 'are', 'by', 'to', 'from',
]);

const tokens = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9&]+/g, ' ').split(' ').filter(Boolean);

/**
 * Company-name search inside the DOI list only. Every remaining term must appear as a token of the
 * listed name. Results are DOI list rows; they are not joined to any profile, agency or producer.
 */
export function searchMassachusettsCompanyName(query: string): {
  terms: string[];
  hits: MaCompanyIdentity[];
  noNaicHits: MaNoNaicRow[];
} {
  const terms = tokens(query).filter((t) => !NOISE.has(t));
  if (!terms.length || !terms.some((t) => t.length >= 3)) return { terms, hits: [], noNaicHits: [] };
  const has = (name: string) => {
    const set = new Set(tokens(name));
    return terms.every((t) => set.has(t));
  };
  return {
    terms,
    hits: companies.identities.filter((row) => has(row.name) || (row.other_names ?? []).some(has)),
    noNaicHits: companies.no_naic_rows.filter((row) => has(row.name)),
  };
}

/** Exact Massachusetts license number printed on a DOI administrative-action row. Not license status. */
export function lookupMassachusettsLicenseActions(raw: string): MaAdministrativeAction[] {
  const digits = raw.replace(/\D/g, '');
  if (!/^\d{5,9}$/.test(digits)) return [];
  return actions.filter((row) => row.ma_license_numbers.includes(digits));
}

export function massachusettsActionSummary(row: MaAdministrativeAction): string {
  const pieces = [
    `effective ${row.effective_date}`,
    row.disposition_as_listed ? `disposition as listed: ${row.disposition_as_listed}` : 'disposition not stated',
    `primary allegation(s) as listed: ${row.primary_allegations_as_listed || 'not stated'}`,
  ];
  if (row.licensing_action_as_listed) pieces.push(`licensing action as listed: ${row.licensing_action_as_listed}`);
  if (row.fine_restitution_as_listed) pieces.push(`fine/restitution as listed: ${row.fine_restitution_as_listed}`);
  return pieces.join('; ');
}
