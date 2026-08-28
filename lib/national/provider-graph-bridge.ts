/**
 * INS-NAT-FINAL-005 — public provider → canonical agency publication bridge.
 * Exact NPN only. Name is never a bridge key.
 */

import { normalizeNpn } from './npn';
import type { IdentityConfidence } from './types';

export const BRIDGE_TASK = 'INS-NAT-FINAL-005';
export const BRIDGE_MATCH_METHOD = 'exact_npn' as const;

export type ProviderBridgeDecision =
  | {
      action: 'bridge';
      confidence: 'CONFIRMED';
      npn: string;
      matchMethod: typeof BRIDGE_MATCH_METHOD;
    }
  | {
      action: 'hold';
      confidence: 'REVIEW_REQUIRED';
      npn: string | null;
      reason: string;
    }
  | {
      action: 'skip';
      confidence: 'UNRESOLVED';
      npn: string | null;
      reason: string;
    };

function npnFromNotes(notes: string | null | undefined): string | null {
  const m = String(notes || '').match(/\bNPN\s+([0-9]{5,10})\b/i);
  return normalizeNpn(m?.[1] ?? null);
}

export function extractProviderNpn(input: {
  npn?: string | null;
  licenseNotes?: string | null;
  licenseInfo?: unknown;
}): string | null {
  const direct = normalizeNpn(input.npn);
  if (direct) return direct;
  const fromNotes = npnFromNotes(input.licenseNotes);
  if (fromNotes) return fromNotes;
  const li = input.licenseInfo as
    | { licenses?: Array<{ notes?: string; npn?: string }> }
    | null
    | undefined;
  for (const lic of li?.licenses || []) {
    const n = normalizeNpn(lic.npn) || npnFromNotes(lic.notes);
    if (n) return n;
  }
  return null;
}

export function decideProviderAgencyBridge(input: {
  providerNpn?: string | null;
  agencyIdsForNpn: string[];
  otherProviderIdsForNpn: string[];
}): ProviderBridgeDecision {
  const npn = normalizeNpn(input.providerNpn);
  if (!npn) {
    return { action: 'skip', confidence: 'UNRESOLVED', npn: null, reason: 'missing_npn' };
  }
  if (input.agencyIdsForNpn.length === 0) {
    return { action: 'skip', confidence: 'UNRESOLVED', npn, reason: 'no_graph_agency_for_npn' };
  }
  if (input.agencyIdsForNpn.length > 1) {
    return {
      action: 'hold',
      confidence: 'REVIEW_REQUIRED',
      npn,
      reason: 'multiple_graph_agencies_same_npn',
    };
  }
  if (input.otherProviderIdsForNpn.length > 0) {
    return {
      action: 'hold',
      confidence: 'REVIEW_REQUIRED',
      npn,
      reason: 'multiple_public_providers_same_npn',
    };
  }
  return { action: 'bridge', confidence: 'CONFIRMED', npn, matchMethod: BRIDGE_MATCH_METHOD };
}

export function nameOnlyProviderBridges(): false {
  return false;
}

export type AgencyPublicationReadiness =
  | 'READY_FOR_PUBLIC_PROFILE'
  | 'INTERNAL_ONLY'
  | 'REVIEW_REQUIRED'
  | 'NOT_READY';

export function classifyAgencyPublicationReadiness(input: {
  identityConfidence: IdentityConfidence;
  hasNpn: boolean;
  hasCredential: boolean;
  kindCollision: boolean;
}): AgencyPublicationReadiness {
  if (input.kindCollision) return 'REVIEW_REQUIRED';
  if (input.identityConfidence === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (!input.hasNpn || !input.hasCredential) return 'NOT_READY';
  if (input.identityConfidence !== 'CONFIRMED') return 'INTERNAL_ONLY';
  return 'READY_FOR_PUBLIC_PROFILE';
}

/** NPN identity is not a license_credentials row. */
export function npnAloneIsNotCredential(): true {
  return true;
}

export type ExpectedBridge = {
  providerId: string;
  entityId: string;
  npn: string;
};

export type ExistingBridgeRow = {
  id: string;
  providerId: string;
  entityId: string | null;
  matchMethod: string | null;
  confidence: string | null;
  source: string | null;
  notes: string | null;
  matchedAt: string | null;
};

export type StaleBridgeRow = ExistingBridgeRow & { reason: string };

export type BridgeReconciliation = {
  expected: number;
  existingCorrect: number;
  missing: number;
  staleExtra: number;
  wrongTarget: number;
  duplicate: number;
};

export function buildExpectedConfirmedBridges(input: {
  providers: Array<{ id: string; npn: string | null }>;
  agenciesByNpn: Map<string, string[]>;
  providersByNpn: Map<string, string[]>;
}): ExpectedBridge[] {
  const out: ExpectedBridge[] = [];
  for (const p of input.providers) {
    const agencyIds = p.npn ? input.agenciesByNpn.get(p.npn) ?? [] : [];
    const otherProviders = p.npn
      ? (input.providersByNpn.get(p.npn) ?? []).filter((id) => id !== p.id)
      : [];
    const d = decideProviderAgencyBridge({
      providerNpn: p.npn,
      agencyIdsForNpn: agencyIds,
      otherProviderIdsForNpn: otherProviders,
    });
    if (d.action === 'bridge') {
      out.push({ providerId: p.id, entityId: agencyIds[0]!, npn: d.npn });
    }
  }
  return out;
}

export function reconcileProviderBridges(input: {
  expected: ExpectedBridge[];
  existing: ExistingBridgeRow[];
}): {
  summary: BridgeReconciliation;
  correct: ExistingBridgeRow[];
  missing: ExpectedBridge[];
  staleExtra: StaleBridgeRow[];
  wrongTarget: Array<StaleBridgeRow & { expectedEntityId: string }>;
  duplicates: StaleBridgeRow[];
} {
  const expectedByProvider = new Map(input.expected.map((e) => [e.providerId, e]));
  const existingProviders = new Set(input.existing.map((e) => e.providerId));
  const seen = new Set<string>();
  const correct: ExistingBridgeRow[] = [];
  const staleExtra: StaleBridgeRow[] = [];
  const wrongTarget: Array<StaleBridgeRow & { expectedEntityId: string }> = [];
  const duplicates: StaleBridgeRow[] = [];

  for (const row of input.existing) {
    if (seen.has(row.providerId)) {
      duplicates.push({ ...row, reason: 'duplicate_provider_id' });
      continue;
    }
    seen.add(row.providerId);
    const exp = expectedByProvider.get(row.providerId);
    if (!exp) {
      staleExtra.push({ ...row, reason: 'not_in_deterministic_confirmed_set' });
      continue;
    }
    if (row.confidence !== 'CONFIRMED' || row.matchMethod !== BRIDGE_MATCH_METHOD) {
      wrongTarget.push({
        ...row,
        expectedEntityId: exp.entityId,
        reason: 'not_confirmed_exact_npn',
      });
      continue;
    }
    if (!row.entityId || row.entityId !== exp.entityId) {
      wrongTarget.push({
        ...row,
        expectedEntityId: exp.entityId,
        reason: 'wrong_entity_id',
      });
      continue;
    }
    correct.push(row);
  }

  const missing = input.expected.filter((e) => !existingProviders.has(e.providerId));
  return {
    summary: {
      expected: input.expected.length,
      existingCorrect: correct.length,
      missing: missing.length,
      staleExtra: staleExtra.length,
      wrongTarget: wrongTarget.length,
      duplicate: duplicates.length,
    },
    correct,
    missing,
    staleExtra,
    wrongTarget,
    duplicates,
  };
}
