import type { Provider as PublicProvider } from '@/types/provider';
import type { Provider as DbProvider, ProviderInsert } from '@/types/supabase';
import type { AdminProviderFormValues } from '@/lib/validations/admin';
import { getLicenseDepartment } from '@/lib/tools/license-verification';

export interface AdminProviderFormData {
  slug: string;
  name: string;
  providerType: 'independent_agent' | 'brokerage' | 'specialist';
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  licenseNumber: string;
  insuranceTypes: string[];
  specialties: string[];
  yearsInBusiness: number | null;
  relocationExperience: boolean;
  verified: boolean;
  shortDescription: string;
  description: string;
}

export function schemaToFormData(data: AdminProviderFormValues): AdminProviderFormData {
  return {
    slug: data.slug,
    name: data.name,
    providerType: data.providerType,
    city: data.city,
    state: data.state,
    zip: data.zip ?? '',
    phone: data.phone ?? '',
    website: data.website ?? '',
    licenseNumber: data.licenseNumber ?? '',
    insuranceTypes: data.insuranceTypes,
    specialties: data.specialties,
    yearsInBusiness: data.yearsInBusiness ?? null,
    relocationExperience: data.relocationExperience,
    verified: data.verified,
    shortDescription: data.shortDescription ?? '',
    description: data.description ?? '',
  };
}

export function publicProviderToForm(provider: PublicProvider): AdminProviderFormData {
  return {
    slug: provider.slug,
    name: provider.name,
    providerType: 'independent_agent',
    city: provider.city,
    state: provider.state,
    zip: provider.zip ?? '',
    phone: provider.phone ?? '',
    website: provider.website ?? '',
    licenseNumber: provider.license_number ?? '',
    insuranceTypes: provider.insurance_types,
    specialties: provider.specialties,
    yearsInBusiness: provider.years_in_business ?? null,
    relocationExperience: provider.specialties.includes('Relocation Experienced'),
    verified: provider.is_verified,
    shortDescription: provider.short_description ?? '',
    description: provider.description ?? '',
  };
}

export function dbProviderToForm(provider: DbProvider): AdminProviderFormData {
  const address = provider.contact?.address;
  const license = provider.license_info?.licenses?.[0];

  return {
    slug: provider.slug,
    name: provider.name,
    providerType: provider.provider_type,
    city: address?.city ?? provider.cities[0] ?? '',
    state: address?.state ?? provider.states_licensed[0] ?? '',
    zip: address?.zip ?? '',
    phone: provider.contact?.phone ?? '',
    website: provider.contact?.website ?? '',
    licenseNumber: license?.license_number ?? '',
    insuranceTypes: provider.categories,
    specialties: provider.specialties,
    yearsInBusiness: provider.years_in_business,
    relocationExperience: provider.relocation_experience,
    verified: provider.verified,
    shortDescription: provider.short_description ?? '',
    description: provider.description ?? '',
  };
}

export function formToDbInsert(data: AdminProviderFormData): ProviderInsert {
  const state = data.state.toUpperCase();
  const dept = getLicenseDepartment(state);

  return {
    slug: data.slug,
    name: data.name,
    provider_type: data.providerType,
    categories: data.insuranceTypes,
    states_licensed: state ? [state] : [],
    cities: data.city ? [data.city] : [],
    license_info: {
      licenses: data.licenseNumber
        ? [
            {
              state,
              license_number: data.licenseNumber,
              type: 'agent',
              verification_url: dept?.lookupUrl ?? 'https://content.naic.org/consumer.htm',
            },
          ]
        : [],
    },
    specialties: data.specialties,
    years_in_business: data.yearsInBusiness,
    relocation_experience: data.relocationExperience,
    verified: data.verified,
    short_description: data.shortDescription || null,
    description: data.description || null,
    contact: {
      phone: data.phone || undefined,
      website: data.website || undefined,
      address: {
        street: '',
        city: data.city,
        state,
        zip: data.zip,
      },
    },
  };
}

export function formToPublicProvider(data: AdminProviderFormData, id: string): PublicProvider {
  return {
    id,
    slug: data.slug,
    name: data.name,
    city: data.city,
    state: data.state.toUpperCase(),
    zip: data.zip || null,
    phone: data.phone || null,
    website: data.website || null,
    license_number: data.licenseNumber || null,
    insurance_types: data.insuranceTypes as PublicProvider['insurance_types'],
    specialties: data.specialties as PublicProvider['specialties'],
    years_in_business: data.yearsInBusiness,
    is_verified: data.verified,
    short_description: data.shortDescription || null,
    description: data.description || null,
    rating: 0,
    review_count: 0,
  };
}