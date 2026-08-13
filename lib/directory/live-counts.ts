import { unstable_cache } from 'next/cache';
import {
  countVerifiedFloridaProviders,
  countVerifiedTexasProviders,
  countVerifiedOhioProviders,
  countVerifiedNorthCarolinaProviders,
  countVerifiedNevadaProviders,
} from '@/lib/dfs/providers-by-county';

export type VerifiedLaunchCounts = {
  fl: number;
  tx: number;
  oh: number;
  nc: number;
  nv: number;
};

async function loadVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  try {
    const [fl, tx, oh, nc, nv] = await Promise.all([
      countVerifiedFloridaProviders(),
      countVerifiedTexasProviders(),
      countVerifiedOhioProviders(),
      countVerifiedNorthCarolinaProviders(),
      countVerifiedNevadaProviders(),
    ]);
    return {
      fl: Number.isFinite(fl) ? fl : 0,
      tx: Number.isFinite(tx) ? tx : 0,
      oh: Number.isFinite(oh) ? oh : 0,
      nc: Number.isFinite(nc) ? nc : 0,
      nv: Number.isFinite(nv) ? nv : 0,
    };
  } catch {
    return { fl: 0, tx: 0, oh: 0, nc: 0, nv: 0 };
  }
}

/** Homepage / directory chips — 5-minute cache, fail soft to zeros. */
export const getCachedVerifiedLaunchCounts = unstable_cache(
  loadVerifiedLaunchCounts,
  ['ith-verified-launch-counts-v3'],
  { revalidate: 300 }
);
