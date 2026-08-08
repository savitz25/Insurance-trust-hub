/**
 * Phase 6B2 — BBB secondary signal (operator-attested or structured paste).
 * No scraping of BBB in violation of ToS; operators enter profile URL + grade
 * after confirming identity on bbb.org.
 */

import type { Provider } from '@/types/provider';
import type { BbbSnapshot } from '@/lib/enrichment/types';
import type { ExternalBusinessCandidate } from '@/lib/enrichment/match';
import { scoreBusinessMatch } from '@/lib/enrichment/match';

export type BbbManualInput = {
  profileUrl: string;
  rating?: string;
  accredited?: boolean;
  businessName?: string;
  city?: string;
  state?: string;
  notes?: string;
  identityMatchAccepted: boolean;
};

/**
 * Validate and build BBB snapshot. Requires operator identity match + high score.
 */
export function buildBbbSnapshotFromManual(
  provider: Provider,
  input: BbbManualInput
): { ok: true; snapshot: BbbSnapshot } | { ok: false; reason: string } {
  if (!input.identityMatchAccepted) {
    return { ok: false, reason: 'Identity match not accepted for BBB profile' };
  }
  const url = input.profileUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, reason: 'BBB profileUrl must be an http(s) URL' };
  }
  if (!/bbb\.org/i.test(url)) {
    return { ok: false, reason: 'BBB profileUrl should be a bbb.org URL' };
  }

  const candidate: ExternalBusinessCandidate = {
    name: input.businessName || provider.name,
    website: undefined,
    address: undefined,
    city: input.city || provider.city,
    state: input.state || provider.state,
    profileUrl: url,
  };

  const match = scoreBusinessMatch(provider, candidate);
  // BBB often lacks phone/web in manual entry — allow high when city+state+name strong
  // or operator accepted + name/state align with score >= 45
  if (!match.accept && match.score < 45) {
    return {
      ok: false,
      reason: `Weak BBB identity match (score=${match.score}): ${match.reasons.join('; ')}`,
    };
  }

  const rating = (input.rating ?? '').trim() || null;
  if (rating && !/^[A-F][+-]?$/i.test(rating) && rating.toLowerCase() !== 'nr') {
    return { ok: false, reason: 'BBB rating must look like A+, A, B-, NR, etc.' };
  }

  return {
    ok: true,
    snapshot: {
      profileUrl: url,
      rating,
      accredited: input.accredited ?? null,
      businessName: input.businessName ?? provider.name,
      checkedAt: new Date().toISOString(),
      method: 'manual',
      matchConfidence: match.accept ? 'high' : 'medium',
      matchNotes: [match.reasons.join('; '), input.notes].filter(Boolean).join(' · '),
    },
  };
}
