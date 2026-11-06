type Entry = { at: number; value: number };

const fresh = new Map<string, Entry>();
const inflight = new Map<string, Promise<number>>();

/**
 * Share one in-flight count and keep a successful value for `ttlMs`.
 * A rejection is not stored, so the next caller tries again.
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
