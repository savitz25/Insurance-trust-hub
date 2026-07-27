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

export function computeProviderTrustScoreBreakdown(input: TrustScoreInput): TrustScoreBreakdown {
  const base = 65;
  const factors: TrustScoreFactor[] = [];

  let googlePts = 0;
  const googleRating = input.googleRating;
  const reviewCount = input.googleReviewCount ?? 0;
  if (googleRating != null) {
    googlePts += (googleRating - 3.5) * 8;
  }
  if (reviewCount > 25) googlePts += 2;
  if (reviewCount > 100) googlePts += 3;
  if (reviewCount > 300) googlePts += 2;
  googlePts = Math.round(googlePts);
  factors.push({
    id: 'consumer-reputation',
    label: 'Consumer Reputation',
    points: googlePts,
    detail:
      googleRating != null
        ? `Google ${googleRating.toFixed(1)} · ${reviewCount} reviews`
        : 'Google rating not available',
  });

  const bbbPts =
    gradeToTrustBoost(input.bbbRating) + (input.bbbAccredited ? 5 : 0);
  factors.push({
    id: 'bbb',
    label: 'BBB Standing',
    points: bbbPts,
    detail: input.bbbRating
      ? `Grade ${input.bbbRating}${input.bbbAccredited ? ' · Accredited' : ''}`
      : 'BBB rating not available',
  });

  const licensePts = input.isVerified ? 3 : 0;
  factors.push({
    id: 'licensing',
    label: 'Licensing & Verification',
    points: licensePts,
    detail: input.isVerified
      ? 'DOI-verified listing on Insurance Trust Hub'
      : 'Listing not marked DOI-verified',
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

  return { total, base, factors, governmentStanding };
}

export function computeProviderTrustScore(input: TrustScoreInput): number {
  return computeProviderTrustScoreBreakdown(input).total;
}
