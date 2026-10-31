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
  type LaunchNavLiveRow,
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

export type StateNavigationSnapshot = {
  total: number;
  rows: LaunchNavLiveRow[];
};

const STRICT = { requireSuccessfulLookup: true } as const;

/** Homepage chips. Failures throw so unstable_cache does not store a zero. */
async function loadVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  const [fl, tx, oh, nc, nv, vt, ma, ms] = await Promise.all([
    countVerifiedFloridaProviders(STRICT),
    countVerifiedTexasProviders(STRICT),
    countVerifiedOhioProviders(STRICT),
    countVerifiedNorthCarolinaProviders(STRICT),
    countVerifiedNevadaProviders(STRICT),
    countVerifiedVermontProviders(STRICT),
    countVerifiedMassachusettsProviders(STRICT),
    countVerifiedMississippiProviders(STRICT),
  ]);
  return { fl, tx, oh, nc, nv, vt, ma, ms };
}

export const LAUNCH_COUNT_REVALIDATE_SECONDS = 300;

export const getCachedVerifiedLaunchCounts = unstable_cache(
  loadVerifiedLaunchCounts,
  ['ith-verified-launch-counts-v7'],
  { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS }
);

/**
 * A failed count throws. Callers hide the chips. They do not substitute zero.
 * unstable_cache does not store the rejection as a successful zero.
 */
export async function readVerifiedLaunchCounts(): Promise<VerifiedLaunchCounts> {
  return getCachedVerifiedLaunchCounts();
}

async function loadFloridaNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedFloridaProviders(STRICT),
    getLaunchCountyLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadTexasNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedTexasProviders(STRICT),
    getTxLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadOhioNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedOhioProviders(STRICT),
    getOhLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadNorthCarolinaNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedNorthCarolinaProviders(STRICT),
    getNcLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadNevadaNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedNevadaProviders(STRICT),
    getNvLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadVermontNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedVermontProviders(STRICT),
    getVtLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadMassachusettsNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedMassachusettsProviders(STRICT),
    getMaLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadMississippiNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedMississippiProviders(STRICT),
    getMsLaunchMarketLiveTotals(STRICT),
  ]);
  return { total, rows };
}
async function loadNewJerseyNavigation(): Promise<StateNavigationSnapshot> {
  const [total, rows] = await Promise.all([
    countVerifiedNewJerseyProviders(STRICT),
    getNjLaunchRegionLiveTotals(STRICT),
  ]);
  return { total, rows };
}

function cacheNavigation(
  key: string,
  load: () => Promise<StateNavigationSnapshot>
) {
  return unstable_cache(load, [key], { revalidate: LAUNCH_COUNT_REVALIDATE_SECONDS });
}

export const getCachedFloridaNavigation = cacheNavigation(
  'ith-fl-navigation-v1',
  loadFloridaNavigation
);
export const getCachedTexasNavigation = cacheNavigation(
  'ith-tx-navigation-v1',
  loadTexasNavigation
);
export const getCachedOhioNavigation = cacheNavigation(
  'ith-oh-navigation-v1',
  loadOhioNavigation
);
export const getCachedNorthCarolinaNavigation = cacheNavigation(
  'ith-nc-navigation-v1',
  loadNorthCarolinaNavigation
);
export const getCachedNevadaNavigation = cacheNavigation(
  'ith-nv-navigation-v1',
  loadNevadaNavigation
);
export const getCachedVermontNavigation = cacheNavigation(
  'ith-vt-navigation-v1',
  loadVermontNavigation
);
export const getCachedMassachusettsNavigation = cacheNavigation(
  'ith-ma-navigation-v1',
  loadMassachusettsNavigation
);
export const getCachedMississippiNavigation = cacheNavigation(
  'ith-ms-navigation-v1',
  loadMississippiNavigation
);
export const getCachedNewJerseyNavigation = cacheNavigation(
  'ith-nj-navigation-v1',
  loadNewJerseyNavigation
);

async function readNavigation(
  load: () => Promise<StateNavigationSnapshot>
): Promise<StateNavigationSnapshot | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}

export const readFloridaNavigation = () => readNavigation(getCachedFloridaNavigation);
export const readTexasNavigation = () => readNavigation(getCachedTexasNavigation);
export const readOhioNavigation = () => readNavigation(getCachedOhioNavigation);
export const readNorthCarolinaNavigation = () => readNavigation(getCachedNorthCarolinaNavigation);
export const readNevadaNavigation = () => readNavigation(getCachedNevadaNavigation);
export const readVermontNavigation = () => readNavigation(getCachedVermontNavigation);
export const readMassachusettsNavigation = () =>
  readNavigation(getCachedMassachusettsNavigation);
export const readMississippiNavigation = () => readNavigation(getCachedMississippiNavigation);
export const readNewJerseyNavigation = () => readNavigation(getCachedNewJerseyNavigation);
