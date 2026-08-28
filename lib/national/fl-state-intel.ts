/**
 * FL-INS-006 — Florida state intelligence snapshot contract.
 * Versioned payload. No rankings. No Trust Scores. No county inference.
 * Headline counts must come from production, never hard-coded in UI.
 */
export const FL_STATE_INTEL_VERSION = 'insurance-fl-state-intel-v1' as const;
export const FL_STATE_INTEL_TASK = 'FL-INS-006';

export const ENRICHMENT_CLASS = {
  READY_FOR_FL_CREDENTIAL_MODULE: 'READY_FOR_FL_CREDENTIAL_MODULE',
  READY_FOR_FL_APPOINTMENT_MODULE: 'READY_FOR_FL_APPOINTMENT_MODULE',
  READY_FOR_FL_MARKET_MODULE: 'READY_FOR_FL_MARKET_MODULE',
  READY_FOR_CMS_MODULE: 'READY_FOR_CMS_MODULE',
  READY_FOR_SURPLUS_MODULE: 'READY_FOR_SURPLUS_MODULE',
  READY_FOR_FL_REGULATORY_MODULE: 'READY_FOR_FL_REGULATORY_MODULE',
  INTERNAL_ONLY: 'INTERNAL_ONLY',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  NOT_READY: 'NOT_READY',
} as const;

export const APPOINTER_LIMITATION =
  'Florida DFS appointment evidence is stored at the DFS appointing-entity identifier level. Public DFS/OIR sources do not currently provide a deterministic crosswalk from that identifier to NAIC legal-insurer identity.';

export const CITIZENS_LABEL = "Florida's residual-market insurer";
export const CITIZENS_MODULE_STATE = 'DATA_PENDING_CURRENT_OFFICIAL_SOURCE';
export const CHOICES_SAFE_COPY =
  'Florida OIR CHOICES provides sample premium comparisons for defined profiles and locations.';
export const NFIP_SAFE_COPY = 'Listed in FEMA/NFIP Agency Registry.';
export const CMS_SAFE_COPY = 'CMS Marketplace registration evidence found';

export const STATE_MODULES = [
  'Florida Insurance Overview',
  'Florida Agency Credentials',
  'Florida Producer / Individual Credentials',
  'Florida Appointment Evidence',
  'Florida Legal Insurer / OIR Universe',
  'Florida Residential Market Activity',
  'Policies in Force',
  'Written Premium',
  'Exposure',
  'Surplus Lines',
  'CMS Marketplace Evidence',
  'Citizens Residual Market',
  'CHOICES Sample Rate Tool',
  'IRFS Filing Research',
  'Flood / NFIP',
  'Regulatory & Enforcement History',
  'Methodology',
  'Source Clocks',
  'Known Data Limitations',
] as const;

export function credentialIsAppointment(): false {
  return false;
}
export function appointmentIsInsurerIdentity(): false {
  return false;
}
export function cmsIsStateLicense(): false {
  return false;
}
export function mirPifIsQuality(): false {
  return false;
}
export function premiumIsConsumerPrice(): false {
  return false;
}
export function sourceRankIsTrusthubRank(): false {
  return false;
}
export function missingRegulatoryIsClean(): false {
  return false;
}
export function liquidationIsMisconduct(): false {
  return false;
}
export function countyInferredFromAddress(): false {
  return false;
}
export function nameMatchingAllowed(): false {
  return false;
}
export function licensedThroughoutFloridaFromLocation(): false {
  return false;
}
export function authorizedInCountyFromAppointment(): false {
  return false;
}
export function appointedByNamedInsurerWithoutBridge(): false {
  return false;
}
export function appointmentIsEmployment(): false {
  return false;
}
export function appointmentIsQuality(): false {
  return false;
}

export const FORBIDDEN_STATE_COPY = [
  'market leader',
  'best carrier',
  'top insurer',
  'Florida has 162 home insurers',
  '12 insurers failed',
  '12 bad insurers',
  'clean regulatory record',
  'no complaints',
  'NFIP certified',
  "Florida's largest insurer",
  'licensed throughout Florida',
] as const;

/** FL-INS-007 publication surface. Counts still come from the v1 snapshot, never JSX literals. */
export const FL_INS_007_TASK = 'FL-INS-007';
export const FLORIDA_ROUTE = '/florida';
export const FLORIDA_PAGE_TITLE = 'Florida Insurance Research, Licensing & Market Data';
export const FLORIDA_PAGE_DESCRIPTION =
  'Independent Florida insurance research: DFS licensing for agencies and producers, appointment evidence, OIR company identity, June 2026 residential market activity, surplus-lines eligibility, sample-rate tools, and regulatory methodology. Not rankings, quotes, or recommendations.';
export const CANONICAL_SNAPSHOT_FINGERPRINT =
  '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';

/** Final publication gate — index only after snapshot, semantics, SEO, and smoke pass. */
export const FLORIDA_INDEXABLE = true;

export const APPOINTER_SAFE_COPY =
  'Florida DFS appointment records use an appointing-entity identifier that is not deterministically crosswalked to NAIC legal-insurer identity in the available public DFS/OIR sources.';

export const CHOICES_PROFILE_COPY =
  'Sample premium shown in Florida OIR CHOICES for the selected profile and location.';

export const SURPLUS_SAFE_COPY = 'Eligible in Florida surplus-lines records';

export const REGULATORY_SECTION_HEADING = 'Regulatory & Enforcement History';

export const PROFILE_GATE = {
  FL_CREDENTIAL_READY: 'FL_CREDENTIAL_READY',
  FL_APPOINTMENT_READY: 'FL_APPOINTMENT_READY',
  CMS_NOT_READY: 'CMS_NOT_READY',
  MIR_NOT_ENTITY_COMPATIBLE: 'MIR_NOT_ENTITY_COMPATIBLE',
  SURPLUS_NOT_ENTITY_COMPATIBLE: 'SURPLUS_NOT_ENTITY_COMPATIBLE',
  FL_REGULATORY_NOT_DETERMINISTICALLY_LINKED: 'FL_REGULATORY_NOT_DETERMINISTICALLY_LINKED',
  NFIP_NOT_DETERMINISTICALLY_LINKED: 'NFIP_NOT_DETERMINISTICALLY_LINKED',
} as const;

export type ProfileGate = (typeof PROFILE_GATE)[keyof typeof PROFILE_GATE];

export const NAMESPACE_LABEL: Record<string, string> = {
  producer: 'Producer / agency license',
  limited_lines: 'Limited lines',
  warranty: 'Warranty',
  adjuster: 'Adjuster',
  other: 'Other',
  title: 'Title',
  bail_bond: 'Bail bond',
  surplus_lines: 'Surplus lines',
  tpa: 'Third-party administrator',
};

export function formatCount(n: unknown): string {
  return Math.round(Number(n)).toLocaleString('en-US');
}

/** Decimal-safe USD display. Rounds to cents so IEEE artifacts like .32999 never render. */
export function formatUsd(n: unknown): string {
  const cents = Math.round(Number(n) * 100);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${dollars.toLocaleString('en-US')}.${String(frac).padStart(2, '0')}`;
}

export function residentialPifTotal(personal: number, commercial: number): number {
  return Number(personal) + Number(commercial);
}

export function mirRankFieldIsPif(): false {
  return false;
}

export function displayModelContainsRankAsPif(
  displayPifTotal: number,
  unusedRankField: number
): boolean {
  return unusedRankField > 0 && displayPifTotal === unusedRankField;
}
