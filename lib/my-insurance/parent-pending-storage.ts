import type { PendingParentSync } from '@/lib/my-insurance/parent-adapter';
import { IDENTIFIER_NAMESPACE } from '@/lib/my-insurance/parent-adapter';

const PREFIX = 'ith-insurance-parent-pending:v1:';

function key(slug: string): string {
  return `${PREFIX}${slug}`;
}

function isPending(value: unknown, now: number): value is PendingParentSync {
  if (!value || typeof value !== 'object') return false;
  const pending = value as PendingParentSync;
  return (
    pending.version === 'insurance-parent-prep/2' &&
    (pending.intent === 'save' || pending.intent === 'unsave') &&
    pending.identifierNamespace === IDENTIFIER_NAMESPACE &&
    pending.profileClass === 'insurance_provider' &&
    pending.status === 'pending' &&
    pending.transmitted === false &&
    pending.createsWatch === false &&
    pending.pageOpen === true &&
    typeof pending.sourceIdentifier === 'string' &&
    pending.sourceIdentifier.length > 0 &&
    typeof pending.jurisdiction === 'string' &&
    typeof pending.canonicalReturnPath === 'string' &&
    typeof pending.manifestDigest === 'string' &&
    Number.isFinite(pending.expiresAt) &&
    pending.expiresAt > now
  );
}

export function stashInsuranceParentPending(slug: string, pending: PendingParentSync): void {
  if (typeof window === 'undefined') return;
  if (!isPending(pending, Date.now())) return;
  sessionStorage.setItem(key(slug), JSON.stringify(pending));
}

export function readInsuranceParentPending(slug: string, now = Date.now()): PendingParentSync | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(key(slug));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPending(parsed, now)) {
      sessionStorage.removeItem(key(slug));
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(key(slug));
    return null;
  }
}

export function clearInsuranceParentPending(slug: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key(slug));
}
