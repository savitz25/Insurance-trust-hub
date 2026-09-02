/**
 * NJ-INS-003 profile attach gate.
 * Exact NAIC only. Review / unresolved / name-only / individual never attach.
 * Does not expand the public legal-insurer cohort.
 */
import { getPublishedByNaic } from '@/lib/national/legal-insurer-pilot';

export type NjAttachInput = {
  matchStatus?: string | null;
  naicCocode?: string | null;
  isIndividual?: boolean;
  family?: string | null;
};

export type NjAttachResult =
  | { status: 'EXACT'; identifierType: 'NAIC'; href: string }
  | { status: 'WITHHELD'; reason: string };

const WITHHOLD_STATUS = new Set([
  'REVIEW_REQUIRED',
  'UNRESOLVED',
  'UNSAFE_REJECTED',
  'INTERNAL_ONLY_INDIVIDUAL',
  'NAME_ONLY',
]);

export function attachNjInsuranceEvidence(input: NjAttachInput): NjAttachResult {
  if (input.isIndividual) {
    return { status: 'WITHHELD', reason: 'individual_not_public' };
  }
  const status = String(input.matchStatus || '').toUpperCase();
  if (WITHHOLD_STATUS.has(status) || status.includes('UNRESOLVED') || status.includes('REVIEW')) {
    return { status: 'WITHHELD', reason: 'unresolved_or_review' };
  }
  const family = String(input.family || '').toUpperCase();
  if (family.includes('MARKET_CONDUCT') && status !== 'EXACT') {
    return { status: 'WITHHELD', reason: 'ambiguous_market_conduct' };
  }
  const naic = String(input.naicCocode || '').replace(/\D/g, '');
  if (status !== 'EXACT' || !/^\d{5}$/.test(naic)) {
    return { status: 'WITHHELD', reason: 'not_exact_naic' };
  }
  const published = getPublishedByNaic(naic);
  if (!published) {
    return { status: 'WITHHELD', reason: 'no_published_legal_insurer_profile' };
  }
  return {
    status: 'EXACT',
    identifierType: 'NAIC',
    href: `/insurers/${published.slug}`,
  };
}
