import {
  countVerifiedFloridaCounty,
  countVerifiedProvidersForHub,
} from '@/lib/dfs/providers-by-county';
import {
  mapWithConcurrency,
  PUBLICATION_DB_CONCURRENCY,
} from '@/lib/map-with-concurrency';
import {
  foldPublicationSignals,
  publicationCountTasks,
  type PublicationCountTask,
} from '@/lib/hubs/publication-plan';
import type { HubPublicationSignal } from '@/lib/hubs/published-hub';

export { PUBLICATION_DB_CONCURRENCY };

async function countTaskOnce(task: PublicationCountTask): Promise<number | null> {
  if (task.kind === 'fl-county') return countVerifiedFloridaCounty(task.countyId);
  return countVerifiedProvidersForHub(task.hubSlug, { requireSuccessfulLookup: true });
}

/** One retry inside the same worker. A second failure stays a failed lookup. */
async function countTask(task: PublicationCountTask): Promise<number | null> {
  try {
    return await countTaskOnce(task);
  } catch {
    try {
      return await countTaskOnce(task);
    } catch {
      return null;
    }
  }
}

/**
 * One snapshot for a set of hub slugs. Florida ids are counted once and summed
 * into every hub that contains them. Database work stays at
 * PUBLICATION_DB_CONCURRENCY. A failed id is not stored as a verified zero:
 * every hub that needed it comes back lookupSucceeded false.
 */
export async function readHubPublicationSnapshot(
  hubSlugs: readonly string[]
): Promise<HubPublicationSignal[]> {
  const tasks = publicationCountTasks(hubSlugs);
  const counts = new Map<string, number | null>();
  await mapWithConcurrency(tasks, PUBLICATION_DB_CONCURRENCY, async (task) => {
    const value = await countTask(task);
    const key = task.kind === 'fl-county' ? `fl:${task.countyId}` : `hub:${task.hubSlug}`;
    counts.set(key, value);
  });
  return foldPublicationSignals(hubSlugs, counts);
}

export async function readHubPublicationSignal(
  hubSlug: string
): Promise<HubPublicationSignal> {
  const [signal] = await readHubPublicationSnapshot([hubSlug]);
  return signal;
}
