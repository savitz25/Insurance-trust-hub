type Entry = { at: number; value: number };

/** A failed refresh may serve the last good value for at most this long. */
export const STALE_ON_ERROR_MS = 24 * 60 * 60 * 1000;

const fresh = new Map<string, Entry>();
const inflight = new Map<string, Promise<number>>();

/**
 * Share one in-flight count and keep a successful value for `ttlMs`.
 * A rejection is not stored, so the next caller tries again. While a
 * refresh fails, the last good value (if younger than STALE_ON_ERROR_MS)
 * is returned instead of the error; a failure is never stored as zero.
 */
export function rememberCount(
  key: string,
  ttlMs: number,
  load: () => Promise<number>
): Promise<number> {
  const hit = fresh.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  const pending = inflight.get(key);
  if (pending) return pending;
  const next = load()
    .then((value) => {
      fresh.set(key, { at: Date.now(), value });
      return value;
    })
    .catch((error: unknown) => {
      if (hit && Date.now() - hit.at < STALE_ON_ERROR_MS) return hit.value;
      throw error;
    })
    .finally(() => {
      if (inflight.get(key) === next) inflight.delete(key);
    });
  inflight.set(key, next);
  return next;
}

/** Test-only. Production callers rely on the TTL. */
export function clearRememberedCounts(): void {
  fresh.clear();
  inflight.clear();
}
