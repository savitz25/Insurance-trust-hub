import { INSURANCE_ASK_SNAPSHOT_FINGERPRINT } from './contract';

type Entry = { value: number; storedAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;

export function askCacheKey(parts: Array<string | number | undefined | null>): string {
  return [INSURANCE_ASK_SNAPSHOT_FINGERPRINT, ...parts.map((p) => (p == null ? '' : String(p)))].join('|');
}

export function cacheGetCount(key: string): number | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.storedAt > TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

export function cacheSetCount(key: string, value: number): number {
  store.set(key, { value, storedAt: Date.now() });
  return value;
}
