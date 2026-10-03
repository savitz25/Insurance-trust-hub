import type { ParentIntent, PendingParentSync } from '@/lib/my-insurance/parent-adapter';

export const INSURANCE_PARENT_SYNC = 'OFF' as const;

/**
 * Top-level form shape for a later parent handoff.
 * Production does not assign an action and does not navigate.
 */
export type BlockedTopLevelHandoff = {
  method: 'POST';
  target: '_top';
  submitted: false;
  reason: 'PRODUCTION_PARENT_SYNC_OFF';
  fields: {
    hub: 'insurance';
    profileClass: 'insurance_provider';
    intent: ParentIntent;
  };
};

export function buildBlockedTopLevelHandoff(intent: ParentIntent): BlockedTopLevelHandoff {
  return {
    method: 'POST',
    target: '_top',
    submitted: false,
    reason: 'PRODUCTION_PARENT_SYNC_OFF',
    fields: {
      hub: 'insurance',
      profileClass: 'insurance_provider',
      intent,
    },
  };
}

export function submitParentHandoff(_intent: ParentIntent): {
  submitted: boolean;
  reason: 'PRODUCTION_PARENT_SYNC_OFF';
} {
  return { submitted: false, reason: 'PRODUCTION_PARENT_SYNC_OFF' };
}

/**
 * Keep-page-open and abandoned-marker recovery.
 * Sync is off, so a live marker is held locally and never submitted.
 */
export function recoverParentPending(input: {
  pending: PendingParentSync | null;
  now: number;
  pageOpen: boolean;
  locallySaved: boolean;
}): 'hold' | 'abandon' {
  const pending = input.pending;
  if (!pending || !input.pageOpen) return 'abandon';
  if (pending.transmitted || pending.createsWatch) return 'abandon';
  if (!Number.isFinite(pending.expiresAt) || pending.expiresAt <= input.now) return 'abandon';
  if (pending.intent === 'save' && !input.locallySaved) return 'abandon';
  if (pending.intent === 'unsave' && input.locallySaved) return 'abandon';
  return 'hold';
}
