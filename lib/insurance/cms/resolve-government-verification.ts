import type { Provider } from '@/types/provider';
import type { GovernmentVerificationData, CmsParticipationStatus } from '@/lib/insurance/cms/types';
import { CMS_COMPLAINT_DATASET_META } from '@/lib/insurance/cms/complaint-rankings';
import {
  lookupNpiEnrollment,
  normalizeNpi,
  PPEF_DATASET_META,
} from '@/lib/insurance/cms/ppef-lookup';

/**
 * Structured, source-backed Medicare relationship only — a specialty tag or
 * a listed insurance type. Deliberately does NOT substring-match free-text
 * description/short_description: a passing mention of "Medicare" in prose is
 * not a source-backed entity relationship and must not pull CMS/Medicare
 * modules onto an otherwise unrelated agency profile.
 */
function isMedicareFocused(provider: Provider): boolean {
  if (provider.specialties.some((s) => s === 'Medicare Specialists')) return true;
  if (provider.insurance_types.includes('medicare')) return true;
  return false;
}

function providerNpi(provider: Provider): string | null {
  const raw = (provider as Provider & { npi?: string | null }).npi;
  return normalizeNpi(raw);
}

function resolveParticipation(provider: Provider): {
  status: CmsParticipationStatus;
  label: string;
  notes: string | null;
  npi: string | null;
  dataSourceLabel: string;
  lastCmsUpdate: string;
} {
  const medicare = isMedicareFocused(provider);
  const npi = providerNpi(provider);
  const npiHit = lookupNpiEnrollment(npi);

  if (npiHit) {
    return {
      status: npiHit.status,
      label: npiHit.label,
      notes: npiHit.notes,
      npi: npiHit.npi,
      dataSourceLabel: npiHit.dataSourceLabel,
      lastCmsUpdate: npiHit.lastCmsUpdate,
    };
  }

  if (!medicare) {
    return {
      status: 'not_applicable',
      label: 'Not a Medicare-focused listing',
      notes:
        'This agency is not tagged primarily for Medicare Advantage / Part D enrollment. CMS PPEF / Opt Out checks apply when an NPI is on file or the listing is Medicare-focused.',
      npi: null,
      dataSourceLabel: 'State DOI listing · CMS fields not applicable',
      lastCmsUpdate: CMS_COMPLAINT_DATASET_META.syncedAt,
    };
  }

  if (provider.is_verified) {
    return {
      status: 'pending',
      label: 'Pending NPI / PECOS match',
      notes: `DOI-verified Medicare-related listing. CMS Opt Out list (${PPEF_DATASET_META.optOutCount.toLocaleString()} NPIs, ${PPEF_DATASET_META.optOutVintage}) is loaded; PPEF active-enrollment match requires a listing NPI. No NPI is shown until supplied by verified data — never fabricated.`,
      npi: null,
      dataSourceLabel: 'CMS Opt Out Affidavits · PPEF when NPI available · state DOI',
      lastCmsUpdate: CMS_COMPLAINT_DATASET_META.syncedAt,
    };
  }

  return {
    status: 'pending',
    label: 'Pending verification',
    notes:
      'Medicare-related listing without a completed CMS NPI match. Confirm participation with CMS tools and your state DOI before enrollment decisions.',
    npi: null,
    dataSourceLabel: 'CMS public datasets (scheduled import) · state DOI cross-check',
    lastCmsUpdate: CMS_COMPLAINT_DATASET_META.syncedAt,
  };
}

/**
 * Build Government Verification panel props from a provider profile.
 * NPI is never invented.
 */
export function resolveGovernmentVerification(provider: Provider): GovernmentVerificationData {
  const { status, label, notes, npi, dataSourceLabel, lastCmsUpdate } =
    resolveParticipation(provider);

  return {
    title: 'Government Verification',
    cmsParticipation: status,
    cmsParticipationLabel: label,
    npi,
    medicareNotes: notes,
    lastCmsUpdate,
    dataSourceLabel,
    licenseVerified: provider.is_verified,
    licenseNumber: provider.license_number,
    licenseState: provider.license_state || provider.state,
  };
}

export function providerIsMedicareSpecialist(provider: Provider): boolean {
  return isMedicareFocused(provider);
}

/**
 * Gate for whether the Government Verification (CMS/Medicare/NPI) panel
 * should render at all on an agency-class provider profile. Requires a
 * structured, source-backed relationship: a Medicare specialty/insurance-type
 * tag, or an NPI already on file. A plain independent agency with neither
 * must not show CMS/Medicare modules, even as a "not applicable" state.
 */
export function governmentVerificationApplicable(provider: Provider): boolean {
  return isMedicareFocused(provider) || Boolean(providerNpi(provider));
}

export function resolveGovernmentStandingInput(provider: Provider) {
  const verification = resolveGovernmentVerification(provider);
  return {
    cmsParticipation: verification.cmsParticipation,
    hasNpi: Boolean(verification.npi),
    isMedicareSpecialist: isMedicareFocused(provider),
    isLicenseVerified: provider.is_verified,
    complaintRatePerThousand: null as number | null,
    hasEnforcementFlag:
      verification.cmsParticipation === 'inactive' ? true : (null as boolean | null),
  };
}
