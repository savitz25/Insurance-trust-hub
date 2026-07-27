/**
 * CMS (Centers for Medicare & Medicaid Services) data models — Phase 1.
 *
 * Data is designed for scheduled file imports (not live restricted API calls).
 * Version every import via `dataVintage` + `syncedAt`.
 */

/** Participation / enrollment status for government verification panel. */
export type CmsParticipationStatus =
  | 'active'
  | 'inactive'
  | 'not_found'
  | 'pending'
  | 'not_applicable';

/**
 * Props for GovernmentVerificationPanel.
 * Prefer injecting resolved data from CMS store / enrichment — never invent NPI values.
 */
export type GovernmentVerificationData = {
  /** Panel title override */
  title?: string;
  cmsParticipation: CmsParticipationStatus;
  cmsParticipationLabel?: string;
  npi?: string | null;
  medicareNotes?: string | null;
  /** ISO date or YYYY-MM of last CMS dataset refresh */
  lastCmsUpdate: string;
  /** Source attribution for provenance */
  dataSourceLabel: string;
  /** Optional DOI / state license cross-check already on profile */
  licenseVerified?: boolean;
  licenseNumber?: string | null;
  licenseState?: string | null;
};

export type ComplaintTrend = 'improving' | 'stable' | 'worsening' | 'unknown';

/**
 * One Medicare Advantage / Part D contract row for the Plan Complaint Index.
 * Maps to CMS Part C/D complaint rates (complaints per 1,000 enrollees) when imported.
 */
export type CmsComplaintRanking = {
  id: string;
  rank: number;
  /** Parent organization / marketing name */
  carrierName: string;
  /** CMS contract ID when known (e.g. H1234) */
  contractId?: string | null;
  /** State focus for filter tabs; "US" for national */
  stateCode: string;
  stateName: string;
  /** Complaints per 1,000 enrollees (CMS measure) */
  complaintRatePerThousand: number;
  /** Optional CMS overall star rating (1–5) */
  starRating?: number | null;
  trend: ComplaintTrend;
  planType: 'Medicare Advantage' | 'Part D' | 'MA-PD' | 'Other';
  /** True when row is illustrative until real CMS file import lands */
  isPlaceholder: boolean;
};

export type CmsComplaintDatasetMeta = {
  /** e.g. CY2024 */
  dataVintage: string;
  /** ISO timestamp of last successful sync */
  syncedAt: string;
  /** Human-readable source */
  sourceLabel: string;
  /** CMS file / dataset name for methodology */
  sourceDataset: string;
  /** notes for methodology section */
  methodologyNotes: string[];
  /** When true, rankings are structural placeholders, not live CMS numbers */
  usingPlaceholderData: boolean;
};

/** Input signals for Government Standing trust factor (0–100 sub-score). */
export type GovernmentStandingInput = {
  cmsParticipation?: CmsParticipationStatus | null;
  hasNpi?: boolean;
  isMedicareSpecialist?: boolean;
  isLicenseVerified?: boolean;
  /** Carrier-level complaint rate per 1k if linked (lower is better) */
  complaintRatePerThousand?: number | null;
  /** Enforcement / sanction flag when available */
  hasEnforcementFlag?: boolean | null;
};

/** Pre-computed county Medicare intelligence (Phase 2). */
export type CountyContractHighlight = {
  contractId: string;
  carrierName: string;
  publishedEnrollment: number;
  bucket?: 'ma' | 'pdp' | 'employer' | 'other';
  complaintRatePerThousand?: number | null;
  complaintMeasureStar?: number | null;
};

export type CountyMedicareSummary = {
  slug: string;
  displayName: string;
  stateCode: string;
  stateName: string;
  countyName: string;
  fips: string;
  hubSlug: string;
  hubStateSlug: string;
  enrollmentPeriod: string;
  metrics: {
    publishedEnrollment: number;
    publishedEnrollmentNote: string;
    yearOverYearChange: number | null;
    yearOverYearNote: string;
    maPenetrationVsOriginal: number | null;
    maPenetrationNote: string;
    contractsWithAnyPresence: number;
    planOptionsWithAnyPresence: number;
    materialContracts: number;
    materialThreshold: number;
    materialConsumerContracts: number;
    maContractsMaterial: number;
    pdpContractsMaterial: number;
    publishedRows: number;
    suppressedRows: number;
  };
  starDistribution: {
    measure: string;
    counts: Record<string, number>;
    contractsWithStar: number;
  };
  topContractsByEnrollment: CountyContractHighlight[];
  lowestComplaintAmongMaterial: CountyContractHighlight[];
};

export type CountySummariesMeta = {
  enrollmentSource: string;
  enrollmentFile: string;
  contractFile: string;
  starSource: string;
  complaintSource: string;
  syncedAt: string;
  usingPlaceholderData: boolean;
};
