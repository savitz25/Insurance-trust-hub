import companiesJson from './accepted-companies.json';
import eventsJson from './accepted-events.json';

export interface TnListing {
  type: string;
  status: string;
  status_date_as_published: string | null;
  status_date: string | null;
}

export interface TnCompanyIdentity {
  naic: string;
  name: string;
  other_names?: string[];
  listings: TnListing[];
  domicile: string;
  mailing_state: string | null;
  in_national_identity_index: boolean;
}

export interface TnPlaceholderRow {
  name: string;
  naic_as_published: string;
  type: string;
  status: string;
  domicile: string | null;
}

export interface TnActivityEvent {
  section: string;
  values: Record<string, string>;
  naic: string[];
  other_identifiers: string[];
  new_since_last_update: boolean;
}

const companies = companiesJson as unknown as {
  source_as_of: string;
  identities: TnCompanyIdentity[];
  placeholder_naic_rows: TnPlaceholderRow[];
};
const events = (eventsJson as unknown as { events: TnActivityEvent[] }).events;

const BY_NAIC = new Map(companies.identities.map((row) => [row.naic, row]));

export const TN_COMPANY_LIST_AS_OF = companies.source_as_of;

export const TN_EVENT_SECTION_LABELS: Record<string, string> = {
  admissions_recognitions: 'Admissions / Recognitions',
  mergers: 'Mergers',
  name_changes: 'Name Changes',
  redomestications: 'Redomestications',
  surrenders_revocations: 'Surrenders and Revocations',
  suspensions: 'Suspensions',
  miscellaneous: 'Miscellaneous',
};

/** Exact NAIC company code on the TDCI List of Licensed Insurance Companies. Never a name match. */
export function lookupTennesseeNaic(raw: string): TnCompanyIdentity | null {
  const digits = raw.replace(/\D/g, '');
  if (!/^\d{3,5}$/.test(digits)) return null;
  const naic = digits.padStart(5, '0');
  if (naic === '99999') return null; // placeholder printed for many alien reinsurers, not an identity
  return BY_NAIC.get(naic) ?? null;
}

/** TDCI monthly company-activity events that print this exact NAIC code. */
export function tennesseeEventsForNaic(raw: string): TnActivityEvent[] {
  const naic = raw.replace(/\D/g, '').padStart(5, '0');
  if (naic === '99999') return [];
  return events.filter((event) => event.naic.includes(naic));
}

export function tennesseeListingLabel(row: TnCompanyIdentity): string {
  const listings = row.listings
    .map((l) => `${l.type} — ${l.status}${l.status_date ? ` (status date ${l.status_date})` : ''}`)
    .join(' + ');
  return `${row.name} (NAIC ${row.naic}; ${listings}; domicile ${row.domicile})`;
}

export function tennesseeEventLabel(event: TnActivityEvent): string {
  const v = event.values;
  let what = v.Action ?? v['License Type'] ?? '';
  if (v['New Company Name']) what = `${v['Prior Company Name']} renamed ${v['New Company Name']}`;
  if (v['Prior Domicile']) what = `domicile ${v['Prior Domicile']} to ${v['New Domicile']}`;
  if (v['Surviving Company']) what = `${v['Non-Surviving Company']} merged into ${v['Surviving Company']}`;
  return `${TN_EVENT_SECTION_LABELS[event.section]}${what ? `: ${what}` : ''}${v.Date ? `, ${v.Date}` : ''}`;
}

const NOISE = new Set([
  'tennessee', 'tenn', 'tn', 'tdci', 'insurer', 'insurers', 'insurance', 'company', 'companies', 'co', 'licensed', 'list',
  'the', 'of', 'in', 'a', 'an', 'and', 'for', 'is', 'on', 'find', 'show', 'search', 'check', 'look', 'up', 'lookup', 'naic',
  'carrier', 'carriers', 'legal', 'what', 'which', 'who', 'near', 'me', 'my', 'authorized', 'admitted', 'active', 'current',
  'currently', 'state', 'statewide', 'doing', 'business', 'with', 'are', 'by', 'to', 'from', 'status',
]);

const tokens = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9&]+/g, ' ').split(' ').filter(Boolean);

/**
 * Company-name search inside the TDCI list only. Every remaining term must appear as a token of the
 * listed name. Results are TDCI list rows; they are not joined to any profile, agency or producer.
 */
export function searchTennesseeCompanyName(query: string): {
  terms: string[];
  hits: TnCompanyIdentity[];
  placeholderHits: TnPlaceholderRow[];
} {
  const terms = tokens(query).filter((t) => !NOISE.has(t));
  if (!terms.length || !terms.some((t) => t.length >= 3)) return { terms, hits: [], placeholderHits: [] };
  const has = (name: string) => {
    const set = new Set(tokens(name));
    return terms.every((t) => set.has(t));
  };
  return {
    terms,
    hits: companies.identities.filter((row) => has(row.name) || (row.other_names ?? []).some(has)),
    placeholderHits: companies.placeholder_naic_rows.filter((row) => has(row.name)),
  };
}
