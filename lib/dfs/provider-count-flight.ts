import {
  COUNT_MAX_AGE_MS,
  type HeadCount,
} from './provider-count';

type Stored = { value: number; asOf: number };
type LoadResult = number | Stored;

/** A failed refresh may serve the last good value for at most this long. */
export const STALE_ON_ERROR_MS = COUNT_MAX_AGE_MS;
export const COUNT_BACKOFF_BASE_MS = 5_000;
export const COUNT_BACKOFF_MAX_MS = 5 * 60 * 1000;

const fresh = new Map<string, Stored>();
const inflight = new Map<string, Promise<Stored>>();
const backoff = new Map<string, { fails: number; until: number }>();

let clock = () => Date.now();

/** Test-only clock. Production uses Date.now. */
export function setCountClock(fn: (() => number) | null): void {
  clock = fn ?? (() => Date.now());
}

function now(): number {
  return clock();
}

function normalize(result: LoadResult): Stored {
  if (typeof result === 'number') return { value: result, asOf: now() };
  return { value: result.value, asOf: result.asOf };
}

function tooOld(stored: Stored, at = now()): boolean {
  return at - stored.asOf >= STALE_ON_ERROR_MS;
}

function noteFailure(key: string): void {
  const prev = backoff.get(key);
  const fails = (prev?.fails ?? 0) + 1;
  const delay = Math.min(COUNT_BACKOFF_MAX_MS, COUNT_BACKOFF_BASE_MS * 2 ** (fails - 1));
  backoff.set(key, { fails, until: now() + delay });
}

function backingOff(key: string): boolean {
  const gate = backoff.get(key);
  return !!gate && now() < gate.until;
}

function toHead(stored: Stored, ttlMs: number): HeadCount {
  const age = now() - stored.asOf;
  if (age >= STALE_ON_ERROR_MS) return { unavailable: true };
  return { value: stored.value, asOf: stored.asOf, stale: age >= ttlMs };
}

function startLoad(key: string, load: () => Promise<LoadResult>): Promise<Stored> {
  const pending = inflight.get(key);
  if (pending) return pending;
  const task = load()
    .then((result) => {
      const stored = normalize(result);
      if (tooOld(stored)) throw new Error('provider count older than 24h');
      // Keep the query's original timestamp. Do not re-stamp at copy time.
      fresh.set(key, stored);
      backoff.delete(key);
      return stored;
    })
    .catch((error: unknown) => {
      noteFailure(key);
      throw error;
    })
    .finally(() => {
      if (inflight.get(key) === task) inflight.delete(key);
    });
  inflight.set(key, task);
  return task;
}

/**
 * Share one in-flight count and keep a successful value for `ttlMs`.
 * The stored timestamp is the loader's `asOf` when it provides one.
 * A value past `ttlMs` but younger than 24h is returned immediately as stale
 * while a refresh runs in the background. Failures back off and are never stored.
 */
export function rememberCount(
  key: string,
  ttlMs: number,
  load: () => Promise<LoadResult>
): Promise<HeadCount> {
  const hit = fresh.get(key);
  const usable = hit && !tooOld(hit) ? hit : undefined;
  if (usable && now() - usable.asOf < ttlMs) {
    return Promise.resolve({ value: usable.value, asOf: usable.asOf, stale: false });
  }
  if (usable) {
    if (!backingOff(key) && !inflight.has(key)) {
      void startLoad(key, load).catch(() => {});
    }
    return Promise.resolve({ value: usable.value, asOf: usable.asOf, stale: true });
  }
  if (backingOff(key)) {
    return Promise.reject(new Error('provider count refresh backing off'));
  }
  return startLoad(key, load).then((stored) => toHead(stored, ttlMs));
}

/** Test-only. Production callers rely on the TTL. */
export function clearRememberedCounts(): void {
  fresh.clear();
  inflight.clear();
  backoff.clear();
}
