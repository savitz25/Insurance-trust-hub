/**
 * Provider Trust Score (Insurance Trust Hub).
 *
 * Factors: Google reviews, BBB standing, DOI verification, tenure, Government Standing (CMS Phase 1).
 * Missing CMS data is scored neutrally — never breaks calculation.
 */

import {
  computeGovernmentStandingScore,
  governmentStandingToTrustBoost,
  GOVERNMENT_STANDING_LABELS,
} from '@/lib/insurance/cms/government-standing';
import type { CmsParticipationStatus } from '@/lib/insurance/cms/types';

function gradeToTrustBoost(rating: string | null | undefined): number {
  if (!rating) return 0;
  const map: Record<string, number> = {
    'A+': 8,
    A: 6,
    'A-': 4,
    'B+': 2,
    B: 0,
    'B-': -2,
  };
  return map[rating] ?? 0;
}

export type TrustScoreInput = {
  googleRating?: number | null;
  googleReviewCount?: number | null;
  bbbRating?: string | null;
  bbbAccredited?: boolean | null;
  isVerified?: boolean;
  yearsInBusiness?: number | null;
  /** Phase 1 CMS — optional; defaults to neutral Government Standing */
  cmsParticipation?: CmsParticipationStatus | null;
  hasNpi?: boolean;
  isMedicareSpecialist?: boolean;
  complaintRatePerThousand?: number | null;
  hasEnforcementFlag?: boolean | null;
};

export type TrustScoreFactor = {
  id: string;
  label: string;
  points: number;
  detail: string;
};

export type TrustScoreBreakdown = {
  total: number;
  base: number;
  factors: TrustScoreFactor[];
  governmentStanding: number;
};

export type TrustScoreInputPhase6 = TrustScoreInput & {
  /** Re-checkable license number required for a public score */
  licenseNumber?: string | null;
  /** When true, inputs are seed — return null total */
  isSeed?: boolean;
};

/**
 * Phase 6A: null total when seed or no re-checkable license number.
 * Prefer incomplete over decorative 90+ scores.
 */
export function computeProviderTrustScoreBreakdown(
  input: TrustScoreInputPhase6
): TrustScoreBreakdown & { published: boolean } {
  const licenseOk =
    Boolean(input.licenseNumber && /\d/.test(String(input.licenseNumber))) &&
    !/[✅✓]/.test(String(input.licenseNumber ?? ''));

  if (input.isSeed || !licenseOk) {
    return {
      total: 0,
      base: 0,
      factors: [
        {
          id: 'insufficient',
          label: 'Insufficient verified inputs',
          points: 0,
          detail:
            'Research Score suppressed — need a re-checkable license number (seed listings never score).',
        },
      ],
      governmentStanding: 0,
      published: false,
    };
  }

  const base = 38;
  const factors: TrustScoreFactor[] = [];

  let googlePts = 0;
  const googleRating = input.googleRating;
  const reviewCount = input.googleReviewCount ?? 0;
  if (googleRating != null && reviewCount > 0) {
    googlePts += (googleRating - 3.5) * 6;
  }
  if (reviewCount > 25) googlePts += 2;
  if (reviewCount > 100) googlePts += 2;
  googlePts = Math.round(Math.max(0, googlePts));
  factors.push({
    id: 'consumer-reputation',
    label: 'Consumer Reputation',
    points: googlePts,
    detail:
      googleRating != null && reviewCount > 0
        ? `Attributed snapshot · ${googleRating.toFixed(1)} · ${reviewCount} reviews`
        : 'No independently attributed review volume',
  });

  const bbbPts =
    gradeToTrustBoost(input.bbbRating) + (input.bbbAccredited ? 3 : 0);
  factors.push({
    id: 'bbb',
    label: 'BBB Standing',
    points: bbbPts,
    detail: input.bbbRating
      ? `Grade ${input.bbbRating}${input.bbbAccredited ? ' · Accredited' : ''}`
      : 'BBB rating not available',
  });

  const licensePts = input.isVerified && licenseOk ? 18 : licenseOk ? 10 : 0;
  factors.push({
    id: 'licensing',
    label: 'Licensing & Verification',
    points: licensePts,
    detail:
      input.isVerified && licenseOk
        ? 'Re-checkable license number on file'
        : licenseOk
          ? 'License number on file — confirm status on official lookup'
          : 'No re-checkable license number',
  });

  let tenurePts = 0;
  if (input.yearsInBusiness != null && input.yearsInBusiness >= 10) tenurePts += 3;
  if (input.yearsInBusiness != null && input.yearsInBusiness >= 20) tenurePts += 2;
  factors.push({
    id: 'experience',
    label: 'Experience',
    points: tenurePts,
    detail:
      input.yearsInBusiness != null
        ? `${input.yearsInBusiness} years in business`
        : 'Tenure not available',
  });

  const governmentStanding = computeGovernmentStandingScore({
    cmsParticipation: input.cmsParticipation,
    hasNpi: input.hasNpi,
    isMedicareSpecialist: input.isMedicareSpecialist,
    isLicenseVerified: input.isVerified,
    complaintRatePerThousand: input.complaintRatePerThousand,
    hasEnforcementFlag: input.hasEnforcementFlag,
  });
  const govBoost = governmentStandingToTrustBoost(governmentStanding);
  factors.push({
    id: 'government-standing',
    label: GOVERNMENT_STANDING_LABELS.factor,
    points: govBoost,
    detail: `${GOVERNMENT_STANDING_LABELS.description} Sub-score ${governmentStanding}/100.`,
  });

  const total = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        base +
          factors.reduce((sum, f) => sum + f.points, 0)
      )
    )
  );

  return { total, base, factors, governmentStanding, published: true };
}

export function computeProviderTrustScore(input: TrustScoreInputPhase6): number | null {
  const b = computeProviderTrustScoreBreakdown(input);
  return b.published ? b.total : null;
}
