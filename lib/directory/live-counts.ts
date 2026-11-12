import { unstable_cache } from 'next/cache';
import {
  countVerifiedFloridaProviders,
  countVerifiedTexasProviders,
  countVerifiedOhioProviders,
  countVerifiedNorthCarolinaProviders,
  countVerifiedNevadaProviders,
  countVerifiedVermontProviders,
  countVerifiedMassachusettsProviders,
  countVerifiedMississippiProviders,
} from '@/lib/dfs/providers-by-county';
import {
  isReadyCount,
  reinterpretLaunchCounts,
  type HeadCount,
} from '@/lib/dfs/provider-count';

export type VerifiedLaunchCounts = {
  fl: HeadCount;
  tx: HeadCount;
  oh: HeadCount;
  nc: HeadCount;
  nv: HeadCount;
  vt: HeadCount;
  ma: HeadCount;
  ms: HeadCount;
};

async function loadVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  const [fl, tx, oh, nc, nv, vt, ma, ms] = await Promise.all([
    countVerifiedFloridaProviders(),
    countVerifiedTexasProviders(),
    countVerifiedOhioProviders(),
    countVerifiedNorthCarolinaProviders(),
    countVerifiedNevadaProviders(),
    countVerifiedVermontProviders(),
    countVerifiedMassachusettsProviders(),
    countVerifiedMississippiProviders(),
  ]);
  const counts = { fl, tx, oh, nc, nv, vt, ma, ms };
  if (Object.values(counts).some((count) => !isReadyCount(count))) {
    throw new Error('verified launch counts unavailable');
  }
  return counts;
}

/**
 * Homepage / directory chips. A failure is thrown so the shared cache
 * never stores a zero in place of a missed count. Every read recomputes
 * `stale` from `asOf` and drops anything 24h or older, so a frozen
 * `stale: false` cannot reach the exact-match disclosure.
 */
const loadCachedVerifiedLaunchCounts = unstable_cache(
  loadVerifiedLaunchCounts,
  ['ith-verified-launch-counts-v7'],
  { revalidate: 300 }
);

export async function getCachedVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  const stored = await loadCachedVerifiedLaunchCounts();
  return reinterpretLaunchCounts(stored, Date.now());
}
