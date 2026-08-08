import type { Provider } from '@/types/provider';
import type { InsuranceType, Specialty } from '@/lib/constants';

/**
 * Phase 6A — seed/demo catalog only.
 * Rows are explicitly non-verified research. Public render paths must treat
 * id prefix `fallback-` as seed (noindex, no hard Verified, no contact form).
 */

const CITIES: Record<string, string[]> = {
  FL: ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Lauderdale'],
  TX: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  CA: ['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento', 'San Jose'],
  NY: ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
  NC: ['Charlotte', 'Raleigh', 'Durham', 'Greensboro', 'Wilmington'],
  IL: ['Chicago', 'Springfield', 'Naperville', 'Rockford', 'Peoria'],
  GA: ['Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon'],
  PA: ['Philadelphia', 'Pittsburgh', 'Harrisburg', 'Allentown', 'Erie'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
  AZ: ['Phoenix', 'Scottsdale', 'Tucson', 'Mesa', 'Tempe'],
};

const AGENCY_PREFIXES = [
  'Summit', 'Heritage', 'Guardian', 'Pioneer', 'Liberty', 'Coastal', 'Premier',
  'Atlas', 'Keystone', 'Horizon', 'Evergreen', 'Crescent', 'Beacon', 'Anchor',
  'Sterling', 'Cornerstone', 'Northstar', 'Clearview', 'Bridgeport', 'Oakwood',
];

const AGENCY_SUFFIXES = [
  'Insurance Group', 'Insurance Agency', 'Insurance Partners', 'Risk Advisors',
  'Coverage Solutions', 'Insurance Services', 'Benefits Group', 'Policy Center',
];

const TYPE_SETS: InsuranceType[][] = [
  ['auto', 'homeowners', 'renters'],
  ['auto', 'homeowners', 'umbrella'],
  ['auto', 'homeowners', 'life'],
  ['auto', 'homeowners', 'medicare'],
  ['auto', 'homeowners', 'flood'],
  ['health', 'life', 'umbrella'],
  ['medicare', 'umbrella', 'auto'],
  ['auto', 'renters', 'life'],
  ['homeowners', 'flood', 'umbrella'],
  ['auto', 'homeowners', 'health'],
];

const SPECIALTY_SETS: Specialty[][] = [
  ['Relocation Experienced', 'Bundle Experts', 'Personal Lines'],
  ['Relocation Experienced', 'Commercial Lines', 'Small Business'],
  ['Captive Agent', 'Personal Lines', 'Bundle Experts'],
  ['Independent Agency', 'High-Risk Auto', 'Relocation Experienced'],
  ['Independent Agency', 'Flood & Wind', 'High-Value Property'],
  ['Medicare Specialists', 'ACA Marketplace', 'Relocation Experienced'],
  ['Independent Agency', 'Life & Annuities', 'Bundle Experts'],
  ['Independent Agency', 'Bilingual Services', 'Relocation Experienced'],
  ['Independent Agency', 'High-Value Property', 'Bundle Experts'],
  ['Independent Agency', 'Small Business', 'Commercial Lines'],
];

function buildProvider(index: number): Provider {
  const stateCodes = Object.keys(CITIES);
  const state = stateCodes[index % stateCodes.length];
  const cities = CITIES[state];
  const city = cities[index % cities.length];
  const prefix = AGENCY_PREFIXES[index % AGENCY_PREFIXES.length];
  const suffix = AGENCY_SUFFIXES[Math.floor(index / AGENCY_PREFIXES.length) % AGENCY_SUFFIXES.length];
  const name = `${prefix} ${suffix}`;
  const slug = `${prefix.toLowerCase()}-${suffix.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
  const types = TYPE_SETS[index % TYPE_SETS.length];
  const specialties = SPECIALTY_SETS[index % SPECIALTY_SETS.length];

  return {
    id: `fallback-${index + 1}`,
    slug,
    name,
    short_description: `Illustrative seed listing for ${city}, ${state} — not independently verified research. Use state DOI tools before contacting any agency.`,
    description: `${name} appears in the directory seed catalog for layout and tooling demos only. License status, ratings, and contact data are not verified public-record research.`,
    city,
    state,
    // No invented ZIP / phone / license / ratings for seed honesty
    zip: null,
    phone: null,
    website: null,
    insurance_types: types,
    specialties,
    rating: 0,
    review_count: 0,
    is_verified: false,
    license_number: null,
    years_in_business: null,
    carriers: [],
  };
}

/** 50 seed providers — never indexable research (id prefix fallback-). */
export const FALLBACK_PROVIDERS: Provider[] = Array.from({ length: 50 }, (_, i) =>
  buildProvider(i)
);

export function getFallbackProviderBySlug(slug: string): Provider | undefined {
  return FALLBACK_PROVIDERS.find((p) => p.slug === slug);
}

export function searchFallbackProviders(filters: {
  state?: string;
  city?: string;
  insuranceType?: InsuranceType;
  specialty?: Specialty;
  verifiedOnly?: boolean;
  minRating?: number;
  query?: string;
  limit?: number;
  offset?: number;
}): { providers: Provider[]; total: number } {
  let results = [...FALLBACK_PROVIDERS];

  if (filters.state) {
    results = results.filter((p) => p.state.toLowerCase() === filters.state!.toLowerCase());
  }
  if (filters.city) {
    results = results.filter((p) =>
      p.city.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }
  if (filters.insuranceType) {
    results = results.filter((p) => p.insurance_types.includes(filters.insuranceType!));
  }
  if (filters.specialty) {
    results = results.filter((p) => p.specialties.includes(filters.specialty!));
  }
  // verifiedOnly never matches seed rows (all is_verified false)
  if (filters.verifiedOnly) {
    results = results.filter((p) => p.is_verified);
  }
  if (filters.minRating != null && filters.minRating > 0) {
    results = results.filter((p) => p.rating >= filters.minRating!);
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
    );
  }

  const total = results.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? results.length;
  return { providers: results.slice(offset, offset + limit), total };
}
