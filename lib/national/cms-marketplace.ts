/**
 * CMS FFM Marketplace evidence rules.
 * Exact NPN join only. Plan-year required. Tracker ≠ RCL completion.
 * Health LOA never implies Marketplace registration.
 */

import { normalizeNpn } from './npn';
import { healthLoaImpliesMarketplace, healthOrLifeLoaImpliesMedicare } from './loa';
import { PUBLIC_PERSON_PROFILES_ENABLED } from './publication';

export const CMS_CURRENT_PLAN_YEAR = '2026';
export const CMS_PROGRAM = 'CMS_FFM';

export const CMS_SOURCE = {
  rcl: {
    id: 'wb6u-x2ny',
    dataset: 'cms_ffm_rcl',
    url: 'https://data.healthcare.gov/sites/default/files/uploaded_resources/TBL_RCL_425.csv',
    page: 'https://data.healthcare.gov/ffm_ab_registration_lists',
    modified: '2026-08-21T14:26:00+00:00',
  },
  rclHistoric: {
    id: 'wb6u-x2ny-2014-2015',
    dataset: 'cms_ffm_rcl_2014_2015',
    url: 'https://data.healthcare.gov/sites/default/files/uploaded_resources/RCL_2014_2015_2.csv',
  },
  rtl: {
    id: 'e8uy-7rnp',
    dataset: 'cms_ffm_rtl',
    url: 'https://data.healthcare.gov/sites/default/files/uploaded_resources/AB_Termination_List_951.csv',
    page: 'https://data.healthcare.gov/ffm_ab_registration_lists',
    modified: '2026-08-21T14:26:00+00:00',
  },
  tracker: {
    id: 'e4rr-zk4i',
    dataset: 'cms_ffm_registration_tracker',
    url: 'https://data.healthcare.gov/sites/default/files/uploaded_resources/AB_Registration_Tracker_1169.csv',
    page: 'https://data.healthcare.gov/ab-registration-tracker',
    modified: '2026-08-21T14:27:00+00:00',
  },
  findLocalHelp: {
    id: '3ddf85bc-f71b-4417-b271-410cbf9e0905',
    dataset: 'cms_find_local_help',
    url: 'https://data.healthcare.gov/datafile/localhelp/prod/helpers.csv',
    page: 'https://data.healthcare.gov/dataset/3ddf85bc-f71b-4417-b271-410cbf9e0905',
    modified: '2026-08-25T06:36:20+00:00',
  },
} as const;

export type CmsEvidenceType =
  | 'FFM_REGISTRATION_COMPLETED'
  | 'FFM_REGISTRATION_TERMINATED'
  | 'FFM_REGISTRATION_REINSTATED'
  | 'FFM_REGISTRATION_TRACKER';

export type CmsMarketplaceType = 'INDIVIDUAL' | 'SHOP' | 'BOTH' | 'UNKNOWN';
export type CmsAttachment = 'ATTACHED' | 'UNATTACHED' | 'KIND_CONFLICT';

export type CmsJoinInput = {
  npn: string | null | undefined;
  personId?: string | null;
  agencyOwnsNpn?: boolean;
};

export type CmsJoinResult = {
  npn: string | null;
  attachment: CmsAttachment;
  entityId: string | null;
  confidence: 'CONFIRMED' | 'UNRESOLVED' | 'REVIEW_REQUIRED';
  createPerson: false;
};

export function cmsJoinExactNpn(input: CmsJoinInput): CmsJoinResult {
  const npn = normalizeNpn(input.npn ?? null);
  if (!npn) {
    return {
      npn: null,
      attachment: 'UNATTACHED',
      entityId: null,
      confidence: 'UNRESOLVED',
      createPerson: false,
    };
  }
  if (input.personId) {
    return {
      npn,
      attachment: 'ATTACHED',
      entityId: input.personId,
      confidence: 'CONFIRMED',
      createPerson: false,
    };
  }
  if (input.agencyOwnsNpn) {
    return {
      npn,
      attachment: 'KIND_CONFLICT',
      entityId: null,
      confidence: 'REVIEW_REQUIRED',
      createPerson: false,
    };
  }
  return {
    npn,
    attachment: 'UNATTACHED',
    entityId: null,
    confidence: 'UNRESOLVED',
    createPerson: false,
  };
}

export function marketplaceTypeFromDates(
  individualDate: string | null | undefined,
  shopDate: string | null | undefined
): CmsMarketplaceType {
  const ind = Boolean(String(individualDate || '').trim());
  const shop = Boolean(String(shopDate || '').trim());
  if (ind && shop) return 'BOTH';
  if (ind) return 'INDIVIDUAL';
  if (shop) return 'SHOP';
  return 'UNKNOWN';
}

export function rtlStatusToEvidence(status: string | null | undefined): CmsEvidenceType {
  const s = String(status || '').trim().toUpperCase();
  if (s.startsWith('R')) return 'FFM_REGISTRATION_REINSTATED';
  return 'FFM_REGISTRATION_TERMINATED';
}

/** Tracker milestones never equal RCL completion. */
export function trackerImpliesRegistrationCompleted(_row?: Record<string, string>): false {
  return false;
}

export function portalAccountImpliesRegistered(): false {
  return false;
}

export function healthLoaImpliesCmsRegistration(officialText?: string): false {
  return healthLoaImpliesMarketplace(officialText);
}

export function cmsRegistrationCreatesStateLicense(): false {
  return false;
}

export function cmsTerminationMutatesStateCredential(): false {
  return false;
}

export function assisterOrNavigatorIsProducer(dataSetName: string): boolean {
  const s = String(dataSetName || '').toLowerCase();
  if (/navigator|assister|counselor|\bcac\b|medicaid specialist|chip specialist/.test(s)) {
    return false;
  }
  return /agent\/broker|\baba\b/.test(s);
}

export function findLocalHelpHasNpn(row: Record<string, string>): boolean {
  return Boolean(normalizeNpn(row.npn || row.NPN || row.NPN_INDIV || null));
}

export function observationDedupeKey(
  sourceDataset: string,
  planYear: string | null | undefined,
  evidenceType: string,
  npn: string
): string {
  return `${sourceDataset}|${planYear || ''}|${evidenceType}|${npn}`;
}

export function cmsPersonProfilesStayPrivate(): boolean {
  return PUBLIC_PERSON_PROFILES_ENABLED === false;
}

export function parseCmsDate(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!mdy) return null;
  return `${mdy[3]}-${mdy[1]!.padStart(2, '0')}-${mdy[2]!.padStart(2, '0')}`;
}

void healthOrLifeLoaImpliesMedicare;
