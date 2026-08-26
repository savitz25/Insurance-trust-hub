/**
 * Repeatable NPN collision diagnostics. No auto-resolve.
 */

import { normalizeNpn } from './npn';

export type CensusRow = {
  source: string;
  jurisdiction: string;
  entityKind: 'person' | 'agency';
  licenseNumber: string;
  npn: string | null;
  legalName: string;
};

export type NpnCensus = {
  bySource: Record<
    string,
    {
      records: number;
      withNpn: number;
      withoutNpn: number;
      distinctNpn: number;
    }
  >;
  npnCredentialBuckets: {
    one: number;
    two: number;
    threeToFive: number;
    sixPlus: number;
  };
  crossState: {
    oneState: number;
    twoStates: number;
    threePlusStates: number;
    overlaps: Record<string, number>;
  };
  sameNpnDifferentKind: number;
  sameNpnRadicalName: number;
  sameLicenseDifferentNpn: number;
};

export function computeNpnCensus(
  rows: CensusRow[],
  namesConflict: (a: string, b: string) => boolean
): NpnCensus {
  const bySource: NpnCensus['bySource'] = {};
  const npnToRows = new Map<string, CensusRow[]>();
  const licenseToNpns = new Map<string, Set<string>>();

  for (const r of rows) {
    const src = r.source;
    if (!bySource[src]) {
      bySource[src] = { records: 0, withNpn: 0, withoutNpn: 0, distinctNpn: 0 };
    }
    bySource[src].records += 1;
    const npn = normalizeNpn(r.npn);
    if (npn) {
      bySource[src].withNpn += 1;
      const list = npnToRows.get(npn) ?? [];
      list.push({ ...r, npn });
      npnToRows.set(npn, list);
      const lk = `${r.jurisdiction}|${r.entityKind}|${r.licenseNumber}`;
      const set = licenseToNpns.get(lk) ?? new Set();
      set.add(npn);
      licenseToNpns.set(lk, set);
    } else {
      bySource[src].withoutNpn += 1;
    }
  }
  for (const src of Object.keys(bySource)) {
    const npns = new Set(
      rows
        .filter((r) => r.source === src)
        .map((r) => normalizeNpn(r.npn))
        .filter((x): x is string => Boolean(x))
    );
    bySource[src].distinctNpn = npns.size;
  }

  let one = 0,
    two = 0,
    threeToFive = 0,
    sixPlus = 0;
  let oneState = 0,
    twoStates = 0,
    threePlus = 0;
  let sameKindConflict = 0;
  let sameNpnDifferentKind = 0;
  const overlaps: Record<string, number> = {
    'FL+TX': 0,
    'FL+OH': 0,
    'FL+VT': 0,
    'TX+OH': 0,
  };

  for (const [, list] of npnToRows) {
    const n = list.length;
    if (n === 1) one += 1;
    else if (n === 2) two += 1;
    else if (n <= 5) threeToFive += 1;
    else sixPlus += 1;

    const states = new Set(list.map((r) => r.jurisdiction));
    if (states.size === 1) oneState += 1;
    else if (states.size === 2) twoStates += 1;
    else threePlus += 1;
    if (states.has('FL') && states.has('TX')) overlaps['FL+TX'] += 1;
    if (states.has('FL') && states.has('OH')) overlaps['FL+OH'] += 1;
    if (states.has('FL') && states.has('VT')) overlaps['FL+VT'] += 1;
    if (states.has('TX') && states.has('OH')) overlaps['TX+OH'] += 1;

    const kinds = new Set(list.map((r) => r.entityKind));
    if (kinds.size > 1) sameNpnDifferentKind += 1;
    const names = list.map((r) => r.legalName);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (list[i]!.entityKind === list[j]!.entityKind && namesConflict(names[i]!, names[j]!)) {
          sameKindConflict += 1;
        }
      }
    }
  }

  let sameLicenseDifferentNpn = 0;
  for (const set of licenseToNpns.values()) {
    if (set.size > 1) sameLicenseDifferentNpn += 1;
  }

  return {
    bySource,
    npnCredentialBuckets: { one, two, threeToFive, sixPlus },
    crossState: { oneState, twoStates, threePlusStates: threePlus, overlaps },
    sameNpnDifferentKind,
    sameNpnRadicalName: sameKindConflict,
    sameLicenseDifferentNpn,
  };
}
