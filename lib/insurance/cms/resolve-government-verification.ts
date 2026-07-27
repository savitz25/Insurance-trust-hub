import type { Provider } from '@/types/provider';
import type { GovernmentVerificationData, CmsParticipationStatus } from '@/lib/insurance/cms/types';
import { CMS_COMPLAINT_DATASET_META } from '@/lib/insurance/cms/complaint-rankings';

function isMedicareFocused(provider: Provider): boolean {
  if (provider.specialties.some((s) => s === 'Medicare Specialists')) return true;
  if (provider.insurance_types.includes('medicare')) return true;
  const blob = `${provider.short_description ?? ''} ${provider.description ?? ''}`.toLowerCase();
  return blob.includes('medicare');
}

function resolveParticipation(provider: Provider): {
  status: CmsParticipationStatus;
  label: string;
  notes: string | null;
} {
  const medicare = isMedicareFocused(provider);

  if (!medicare) {
    return {
      status: 'not_applicable',
      label: 'Not a Medicare-focused listing',
      notes:
        'This agency is not tagged primarily for Medicare Advantage / Part D enrollment. CMS plan participation fields apply mainly to MA/PD contracts and Medicare-focused agents.',
    };
  }

  // Phase 1: no live CMS enrollment API — verified DOI listings with Medicare focus show pending CMS deep-link
  if (provider.is_verified) {
    return {
      status: 'pending',
      label: 'Pending CMS file match',
      notes:
        'Listing is DOI-verified on Insurance Trust Hub. Direct CMS NPI / PECOS enrollment match is queued for the next scheduled CMS data import — not fabricated.',
    };
  }

  return {
    status: 'pending',
    label: 'Pending verification',
    notes:
      'Medicare-related listing without a completed CMS data match. Confirm participation with CMS tools and your state DOI before enrollment decisions.',
  };
}

/**
 * Build Government Verification panel props from a provider profile.
 * NPI is never invented — always null until CMS import supplies it.
 */
export function resolveGovernmentVerification(provider: Provider): GovernmentVerificationData {
  const { status, label, notes } = resolveParticipation(provider);
  const medicare = isMedicareFocused(provider);

  return {
    title: 'Government Verification',
    cmsParticipation: status,
    cmsParticipationLabel: label,
    npi: null,
    medicareNotes: notes,
    lastCmsUpdate: CMS_COMPLAINT_DATASET_META.syncedAt,
    dataSourceLabel: medicare
      ? 'CMS public datasets (scheduled import) · state DOI cross-check'
      : 'State DOI listing · CMS fields not applicable',
    licenseVerified: provider.is_verified,
    licenseNumber: provider.license_number,
    licenseState: provider.state,
  };
}

export function providerIsMedicareSpecialist(provider: Provider): boolean {
  return isMedicareFocused(provider);
}
