/** Sitemap, directory, and state navigation share this database cap. */
export const PUBLICATION_DB_CONCURRENCY = 3;

let publicationDbActive = 0;
const publicationDbWaiters: Array<() => void> = [];

/**
 * One process-wide cap. Nested mapWithConcurrency calls and Promise.all
 * navigation reads each issue their own query, so a per-call cap of 3 would
 * stack. Only the fetch is slotted. Callers must not hold a slot while
 * waiting on another slotted call.
 */
export function withPublicationDbSlot<T>(work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = () => {
      publicationDbActive += 1;
      Promise.resolve()
        .then(work)
        .then(resolve, reject)
        .finally(() => {
          publicationDbActive -= 1;
          const next = publicationDbWaiters.shift();
          if (next) next();
        });
    };
    if (publicationDbActive < PUBLICATION_DB_CONCURRENCY) start();
    else publicationDbWaiters.push(start);
  });
}

export function publicationFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return withPublicationDbSlot(() => fetch(input, init));
}

/** Map items with a fixed worker limit while keeping results in input order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  map: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!items.length) return [];
  const workerCount = Math.min(items.length, Math.max(1, Math.floor(concurrency)));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await map(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
