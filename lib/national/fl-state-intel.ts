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
