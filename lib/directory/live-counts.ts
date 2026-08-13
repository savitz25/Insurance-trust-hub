import { unstable_cache } from 'next/cache';
import {
  countVerifiedFloridaProviders,
  countVerifiedTexasProviders,
  countVerifiedOhioProviders,
} from '@/lib/dfs/providers-by-county';

export type VerifiedLaunchCounts = {
  fl: number;
  tx: number;
  oh: number;
};

async function loadVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  try {
    const [fl, tx, oh] = await Promise.all([
      countVerifiedFloridaProviders(),
      countVerifiedTexasProviders(),
      countVerifiedOhioProviders(),
    ]);
    return {
      fl: Number.isFinite(fl) ? fl : 0,
      tx: Number.isFinite(tx) ? tx : 0,
      oh: Number.isFinite(oh) ? oh : 0,
    };
  } catch {
    return { fl: 0, tx: 0, oh: 0 };
  }
}

/** Homepage / directory chips — 5-minute cache, fail soft to zeros. */
export const getCachedVerifiedLaunchCounts = unstable_cache(
  loadVerifiedLaunchCounts,
  ['ith-verified-launch-counts-v1'],
  { revalidate: 300 }
);
