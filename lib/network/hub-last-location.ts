/**
 * Cross-hub last-location memory (client-side).
 *
 * localStorage is per-origin, so each hub only stores its own path.
 * Switch Hub links to `/?hub_resume=1` on the target origin; the target
 * restores its saved path (or stays on homepage if none).
 */

export type SpecialistHubId = 'move' | 'lender' | 'insurance';

export const HUB_RESUME_PARAM = 'hub_resume';

export const HUB_HOME: Record<SpecialistHubId, string> = {
  move: 'https://www.movetrusthub.com',
  lender: 'https://www.lendertrusthub.com',
  insurance: 'https://www.insurancetrusthub.com',
};

function storageKey(hubId: SpecialistHubId): string {
  return `trusthub:lastLocation:${hubId}`;
}

export function isSpecialistHubId(id: string): id is SpecialistHubId {
  return id === 'move' || id === 'lender' || id === 'insurance';
}

/** Safe in-hub path only (pathname + search). Invalid → null. */
export function sanitizeHubPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let path = raw.trim();
  if (!path) return null;

  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const u = new URL(path);
      path = `${u.pathname}${u.search}`;
    }
  } catch {
    return null;
  }

  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('://')) return null;
  if (path.length > 2000) return null;

  try {
    const u = new URL(path, 'https://example.invalid');
    u.searchParams.delete(HUB_RESUME_PARAM);
    path = `${u.pathname}${u.search || ''}`;
  } catch {
    return null;
  }

  const lower = path.toLowerCase();
  if (lower.startsWith('/api/')) return null;
  if (lower.startsWith('/_next')) return null;
  if (lower.startsWith('/auth/')) return null;

  return path || '/';
}

export function isHomePath(path: string): boolean {
  return path === '/' || path === '';
}

export function saveHubLastLocation(hubId: SpecialistHubId, pathWithSearch: string): void {
  if (typeof window === 'undefined') return;
  const clean = sanitizeHubPath(pathWithSearch);
  if (!clean) return;
  try {
    localStorage.setItem(storageKey(hubId), clean);
  } catch {
    /* private mode / quota */
  }
}

export function getHubLastLocation(hubId: SpecialistHubId): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sanitizeHubPath(localStorage.getItem(storageKey(hubId)));
  } catch {
    return null;
  }
}

/** Entry URL for Switch Hub → target specialist hub (resume handled on landing). */
export function hubSwitchEntryUrl(target: SpecialistHubId): string {
  return `${HUB_HOME[target]}/?${HUB_RESUME_PARAM}=1`;
}

/** Resolve Switch Hub menu href from link id + default homepage. */
export function resolveSwitchHubHref(id: string, fallbackHref: string): string {
  if (isSpecialistHubId(id)) return hubSwitchEntryUrl(id);
  return fallbackHref;
}
