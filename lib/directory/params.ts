/** Phase 11B — shareable directory query helpers. */

export const DIRECTORY_PAGE_SIZE = 24;

/** Shared consumer specialty labels (FL DFS / TX TDI / OH ODI map to these). */
export const DIRECTORY_SPECIALTIES = [
  'Health',
  'Life',
  'Property & Casualty',
  'Personal Lines',
  'Agency',
  'Title',
  'Public Adjuster',
] as const;

export type DirectorySpecialty = (typeof DIRECTORY_SPECIALTIES)[number];

export function parseDirectoryPage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 10_000);
}

export function directoryTotalPages(total: number, pageSize = DIRECTORY_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampDirectoryPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

const PRESERVE_KEYS = [
  'q',
  'zip',
  'state',
  'type',
  'specialty',
  'minRating',
  'sort',
  'view',
  'appointments',
] as const;

/**
 * Build a /directory URL. Always verified=true. Page 1 omits ?page=.
 * Drops Florida appointment snapshot unless state=FL.
 */
export function buildDirectoryHref(
  current: URLSearchParams | Record<string, string>,
  updates: Record<string, string | null | undefined> = {}
): string {
  const src =
    current instanceof URLSearchParams
      ? current
      : new URLSearchParams(
          Object.entries(current).filter(([, v]) => Boolean(v)) as [string, string][]
        );
  const params = new URLSearchParams();
  for (const key of PRESERVE_KEYS) {
    const next = key in updates ? updates[key] : src.get(key);
    if (next) params.set(key, next);
  }
  for (const [key, value] of Object.entries(updates)) {
    if ((PRESERVE_KEYS as readonly string[]).includes(key)) continue;
    if (key === 'page' || key === 'verified') continue;
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.set('verified', 'true');
  if (params.get('state') !== 'FL') params.delete('appointments');
  const pageRaw = 'page' in updates ? updates.page : src.get('page');
  const page = parseDirectoryPage(pageRaw ?? '1');
  if (page > 1) params.set('page', String(page));
  const q = params.toString();
  return q ? `/directory?${q}` : '/directory?verified=true';
}
