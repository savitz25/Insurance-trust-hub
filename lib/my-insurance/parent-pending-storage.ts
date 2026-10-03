import type { PendingParentSync } from '@/lib/my-insurance/parent-adapter';

const PREFIX = 'ith-insurance-parent-pending:v1:';

function key(slug: string): string {
  return `${PREFIX}${slug}`;
}

export function stashInsuranceParentPending(slug: string, pending: PendingParentSync): void {
  if (typeof window === 'undefined') return;
  if (pending.transmitted || pending.createsWatch) return;
  sessionStorage.setItem(key(slug), JSON.stringify(pending));
}

export function readInsuranceParentPending(slug: string): PendingParentSync | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(key(slug));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingParentSync;
    if (parsed.transmitted || parsed.createsWatch) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearInsuranceParentPending(slug: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key(slug));
}
