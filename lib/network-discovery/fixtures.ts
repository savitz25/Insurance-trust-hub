import type { Provider as DbProvider, LicenseInfo } from '@/types/supabase';

const NOW = '2026-08-01T00:00:00.000Z';

export function fixtureLicense(state: string, number: string): LicenseInfo {
  return {
    licenses: [
      {
        state,
        license_number: number,
        type: 'agency',
        verification_url: `https://example.invalid/lookup/${number}`,
        source: 'State Department of Insurance',
        checkedAt: NOW,
        method: 'automated',
        identityMatchAccepted: true,
        status: 'verified',
      },
    ],
  };
}

export function fixtureProvider(
  overrides: Partial<DbProvider> &
    Pick<DbProvider, 'id' | 'slug' | 'name' | 'provider_type'>
): DbProvider {
  return {
    categories: ['homeowners', 'auto'],
    states_licensed: ['FL'],
    cities: ['Miami'],
    license_info: fixtureLicense('FL', 'A123456'),
    specialties: ['Personal Lines'],
    rating: 0,
    review_count: 0,
    years_in_business: null,
    relocation_experience: false,
    verified: true,
    description: null,
    short_description: null,
    contact: {
      address: {
        street: '1 Main St',
        city: 'Miami',
        state: 'FL',
        zip: '33101',
      },
      county: 'Miami-Dade',
    },
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}
