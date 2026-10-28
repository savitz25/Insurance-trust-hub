import { unstable_cache } from 'next/cache';
import {
  countVerifiedFloridaProviders,
  countVerifiedMassachusettsProviders,
  countVerifiedMississippiProviders,
  countVerifiedNevadaProviders,
  countVerifiedNewJerseyProviders,
  countVerifiedNorthCarolinaProviders,
  countVerifiedOhioProviders,
  countVerifiedTexasProviders,
  countVerifiedVermontProviders,
  getLaunchCountyLiveTotals,
  getMaLaunchMarketLiveTotals,
  getMsLaunchMarketLiveTotals,
  getNcLaunchMarketLiveTotals,
  getNjLaunchRegionLiveTotals,
  getNvLaunchMarketLiveTotals,
  getOhLaunchMarketLiveTotals,
  getTxLaunchMarketLiveTotals,
  getVtLaunchMarketLiveTotals,
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
export const LAUNCH_COUNT_REVALIDATE_SECONDS = 300;

export const getCachedVerifiedLaunchCounts = unstable_cache(
  loadVerifiedLaunchCounts,
  ['ith-verified-launch-counts-v6'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);

/**
 * Directory and state-hub navigation rows. The underlying counters fail soft
 * to zero and do not throw. Hub page inventory still throws when a Florida
 * launch lookup fails, and that error is not cached as an empty market.
 */
export const getCachedLaunchCountyLiveTotals = unstable_cache(
  () => getLaunchCountyLiveTotals(),
  ['ith-launch-county-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedTxLaunchMarketLiveTotals = unstable_cache(
  () => getTxLaunchMarketLiveTotals(),
  ['ith-tx-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedNjLaunchRegionLiveTotals = unstable_cache(
  () => getNjLaunchRegionLiveTotals(),
  ['ith-nj-launch-region-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedOhLaunchMarketLiveTotals = unstable_cache(
  () => getOhLaunchMarketLiveTotals(),
  ['ith-oh-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedNcLaunchMarketLiveTotals = unstable_cache(
  () => getNcLaunchMarketLiveTotals(),
  ['ith-nc-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedNvLaunchMarketLiveTotals = unstable_cache(
  () => getNvLaunchMarketLiveTotals(),
  ['ith-nv-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedVtLaunchMarketLiveTotals = unstable_cache(
  () => getVtLaunchMarketLiveTotals(),
  ['ith-vt-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedMaLaunchMarketLiveTotals = unstable_cache(
  () => getMaLaunchMarketLiveTotals(),
  ['ith-ma-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedMsLaunchMarketLiveTotals = unstable_cache(
  () => getMsLaunchMarketLiveTotals(),
  ['ith-ms-launch-market-live-totals-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
export const getCachedVerifiedNewJerseyCount = unstable_cache(
  () => countVerifiedNewJerseyProviders(),
  ['ith-nj-verified-count-v1'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);
