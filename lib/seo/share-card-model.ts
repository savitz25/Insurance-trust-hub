/**
 * SHARE-003 — Insurance share-card models (no I/O).
 * No CMS endorsement, no personalized plan results, no unpublished listing fields.
 */

export type InsuranceShareCardKind = 'fallback' | 'entity' | 'content';

export type InsuranceShareCardModel = {
  kind: InsuranceShareCardKind;
  eyebrow: string;
  title: string;
  subtitle?: string;
  fact?: string;
};

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

export function truncateShareText(value: string, maxChars: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function displayStateName(codeOrName?: string | null): string {
  const raw = (codeOrName || '').trim();
  if (!raw) return '';
  if (raw.length === 2) return US_STATE_NAMES[raw.toUpperCase()] || raw.toUpperCase();
  return raw;
}

export function insuranceCarrierShareModel(name: string): InsuranceShareCardModel {
  return {
    kind: 'entity',
    eyebrow: 'INSURANCE COMPANY RESEARCH',
    title: truncateShareText(name || '', 48) || 'Carrier profile',
    fact: 'Coverage · company information · public research',
  };
}

export function insuranceProviderShareModel(input: {
  name: string;
  city?: string | null;
  state?: string | null;
}): InsuranceShareCardModel {
  const city = (input.city || '').trim();
  const state = displayStateName(input.state);
  const location = [city, state].filter(Boolean).join(', ');
  return {
    kind: 'entity',
    eyebrow: 'INSURANCE AGENCY RESEARCH',
    title: truncateShareText(input.name || '', 48) || 'Agency profile',
    subtitle: location ? truncateShareText(location, 52) : undefined,
    fact: 'Licensing · company research',
  };
}

export function insurancePlaceShareModel(input: {
  placeName: string;
  stateName?: string | null;
}): InsuranceShareCardModel {
  const state = truncateShareText((input.stateName || '').toUpperCase(), 28);
  return {
    kind: 'content',
    eyebrow: state ? `${state} INSURANCE RESEARCH` : 'INSURANCE RESEARCH',
    title: truncateShareText(input.placeName || 'Local insurance research', 46),
    fact: 'Coverage · local research · public records',
  };
}

export function insuranceGuideShareModel(input: {
  title: string;
  locationLabel?: string | null;
}): InsuranceShareCardModel {
  return {
    kind: 'content',
    eyebrow: truncateShareText((input.locationLabel || 'CONSUMER RESEARCH GUIDE').toUpperCase(), 40),
    title: truncateShareText(input.title || 'Insurance research guide', 52),
    fact: 'Independent research · not a marketplace',
  };
}
