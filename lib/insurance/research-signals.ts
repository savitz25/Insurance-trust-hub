/**
 * Phase 6A / Phase 3 port — Research scoring honesty for Insurance Trust Hub.
 * No public score without minimum re-checkable inputs.
 */

import {
  cleanLicenseNumber,
  resolveInsuranceVerification,
  type InsuranceVerificationDisplay,
} from '@/lib/insurance/verification-levels';
import { getLicenseDepartment } from '@/lib/tools/license-verification';
import type { HubAgent } from '@/types/agent';
import type { Provider } from '@/types/provider';

export type ResearchFactor = {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

export type DataConfidenceBand = 'high' | 'medium' | 'low';

export type AgencyResearchSignals = {
  researchScore: number | null;
  dataConfidence: number;
  dataConfidenceBand: DataConfidenceBand;
  dataConfidenceLabel: string;
  license: InsuranceVerificationDisplay;
  factors: ResearchFactor[];
  measures: string;
  doesNotMeasure: string;
  methodologyPath: string;
  /** False when score suppressed for insufficient inputs */
  scorePublished: boolean;
};

export const RESEARCH_SCORE_COPY = {
  measures:
    'Public reputation signals, re-checkable license evidence, and tenure when present. Editorial research composite only.',
  doesNotMeasure:
    'Does not measure quote quality, claims handling, plan fit, or “best agent.” Not a regulator grade or NAIC endorsement.',
  methodologyPath: '/methodology',
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function dataConfidenceBand(score: number): DataConfidenceBand {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function dataConfidenceLabel(band: DataConfidenceBand): string {
  if (band === 'high') return 'High data confidence';
  if (band === 'medium') return 'Moderate data confidence';
  return 'Limited data confidence';
}

type SignalInput = {
  licenseNumber?: string | null;
  state?: string | null;
  isVerified?: boolean | null;
  yearsInBusiness?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  bbbRating?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  county?: string | null;
  hasNpi?: boolean;
  /** When true, reputation inputs are seed/synthetic and must not score */
  reputationIsSeed?: boolean;
};

function fromHubAgent(agent: HubAgent): SignalInput {
  const seed = agent.id.includes('-agent-') || agent.id.startsWith('fallback-');
  return {
    licenseNumber: agent.licenseNumber,
    state: agent.state,
    isVerified: seed ? false : agent.isVerified,
    yearsInBusiness: seed ? null : agent.yearsInBusiness,
    rating: null,
    reviewCount: null,
    bbbRating: seed ? null : agent.bbbRating,
    city: agent.city,
    phone: agent.phone,
    website: agent.website,
    county: agent.county,
    reputationIsSeed: seed,
  };
}

function fromProvider(p: Provider): SignalInput {
  const seed = p.id.startsWith('fallback-') || p.id.startsWith('seed-');
  return {
    licenseNumber: p.license_number,
    state: p.state,
    isVerified: seed ? false : p.is_verified,
    yearsInBusiness: seed ? null : p.years_in_business,
    rating: seed ? null : p.rating,
    reviewCount: seed ? null : p.review_count,
    bbbRating: seed ? null : p.bbb_rating,
    city: p.city,
    phone: p.phone,
    website: p.website,
    hasNpi: Boolean(p.npi),
    reputationIsSeed: seed,
  };
}

/**
 * Minimum verified inputs for publishing a Research Score:
 * re-checkable license number (not seed pseudo-IDs alone without real evidence path).
 */
export function hasMinimumScoreInputs(input: SignalInput): boolean {
  return Boolean(cleanLicenseNumber(input.licenseNumber));
}

export function computeResearchScore(input: SignalInput): {
  score: number | null;
  factors: ResearchFactor[];
  scorePublished: boolean;
} {
  if (!hasMinimumScoreInputs(input)) {
    return {
      score: null,
      scorePublished: false,
      factors: [
        {
          id: 'insufficient',
          label: 'Insufficient verified inputs',
          points: 0,
          maxPoints: 0,
          detail:
            'No re-checkable license number on file — Research Score suppressed (not a zero grade).',
        },
      ],
    };
  }

  const factors: ResearchFactor[] = [];
  let total = 0;

  // Reputation only when not seed
  let repPts = 0;
  if (!input.reputationIsSeed) {
    const gRating = input.rating ?? null;
    const gCount = input.reviewCount ?? 0;
    if (gRating != null && gRating > 0 && gCount > 0) {
      const quality = Math.max(0, Math.min(12, (gRating - 3.2) * 8));
      const volume =
        gCount >= 200 ? 12 : gCount >= 80 ? 9 : gCount >= 25 ? 6 : gCount >= 5 ? 3 : 1;
      repPts = clamp(quality + volume * 0.5, 0, 28);
    }
  }
  factors.push({
    id: 'reputation',
    label: 'Consumer reputation (third-party)',
    points: repPts,
    maxPoints: 28,
    detail:
      repPts > 0
        ? `Attributed snapshot · ${input.rating?.toFixed(1)} · ${input.reviewCount} reviews`
        : 'No independently verified review volume on file',
  });
  total += repPts;

  let bbbPts = 0;
  const bbb = (input.bbbRating ?? '').trim();
  if (!input.reputationIsSeed) {
    if (bbb === 'A+') bbbPts = 8;
    else if (bbb === 'A') bbbPts = 6;
    else if (bbb === 'A-') bbbPts = 4;
    else if (bbb.startsWith('B')) bbbPts = 2;
  }
  factors.push({
    id: 'bbb',
    label: 'BBB standing (third-party)',
    points: bbbPts,
    maxPoints: 12,
    detail: bbbPts > 0 ? `Grade ${bbb}` : 'BBB not independently confirmed',
  });
  total += bbbPts;

  const licenseNum = cleanLicenseNumber(input.licenseNumber);
  let licPts = 0;
  if (licenseNum && input.isVerified) licPts = 22;
  else if (licenseNum) licPts = 12;
  factors.push({
    id: 'license',
    label: 'License evidence',
    points: licPts,
    maxPoints: 22,
    detail: licenseNum
      ? input.isVerified
        ? `Re-checkable license ${licenseNum}`
        : `License ${licenseNum} on file — confirm on official lookup`
      : 'No re-checkable license number',
  });
  total += licPts;

  const years = input.yearsInBusiness;
  let tenurePts = 0;
  if (years != null && years >= 25) tenurePts = 14;
  else if (years != null && years >= 15) tenurePts = 10;
  else if (years != null && years >= 8) tenurePts = 6;
  else if (years != null && years >= 3) tenurePts = 3;
  factors.push({
    id: 'tenure',
    label: 'Operating history',
    points: tenurePts,
    maxPoints: 14,
    detail: years != null ? `${years} years in business (as listed)` : 'Tenure not available',
  });
  total += tenurePts;

  let localityPts = 0;
  if (input.county?.trim()) localityPts += 6;
  if (input.city?.trim()) localityPts += 2;
  if (input.phone?.trim() || input.website?.trim()) localityPts += 2;
  factors.push({
    id: 'identity-fields',
    label: 'Identity completeness',
    points: localityPts,
    maxPoints: 10,
    detail: input.city ? `City on file (${input.city})` : 'Locality incomplete',
  });
  total += localityPts;

  const npiPts = input.hasNpi ? 8 : 0;
  factors.push({
    id: 'npi',
    label: 'CMS NPI on file',
    points: npiPts,
    maxPoints: 8,
    detail: input.hasNpi ? 'NPI present' : 'No NPI on listing',
  });
  total += npiPts;

  return { score: clamp(total, 0, 100), factors, scorePublished: true };
}

export function computeDataConfidence(input: SignalInput): number {
  let pts = 0;
  if (cleanLicenseNumber(input.licenseNumber)) pts += 28;
  if (input.state?.trim()) pts += 10;
  if (input.county?.trim()) pts += 12;
  if (input.city?.trim()) pts += 10;
  if (input.phone?.trim() && !input.reputationIsSeed) pts += 8;
  if (input.website?.trim()) pts += 8;
  if (!input.reputationIsSeed && (input.reviewCount ?? 0) > 0) pts += 12;
  if (input.bbbRating?.trim() && !input.reputationIsSeed) pts += 6;
  if (input.yearsInBusiness != null && !input.reputationIsSeed) pts += 6;
  return clamp(pts, 0, 100);
}

export function assessAgencyResearchSignals(
  entity: HubAgent | Provider
): AgencyResearchSignals {
  const input =
    'license_number' in entity || 'is_verified' in entity
      ? fromProvider(entity as Provider)
      : fromHubAgent(entity as HubAgent);

  const dept = getLicenseDepartment(input.state ?? '');
  const license = resolveInsuranceVerification({
    licenseNumber: input.licenseNumber,
    licenseState: input.state,
    isVerified: input.isVerified,
    sourceLabel: dept?.department ?? null,
    sourceUrl: dept?.lookupUrl ?? null,
  });

  const { score, factors, scorePublished } = computeResearchScore(input);
  const dataConfidence = computeDataConfidence(input);
  const band = dataConfidenceBand(dataConfidence);

  return {
    researchScore: score,
    dataConfidence,
    dataConfidenceBand: band,
    dataConfidenceLabel: dataConfidenceLabel(band),
    license,
    factors,
    measures: RESEARCH_SCORE_COPY.measures,
    doesNotMeasure: RESEARCH_SCORE_COPY.doesNotMeasure,
    methodologyPath: RESEARCH_SCORE_COPY.methodologyPath,
    scorePublished,
  };
}
