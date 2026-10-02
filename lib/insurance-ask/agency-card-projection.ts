/**
 * Read-only projection for an agency Ask card.
 * A provider profile is attached only through a bridge that is already
 * CONFIRMED, match_method exact_npn, and for this agency entity.
 * Name, address, and phone never qualify a bridge.
 */

export const BRIDGES_PER_ENTITY = 4;
export const ACTIVE_CREDENTIALS_PER_ENTITY = 3;
export const OTHER_CREDENTIALS_PER_ENTITY = 8;
export const UNKNOWN_CREDENTIALS_PER_ENTITY = 2;
export const PUBLIC_CONTACTS_PER_ENTITY = 8;
export const DISPLAY_CREDENTIAL_CAP = 3;

export type BridgeRow = {
  provider_id: string;
  entity_id: string;
  confidence: string;
  match_method: string;
};

export type ProviderSlugRow = { id: string; slug: string | null };

export type ContactRow = {
  entity_id: string;
  contact_kind: string;
  value: string | null;
  public_eligible: boolean;
};

export type CredentialRow = {
  entity_id?: string;
  jurisdiction: string;
  regulatory_status: string;
  license_number: string | null;
  license_class: string | null;
  source_dataset?: string | null;
  source_observed_at?: string | null;
};

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const GENERIC_CLASS = /^(agency license|agency|unknown|n\/a|na|none)$/i;
const SERIOUS_STATUS = new Set(['suspended', 'revoked', 'cancelled', 'canceled']);

export function isCertifiedExactNpnBridge(row: BridgeRow, entityId: string): boolean {
  return Boolean(row.provider_id)
    && row.entity_id === entityId
    && row.confidence === 'CONFIRMED'
    && row.match_method === 'exact_npn';
}

export function providerProfileHref(slug: string | null | undefined): string | null {
  if (typeof slug !== 'string') return null;
  const trimmed = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) return null;
  return `/providers/${trimmed}`;
}

function statusKey(status: string | null | undefined): string {
  return (status ?? '').trim().toLowerCase();
}

function credentialRank(row: CredentialRow): number {
  const status = statusKey(row.regulatory_status);
  if (status === 'active') return 0;
  if (status !== 'unknown' && status !== '') return 1;
  if (usefulClass(row.license_class)) return 1;
  return 2;
}

function usefulClass(licenseClass: string | null | undefined): string | null {
  const value = (licenseClass ?? '').trim();
  if (!value || GENERIC_CLASS.test(value)) return null;
  return value;
}

function displayClass(value: string): string {
  if (/[a-z]/.test(value)) return value.trim();
  return value.trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

function stateLabel(jurisdiction: string): string {
  const code = jurisdiction.trim().toUpperCase();
  return STATE_NAMES[code] ?? jurisdiction.trim();
}

function titleStatus(status: string): string {
  const key = statusKey(status);
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function credentialFactLine(row: CredentialRow): string {
  const state = stateLabel(row.jurisdiction);
  const status = statusKey(row.regulatory_status);
  const named = usefulClass(row.license_class);
  const classText = named ? displayClass(named) : null;
  if (status === 'active' && classText) return `${state} ${classText}: Active`;
  if (status === 'active') return `${state} credential: Active`;
  if (SERIOUS_STATUS.has(status) && classText) return `${state} ${classText}: ${titleStatus(status)}`;
  if (SERIOUS_STATUS.has(status)) return `${state} agency credential: ${titleStatus(status)}`;
  if (classText) return `${state} ${classText}`;
  return `${state} agency credential`;
}

export function selectDisplayCredentials(rows: CredentialRow[], cap = DISPLAY_CREDENTIAL_CAP): CredentialRow[] {
  const seen = new Set<string>();
  const unique: CredentialRow[] = [];
  for (const row of rows) {
    const jurisdiction = row.jurisdiction?.trim();
    if (!jurisdiction) continue;
    const key = `${jurisdiction.toUpperCase()}|${(row.license_class ?? '').trim().toLowerCase()}|${statusKey(row.regulatory_status)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  unique.sort((a, b) => {
    const rank = credentialRank(a) - credentialRank(b);
    if (rank) return rank;
    const jurisdiction = a.jurisdiction.localeCompare(b.jurisdiction);
    if (jurisdiction) return jurisdiction;
    return (a.license_class ?? '').localeCompare(b.license_class ?? '');
  });
  return unique.slice(0, cap);
}

function titlePlace(value: string): string {
  return value.split(/\s+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/** City and state recorded on a public address. Not a service area. */
export function recordedPlaceLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  for (let i = 1; i < parts.length; i += 1) {
    const code = parts[i]!.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/)?.[1]?.toUpperCase();
    if (!code || !STATE_NAMES[code]) continue;
    const city = titlePlace(parts[i - 1]!);
    if (!city || /^\d/.test(city)) continue;
    return `${city}, ${code}`;
  }
  return null;
}

export function displayPhone(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.length === 10 ? digits : '';
  if (!local) return trimmed;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export function displayEmail(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed || /\s/.test(trimmed) || !trimmed.includes('@')) return null;
  return trimmed;
}

function publicValues(contacts: ContactRow[], entityId: string, kind: string): string[] {
  return contacts
    .filter((row) => row.entity_id === entityId && row.contact_kind === kind && row.public_eligible === true)
    .map((row) => (row.value ?? '').trim())
    .filter(Boolean)
    .sort();
}

export type CertifiedAgencyProjection = {
  href: string | null;
  recordedPlace: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  credentialFacts: string[];
  primary: CredentialRow | null;
};

export function projectCertifiedAgency(input: {
  entityId: string;
  bridges: BridgeRow[];
  providers: ProviderSlugRow[];
  credentials: CredentialRow[];
  contacts: ContactRow[];
}): CertifiedAgencyProjection | null {
  const bridges = input.bridges.filter((row) => isCertifiedExactNpnBridge(row, input.entityId));
  if (!bridges.length) return null;
  const providerIds = new Set(bridges.map((row) => row.provider_id));
  const hrefs = [...providerIds].sort().map((id) => providerProfileHref(input.providers.find((row) => row.id === id)?.slug));
  const credentials = selectDisplayCredentials(input.credentials.filter((row) => !row.entity_id || row.entity_id === input.entityId));
  const physical = publicValues(input.contacts, input.entityId, 'physical_address');
  const mailing = publicValues(input.contacts, input.entityId, 'mailing_address');
  const place = [...physical, ...mailing].map(recordedPlaceLabel).find((label) => label) ?? null;
  return {
    href: hrefs.find((href) => href) ?? null,
    recordedPlace: place,
    publicPhone: displayPhone(publicValues(input.contacts, input.entityId, 'phone')[0]),
    publicEmail: displayEmail(publicValues(input.contacts, input.entityId, 'email')[0]),
    credentialFacts: credentials.map(credentialFactLine),
    primary: credentials[0] ?? null,
  };
}
