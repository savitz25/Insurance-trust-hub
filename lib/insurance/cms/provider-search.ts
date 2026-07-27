/**
 * Medicare provider participation search (Phase 3A).
 * Server-only shard loading + Opt Out / PPEF status resolution.
 */

import 'server-only';

import fs from 'fs';
import path from 'path';
import {
  isActivelyEnrolledInMedicareFfs,
  isOptedOutOfMedicare,
  normalizeNpi,
  PPEF_DATASET_META,
} from '@/lib/insurance/cms/ppef-lookup';
import type { CmsParticipationStatus } from '@/lib/insurance/cms/types';
import manifest from '@/lib/insurance/cms/data/ppef-search/manifest.json';

export type ProviderSearchInput = {
  npi?: string;
  lastName?: string;
  firstName?: string;
  state?: string;
  /** Max results to return (default 25, max 50) */
  limit?: number;
};

export type ProviderSearchHit = {
  npi: string;
  displayName: string;
  first: string;
  last: string;
  org: string;
  state: string;
  providerType: string;
  status: CmsParticipationStatus;
  statusLabel: string;
  statusDetail: string;
  optedOut: boolean;
  inPpefSearchIndex: boolean;
};

export type ProviderSearchResult = {
  query: ProviderSearchInput;
  hits: ProviderSearchHit[];
  totalMatched: number;
  truncated: boolean;
  meta: {
    dataVintage: string;
    syncedAt: string;
    sourceLabel: string;
    searchableStates: string[];
    notes: string[];
    optOutCount: number;
  };
  emptyReason?: string;
};

type ShardRecord = {
  npi: string;
  first: string;
  mid: string;
  last: string;
  org: string;
  state: string;
  type: string;
};

const SEARCH_ROOT = path.join(process.cwd(), 'lib', 'insurance', 'cms', 'data', 'ppef-search');
const shardCache = new Map<string, ShardRecord[]>();

