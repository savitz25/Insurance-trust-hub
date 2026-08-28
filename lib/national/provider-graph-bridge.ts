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
