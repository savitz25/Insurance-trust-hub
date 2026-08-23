import { US_STATES } from '@/lib/constants';

const STATE_CODES = new Set(US_STATES.map((s) => s.code));
const STATE_NAMES = new Map(
  US_STATES.map((s) => [s.name.toLowerCase(), s.code] as const)
);

const INVALID_CITY_TOKENS = new Set([
  ...US_STATES.map((s) => s.name.toLowerCase()),
  ...US_STATES.map((s) => s.code.toLowerCase()),
  'united states',
  'usa',
  'n/a',
  'none',
  'unknown',
]);

export function normalizeStateCode(
  raw: string | null | undefined
): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  const upper = s.toUpperCase();
  if (STATE_CODES.has(upper as (typeof US_STATES)[number]['code'])) {
    return upper;
  }
  const fromName = STATE_NAMES.get(s.toLowerCase());
  return fromName ?? null;
}

export function isValidStateCode(code: string | null | undefined): boolean {
  return Boolean(normalizeStateCode(code));
}

export function normalizeCity(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (INVALID_CITY_TOKENS.has(s.toLowerCase())) return null;
  if (/^[A-Z]{2}$/.test(s)) return null;
  return s;
}

export function uniqueSortedStates(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const code = normalizeStateCode(v);
    if (code) set.add(code);
  }
  return Array.from(set).sort();
}

/**
 * Physical location from address / cities only.
 * Never copies states_licensed into physical_state.
 */
export function extractPhysicalLocation(input: {
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  county?: string | null;
  cities?: string[] | null;
}): {
  city: string | null;
  state: string | null;
  postal_code: string | null;
  county: string | null;
  country: 'US';
} {
  const city =
    normalizeCity(input.addressCity) ||
    normalizeCity(input.cities?.[0] ?? null);
  const state = normalizeStateCode(input.addressState);
  const postal = (input.addressZip || '').trim() || null;
  const county = (input.county || '').trim() || null;
  return {
    city,
    state,
    postal_code: postal,
    county,
    country: 'US',
  };
}

export function extractLicensedStates(input: {
  statesLicensed?: string[] | null;
  licenseState?: string | null;
}): { states: string[]; license_state: string | null } {
  const license_state = normalizeStateCode(input.licenseState);
  const states = uniqueSortedStates([
    ...(input.statesLicensed ?? []),
    license_state,
  ]);
  return { states, license_state };
}