function normalizeName(s: string | undefined): string {
  return (s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function displayName(r: ShardRecord): string {
  const person = [r.first, r.mid, r.last].filter(Boolean).join(' ').trim();
  if (person && r.org) return `${person} · ${r.org}`;
  if (person) return person;
  if (r.org) return r.org;
  return r.npi;
}

function shardLetter(lastName: string, org: string): string {
  const raw = (lastName || org || '').trim().toUpperCase();
  if (!raw) return '_';
  const ch = raw[0];
  if (ch >= 'A' && ch <= 'Z') return ch;
  return '_';
}

function loadShard(state: string, letter: string): ShardRecord[] {
  const key = `${state}:${letter}`;
  if (shardCache.has(key)) return shardCache.get(key)!;
  const file = path.join(SEARCH_ROOT, state, `${letter}.json`);
  if (!fs.existsSync(file)) {
    shardCache.set(key, []);
    return [];
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as ShardRecord[];
  shardCache.set(key, data);
  return data;
}

function resolveStatus(npi: string, inIndex: boolean): Pick<
  ProviderSearchHit,
  'status' | 'statusLabel' | 'statusDetail' | 'optedOut'
> {
  const optedOut = isOptedOutOfMedicare(npi);
  if (optedOut) {
    return {
      status: 'inactive',
      statusLabel: 'Opted out of Medicare',
      statusDetail:
        'This NPI appears on the CMS Opt Out Affidavits public file. Confirm current status with CMS tools before making care decisions.',
      optedOut: true,
    };
  }

  if (inIndex) {
    return {
      status: 'active',
      statusLabel: 'Active Medicare FFS enrollment (PPEF)',
      statusDetail:
        'This NPI appears in the CMS Public Provider Enrollment (PPEF) extract for the searched state. That indicates approval to bill Medicare Fee-For-Service — not a rating of quality, and not the same as every Medicare Advantage network.',
      optedOut: false,
    };
  }

  const ppefActive = isActivelyEnrolledInMedicareFfs(npi);
  if (ppefActive === true) {
    return {
      status: 'active',
      statusLabel: 'Active Medicare FFS enrollment (PPEF)',
      statusDetail:
        'NPI found in the national PPEF active-enrollment index (not in the state name index for this query).',
      optedOut: false,
    };
  }
  if (ppefActive === false) {
    return {
      status: 'not_found',
      statusLabel: 'No match in PPEF enrollment extract',
      statusDetail:
        'NPI is not on the Opt Out list and was not found in the loaded PPEF enrollment index. This does not invent a status — verify on CMS NPPES / PECOS tools.',
      optedOut: false,
    };
  }

  return {
    status: 'not_found',
    statusLabel: 'No match in searchable index',
    statusDetail:
      'NPI is not on the Opt Out list and was not found in the PPEF search index for the selected state. Expand state coverage or verify the NPI on CMS tools.',
    optedOut: false,
  };
}

function toHit(r: ShardRecord): ProviderSearchHit {
  const status = resolveStatus(r.npi, true);
  return {
    npi: r.npi,
    displayName: displayName(r),
    first: r.first,
    last: r.last,
    org: r.org,
    state: r.state,
    providerType: r.type,
    inPpefSearchIndex: true,
    ...status,
  };
}

/**
 * Search Medicare FFS participation by NPI and/or name within indexed states.
 */
export function searchMedicareProviders(input: ProviderSearchInput): ProviderSearchResult {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50);
  const state = (input.state || 'FL').trim().toUpperCase();
  const npi = normalizeNpi(input.npi);
  const lastName = normalizeName(input.lastName);
  const firstName = normalizeName(input.firstName);

  const searchableStates = Object.keys((manifest as { states?: Record<string, unknown> }).states || {});
  const meta = {
    dataVintage: (manifest as { dataVintage?: string }).dataVintage || 'PPEF 2026.07.17',
    syncedAt: (manifest as { syncedAt?: string }).syncedAt || '2026-07-27T00:00:00.000Z',
    sourceLabel: 'CMS Medicare Fee-For-Service Public Provider Enrollment (PPEF) + Opt Out Affidavits',
    searchableStates,
    notes: (manifest as { notes?: string[] }).notes || [],
    optOutCount: PPEF_DATASET_META.optOutCount,
  };

  if (!npi && !lastName && !firstName) {
    return {
      query: input,
      hits: [],
      totalMatched: 0,
      truncated: false,
      meta,
      emptyReason: 'Enter an NPI and/or last name to search.',
    };
  }

  // Exact NPI path
  if (npi && !lastName && !firstName) {
    let record: ShardRecord | null = null;
    if (searchableStates.includes(state)) {
      // Linear scan of state shards (cached) to enrich name when possible
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('');
      for (const letter of letters) {
        const found = loadShard(state, letter).find((r) => r.npi === npi);
        if (found) {
          record = found;
          break;
        }
      }
    }
    const inIndex = Boolean(record);
    const status = resolveStatus(npi, inIndex);
    const hit: ProviderSearchHit = record
      ? toHit(record)
      : {
          npi,
          displayName: `NPI ${npi}`,
          first: '',
          last: '',
          org: '',
          state,
          providerType: '',
          inPpefSearchIndex: false,
          ...status,
        };
    return {
      query: { ...input, npi, state },
      hits: [hit],
      totalMatched: 1,
      truncated: false,
      meta,
    };
  }

  if (!searchableStates.includes(state)) {
    return {
      query: input,
      hits: [],
      totalMatched: 0,
      truncated: false,
      meta,
      emptyReason: `Name search is available for: ${searchableStates.join(', ') || 'none'}. Selected state ${state} is not in the searchable index yet.`,
    };
  }

  if (!lastName && !npi) {
    return {
      query: input,
      hits: [],
      totalMatched: 0,
      truncated: false,
      meta,
      emptyReason: 'Name search requires a last name (or organization name starting letter).',
    };
  }

  const letter = shardLetter(lastName, lastName);
  const shard = loadShard(state, letter);
  const matched = shard.filter((r) => {
    if (npi && r.npi !== npi) return false;
    if (lastName) {
      const last = normalizeName(r.last);
      const org = normalizeName(r.org);
      if (!last.startsWith(lastName) && !org.startsWith(lastName) && !last.includes(lastName) && !org.includes(lastName)) {
        return false;
      }
    }
    if (firstName) {
      const first = normalizeName(r.first);
      if (!first.startsWith(firstName) && !first.includes(firstName)) return false;
    }
    return true;
  });

  // Sort: exact last match first, then alpha
  matched.sort((a, b) => {
    const aExact = normalizeName(a.last) === lastName ? 0 : 1;
    const bExact = normalizeName(b.last) === lastName ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return displayName(a).localeCompare(displayName(b));
  });

  const totalMatched = matched.length;
  const truncated = totalMatched > limit;
  const hits = matched.slice(0, limit).map(toHit);

  // If NPI was also provided and not in name hits, append NPI-only status card
  if (npi && !hits.some((h) => h.npi === npi)) {
    const status = resolveStatus(npi, false);
    hits.unshift({
      npi,
      displayName: `NPI ${npi}`,
      first: '',
      last: '',
      org: '',
      state,
      providerType: '',
      inPpefSearchIndex: false,
      ...status,
    });
  }

  return {
    query: { ...input, npi: npi || undefined, lastName: input.lastName, firstName: input.firstName, state },
    hits,
    totalMatched: npi && !matched.some((m) => m.npi === npi) ? totalMatched + 1 : totalMatched,
    truncated,
    meta,
    emptyReason:
      hits.length === 0
        ? 'No matching providers in the PPEF search index for this name/state. Try a different spelling, NPI, or verify on CMS NPPES.'
        : undefined,
  };
}

export function getProviderSearchMeta() {
  return {
    dataVintage: (manifest as { dataVintage?: string }).dataVintage || 'PPEF 2026.07.17',
    syncedAt: (manifest as { syncedAt?: string }).syncedAt || '2026-07-27T00:00:00.000Z',
    searchableStates: Object.keys((manifest as { states?: Record<string, unknown> }).states || {}),
    notes: (manifest as { notes?: string[] }).notes || [],
    optOutCount: PPEF_DATASET_META.optOutCount,
  };
}
