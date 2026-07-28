import type { GuestSavedProvider, PendingSaveAction } from '@/lib/my-insurance/types';
import {
  GUEST_SAVED_PROVIDERS_KEY,
  PENDING_SAVE_ACTION_KEY,
  POST_LOGIN_REDIRECT_KEY,
} from '@/lib/my-insurance/constants';

export function getGuestSavedProviders(): GuestSavedProvider[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_SAVED_PROVIDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestSavedProvider[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestProvider(providerSlug: string, providerName: string): void {
  if (typeof window === 'undefined') return;
  const existing = getGuestSavedProviders().filter((p) => p.providerSlug !== providerSlug);
  existing.unshift({
    providerSlug,
    providerName,
    savedAt: new Date().toISOString(),
  });
  localStorage.setItem(GUEST_SAVED_PROVIDERS_KEY, JSON.stringify(existing.slice(0, 50)));
}

export function removeGuestProvider(providerSlug: string): void {
  if (typeof window === 'undefined') return;
  const next = getGuestSavedProviders().filter((p) => p.providerSlug !== providerSlug);
  localStorage.setItem(GUEST_SAVED_PROVIDERS_KEY, JSON.stringify(next));
}

export function clearGuestSavedProviders(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_SAVED_PROVIDERS_KEY);
}

export function stashPendingSaveAction(action: PendingSaveAction): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_SAVE_ACTION_KEY, JSON.stringify(action));
}

export function consumePendingSaveAction(): PendingSaveAction | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_SAVE_ACTION_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_SAVE_ACTION_KEY);
  try {
    return JSON.parse(raw) as PendingSaveAction;
  } catch {
    return null;
  }
}

export function peekPendingSaveAction(): PendingSaveAction | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_SAVE_ACTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSaveAction;
  } catch {
    return null;
  }
}

export function stashPostLoginRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
}

export function consumePostLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  const path = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return path;
}
