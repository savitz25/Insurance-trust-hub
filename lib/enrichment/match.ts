/**
 * Phase 6B2 — identity match for third-party profiles.
 * Weak / ambiguous matches must skip (not force-fill).
 */

import type { Provider } from '@/types/provider';
import type { EnrichmentMatchConfidence } from '@/lib/enrichment/types';
import { isPlaceholderPhone } from '@/lib/provenance/phone';

export type ExternalBusinessCandidate = {
  name?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  placeId?: string | null;
  profileUrl?: string | null;
  businessStatus?: string | null;
  /** Google Places types / primaryType when available */
  types?: string[] | null;
  primaryType?: string | null;
};

export type MatchResult = {
  confidence: EnrichmentMatchConfidence;
  score: number;
  reasons: string[];
  accept: boolean;
};

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(llc|inc|corp|co|agency|insurance|group|partners|services|the)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function digits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '');
}

function hostOf(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Score a single external candidate against a licensed provider.
 * accept only when confidence === high (strong multi-signal match).
 */
export function scoreBusinessMatch(
  provider: Provider,
  candidate: ExternalBusinessCandidate
): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const pName = normName(provider.name);
  const cName = normName(candidate.name ?? '');
  if (!cName) {
    return { confidence: 'none', score: 0, reasons: ['Candidate missing name'], accept: false };
  }

  if (pName === cName) {
    score += 40;
    reasons.push('Exact name match');
  } else if (pName.includes(cName) || cName.includes(pName)) {
    score += 22;
    reasons.push('Partial name match');
  } else {
    // token overlap
    const pt = new Set(pName.split(' ').filter((t) => t.length > 2));
    const ct = cName.split(' ').filter((t) => t.length > 2);
    const hit = ct.filter((t) => pt.has(t)).length;
    if (hit >= 2) {
      score += 16;
      reasons.push(`Name token overlap (${hit})`);
    } else if (hit === 1) {
      score += 6;
      reasons.push('Weak name token overlap');
    } else {
      reasons.push('Name mismatch');
    }
  }

  const pState = (provider.state ?? '').toUpperCase();
  const cState = (candidate.state ?? '').toUpperCase();
  if (pState && cState) {
    if (pState === cState) {
      score += 15;
      reasons.push('State match');
    } else {
      score -= 25;
      reasons.push('State mismatch');
    }
  }

  const pCity = (provider.city ?? '').toLowerCase().trim();
  const cCity = (candidate.city ?? '').toLowerCase().trim();
  const cAddr = (candidate.address ?? '').toLowerCase();
  if (pCity && (cCity === pCity || cAddr.includes(pCity))) {
    score += 12;
    reasons.push('City/locality match');
  }

  const pPhone = digits(provider.phone);
  const cPhone = digits(candidate.phone);
  if (pPhone.length >= 10 && cPhone.length >= 10) {
    if (isPlaceholderPhone(provider.phone) || isPlaceholderPhone(candidate.phone)) {
      reasons.push('Phone ignored (placeholder)');
    } else if (pPhone.slice(-10) === cPhone.slice(-10)) {
      score += 25;
      reasons.push('Phone match');
    }
  }

  const pHost = hostOf(provider.website);
  const cHost = hostOf(candidate.website);
  if (pHost && cHost) {
    if (pHost === cHost) {
      score += 25;
      reasons.push('Website domain match');
    } else if (pHost.includes(cHost) || cHost.includes(pHost)) {
      score += 12;
      reasons.push('Website domain partial match');
    }
  }

  if (
    candidate.businessStatus &&
    /CLOSED|PERMANENTLY_CLOSED/i.test(candidate.businessStatus)
  ) {
    score -= 10;
    reasons.push(`Business status: ${candidate.businessStatus}`);
  }

  // Soft insurance / finance type signal from Places (not realty/dealer)
  const types = [
    ...(candidate.types ?? []),
    candidate.primaryType ?? '',
  ]
    .filter(Boolean)
    .map((t) => t.toLowerCase());
  if (types.some((t) => /insurance_agency|insurance_agent|insurance\b/.test(t))) {
    score += 10;
    reasons.push('Places type suggests insurance/finance');
  } else if (types.some((t) => /finance|financial_consultant|accounting/.test(t))) {
    score += 6;
    reasons.push('Places type suggests insurance/finance');
  } else if (
    types.some((t) =>
      /car_dealer|motorcycle_dealer|roofing_contractor|general_contractor|real_estate_agency|restaurant|lodging|hotel/.test(
        t
      )
    )
  ) {
    score -= 35;
    reasons.push('Places type looks unrelated to insurance');
  } else if (
    types.length > 0 &&
    types.every((t) =>
      /restaurant|food|lodging|church|school|park|gas_station|bar|cafe/.test(t)
    )
  ) {
    score -= 30;
    reasons.push('Places type looks unrelated to insurance');
  }

  // Name-only floor: never accept without locality or phone/web corroboration
  const hasCorroboration =
    reasons.some((r) =>
      /Phone match|Website domain|City\/locality|State match/.test(r)
    ) && score >= 45;

  let confidence: EnrichmentMatchConfidence = 'none';
  if (score >= 70 && hasCorroboration) confidence = 'high';
  else if (score >= 45) confidence = 'medium';
  else if (score >= 20) confidence = 'low';

  // Name-only boosts cannot be high
  if (
    confidence === 'high' &&
    !reasons.some((r) => /Phone match|Website domain match/.test(r)) &&
    !reasons.some((r) => /City\/locality match/.test(r) && /State match/.test(r))
  ) {
    confidence = 'medium';
    reasons.push('Downgraded: need phone/web or city+state corroboration for high');
  }

  const accept = confidence === 'high';
  if (!accept && confidence !== 'none') {
    reasons.push('Below publish threshold — skip enrichment');
  }

  return { confidence, score, reasons, accept };
}

/**
 * When multiple candidates exist, only accept if top is high and clear winner.
 */
export function pickBestMatch(
  provider: Provider,
  candidates: ExternalBusinessCandidate[]
): { best: ExternalBusinessCandidate | null; match: MatchResult; ambiguous: boolean } {
  if (!candidates.length) {
    return {
      best: null,
      match: { confidence: 'none', score: 0, reasons: ['No candidates'], accept: false },
      ambiguous: false,
    };
  }

  const scored = candidates
    .map((c) => ({ c, m: scoreBusinessMatch(provider, c) }))
    .sort((a, b) => b.m.score - a.m.score);

  const top = scored[0]!;
  const second = scored[1];

  if (
    second &&
    top.m.accept &&
    second.m.score >= top.m.score - 8 &&
    second.m.confidence !== 'none'
  ) {
    return {
      best: null,
      match: {
        confidence: 'low',
        score: top.m.score,
        reasons: [
          ...top.m.reasons,
          `Ambiguous: second candidate within 8 points (${second.m.score})`,
        ],
        accept: false,
      },
      ambiguous: true,
    };
  }

  return { best: top.m.accept ? top.c : null, match: top.m, ambiguous: false };
}
