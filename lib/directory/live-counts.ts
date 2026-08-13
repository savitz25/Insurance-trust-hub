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

export type VerifiedLaunchCounts = {
  fl: number;
  tx: number;
  oh: number;
  nc: number;
  nv: number;
  vt: number;
  ma: number;
  ms: number;
};

async function loadVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  try {
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
    return {
      fl: Number.isFinite(fl) ? fl : 0,
      tx: Number.isFinite(tx) ? tx : 0,
      oh: Number.isFinite(oh) ? oh : 0,
      nc: Number.isFinite(nc) ? nc : 0,
      nv: Number.isFinite(nv) ? nv : 0,
      vt: Number.isFinite(vt) ? vt : 0,
      ma: Number.isFinite(ma) ? ma : 0,
      ms: Number.isFinite(ms) ? ms : 0,
    };
  } catch {
    return { fl: 0, tx: 0, oh: 0, nc: 0, nv: 0, vt: 0, ma: 0, ms: 0 };
  }
}

/** Homepage / directory chips — 5-minute cache, fail soft to zeros. */
export const getCachedVerifiedLaunchCounts = unstable_cache(
  loadVerifiedLaunchCounts,
  ['ith-verified-launch-counts-v6'],
  { revalidate: 300 }
);
