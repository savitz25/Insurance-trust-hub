import type { Provider as PublicProvider } from '@/types/provider';
import type { Provider as DbProvider, ProviderInsert, LicenseInfo } from '@/types/supabase';
import type { AdminProviderFormValues } from '@/lib/validations/admin';
import { getLicenseDepartment } from '@/lib/tools/license-verification';
import { isPlaceholderPhone } from '@/lib/provenance/phone';
import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';
import {
  classifyBailBondDirectoryPublication,
  mayAssignPublicInsuranceCategory,
  mayAssignPublicInsuranceSpecialty,
  maySetDirectoryVerified,
} from '@/lib/directory/bail-bond-publication';

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
  licenseSource: string;
  licenseSourceUrl: string;
  licenseCheckedAt: string;
  licenseMethod: 'manual' | 'automated';
  licenseNotes: string;
  identityMatchAccepted: boolean;
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
    licenseSource: data.licenseSource ?? '',
    licenseSourceUrl: data.licenseSourceUrl ?? '',
    licenseCheckedAt: data.licenseCheckedAt ?? '',
    licenseMethod: data.licenseMethod ?? 'manual',
    licenseNotes: data.licenseNotes ?? '',
    identityMatchAccepted: data.identityMatchAccepted ?? false,
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
    licenseSource: provider.license_source ?? '',
    licenseSourceUrl: provider.license_source_url ?? '',
    licenseCheckedAt: provider.license_checked_at ?? '',
    licenseMethod: (provider.license_method as 'manual' | 'automated') || 'manual',
    licenseNotes: provider.license_notes ?? '',
    identityMatchAccepted: Boolean(provider.license_identity_match_accepted),
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
    licenseSource: license?.source ?? '',
    licenseSourceUrl: license?.verification_url ?? '',
    licenseCheckedAt: license?.checkedAt ?? '',
    licenseMethod: (license?.method as 'manual' | 'automated') || 'manual',
    licenseNotes: license?.notes ?? '',
    identityMatchAccepted: Boolean(license?.identityMatchAccepted),
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
  const cleaned = cleanLicenseNumber(data.licenseNumber);
  const phone = data.phone && !isPlaceholderPhone(data.phone) ? data.phone : '';
  const source = data.licenseSource.trim() || dept?.department || '';
  const sourceUrl =
    data.licenseSourceUrl.trim() || dept?.lookupUrl || 'https://content.naic.org/consumer.htm';
  const checkedAt = data.licenseCheckedAt.trim() || undefined;

  const bail = classifyBailBondDirectoryPublication({
    businessNames: [data.name],
    licenseEvidence: [data.licenseNotes, ...(data.insuranceTypes ?? [])],
  });

  // Never write verified without full provenance (Phase 6B1)
  const canVerify =
    data.verified &&
    Boolean(cleaned) &&
    Boolean(source) &&
    Boolean(checkedAt) &&
    data.identityMatchAccepted &&
    maySetDirectoryVerified(bail);

  const prevAudit: LicenseInfo['audit'] = [];
  if (cleaned) {
    prevAudit.push({
      at: new Date().toISOString(),
      method: data.licenseMethod,
      action: canVerify ? 'admin_save_verified' : 'admin_save_pending',
      notes: data.licenseNotes || undefined,
      license_number: cleaned,
    });
  }

  return {
    slug: data.slug,
    name: data.name,
    provider_type: data.providerType,
    categories: data.insuranceTypes.filter((c) => mayAssignPublicInsuranceCategory(c, bail)),
    states_licensed: state ? [state] : [],
    cities: data.city ? [data.city] : [],
    license_info: {
      licenses: cleaned
        ? [
            {
              state,
              license_number: cleaned,
              type: 'agent',
              verification_url: sourceUrl,
              source: source || undefined,
              checkedAt,
              method: data.licenseMethod,
              notes: data.licenseNotes || undefined,
              status: canVerify ? 'verified' : 'pending',
              identityMatchAccepted: data.identityMatchAccepted,
            },
          ]
        : [],
      audit: prevAudit,
    },
    specialties: data.specialties.filter((s) => mayAssignPublicInsuranceSpecialty(s, bail)),
    years_in_business: data.yearsInBusiness,
    relocation_experience: data.relocationExperience,
    verified: canVerify,
    short_description: data.shortDescription || null,
    description: data.description || null,
    contact: {
      phone: phone || undefined,
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
    license_state: data.state.toUpperCase(),
    license_source: data.licenseSource || null,
    license_source_url: data.licenseSourceUrl || null,
    license_checked_at: data.licenseCheckedAt || null,
    license_method: data.licenseMethod,
    license_notes: data.licenseNotes || null,
    license_identity_match_accepted: data.identityMatchAccepted,
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
