/**
 * Short-lived in-memory cache for Marketplace API responses.
 * Keyed by market + request signature. Not a durable store.
 */

type Entry = { expires: number; payload: unknown };

const store = new Map<string, Entry>();
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function cacheGet<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    store.delete(key);
    return null;
  }
  return e.payload as T;
}

export function cacheSet(key: string, payload: unknown, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { expires: Date.now() + ttlMs, payload });
  // Soft bound
  if (store.size > 500) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}

export function cacheKey(parts: Record<string, unknown>): string {
  return JSON.stringify(parts);
}
