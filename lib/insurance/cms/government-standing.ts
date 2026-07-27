/**
 * Government Standing — Trust Score factor (Phase 1 CMS integration).
 *
 * Sub-score 0–100. Missing CMS data returns a neutral mid-score so calculation never breaks.
 * Adjust weights here only; UI reads labels from GOVERNMENT_STANDING_LABELS.
 */

import type { GovernmentStandingInput, CmsParticipationStatus } from '@/lib/insurance/cms/types';

export const GOVERNMENT_STANDING_WEIGHT = 0.12; // 12% of composite when CMS signals present

export const GOVERNMENT_STANDING_LABELS = {
  factor: 'Government Standing',
  description:
    'CMS participation signals, Medicare focus, license verification, and (when available) plan complaint standing. Missing CMS data is scored neutrally — not as a penalty.',
} as const;

function participationPoints(status: CmsParticipationStatus | null | undefined): number {
  switch (status) {
    case 'active':
      return 28;
    case 'pending':
      return 12;
    case 'inactive':
      return -8;
    case 'not_found':
      return 0;
    case 'not_applicable':
      return 10;
    default:
      return 8; // unknown — slight neutral credit for not fabricating
  }
}

/**
 * Returns Government Standing sub-score 0–100.
 * Neutral baseline 50 when almost no signals exist.
 */
export function computeGovernmentStandingScore(input: GovernmentStandingInput): number {
  let score = 50;

  score += participationPoints(input.cmsParticipation ?? null);

  if (input.hasNpi) score += 10;
  if (input.isMedicareSpecialist) score += 12;
  if (input.isLicenseVerified) score += 14;

  const rate = input.complaintRatePerThousand;
  if (rate != null && Number.isFinite(rate)) {
    // Lower complaint rates are better (illustrative bands until real CMS import)
    if (rate <= 0.05) score += 12;
    else if (rate <= 0.15) score += 6;
    else if (rate <= 0.3) score += 0;
    else if (rate <= 0.5) score -= 8;
    else score -= 16;
  }

  if (input.hasEnforcementFlag === true) score -= 25;
  if (input.hasEnforcementFlag === false) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Maps Government Standing (0–100) to additive points for the composite Trust Score
 * (same scale as BBB/Google boosts in computeProviderTrustScore).
 */
export function governmentStandingToTrustBoost(standingScore: number): number {
  // 50 → 0; 100 → +8; 0 → −6
  if (standingScore >= 50) {
    return Math.round(((standingScore - 50) / 50) * 8);
  }
  return Math.round(((standingScore - 50) / 50) * 6);
}
