import type { Provider } from '@/types/provider';
import type { InsuranceType, Specialty } from '@/lib/constants';

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

const CARRIERS = [
  ['State Farm', 'Progressive', 'Travelers'],
  ['Allstate', 'Nationwide', 'Liberty Mutual'],
  ['GEICO', 'USAA', 'Farmers'],
  ['Hartford', 'Chubb', 'MetLife'],
  ['Blue Cross', 'Aetna', 'Cigna'],
];

function buildProvider(index: number): Provider {
  const stateCodes = Object.keys(CITIES);
  const state = stateCodes[index % stateCodes.length];
  const cities = CITIES[state];
  const city = cities[index % cities.length];
  const prefix = AGENCY_PREFIXES[index % AGENCY_PREFIXES.length];
  const suffix = AGENCY_SUFFIXES[Math.floor(index / AGENCY_PREFIXES.length) % AGENCY_SUFFIXES.length];
  const name = `${prefix} ${suffix}`;
  const slug = `${prefix.toLowerCase()}-${suffix.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase()}-${state.toLowerCase()}`;
  const types = TYPE_SETS[index % TYPE_SETS.length];
  const specialties = SPECIALTY_SETS[index % SPECIALTY_SETS.length];
  const rating = Number((3.8 + (index % 12) * 0.1).toFixed(1));
  const reviewCount = 12 + (index * 7) % 180;
  const years = 5 + (index % 35);

  return {
    id: `fallback-${index + 1}`,
    slug,
    name,
    short_description: `Licensed ${state} agency specializing in ${types.slice(0, 2).join(' & ')} coverage for families and businesses.`,
    description: `${name} is an independent insurance agency serving ${city}, ${state} and surrounding communities. Our licensed agents compare quotes from multiple carriers to help you find the right coverage at competitive rates.`,
    city,
    state,
    zip: `${10000 + index * 111}`.slice(0, 5),
    phone: `(555) ${String(200 + index).padStart(3, '0')}-${String(1000 + index * 13).slice(-4)}`,
    website: `https://www.${prefix.toLowerCase()}${suffix.split(' ')[0].toLowerCase()}.com`,
    insurance_types: types,
    specialties,
    rating: Math.min(rating, 5),
    review_count: reviewCount,
    is_verified: index % 3 !== 0,
    license_number: `${state}-${100000 + index}`,
    years_in_business: years,
    carriers: CARRIERS[index % CARRIERS.length],
  };
}

/** 50 mock providers used when Supabase is not configured. */
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
  if (filters.verifiedOnly) {
    results = results.filter((p) => p.is_verified);
  }
  if (filters.minRating) {
    results = results.filter((p) => p.rating >= filters.minRating!);
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.specialties.some((s) => s.toLowerCase().includes(q))
    );
  }

  const total = results.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 24;
  results = results.slice(offset, offset + limit);

  return { providers: results, total };
}