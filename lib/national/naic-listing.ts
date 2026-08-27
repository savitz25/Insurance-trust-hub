/**
 * Deterministic parser for the official NAIC Listing of Companies (LOC).
 * Source: content.naic.org publications LOC-JUN-2026 detailed CSV zip.
 * Does not invent CoCodes. Does not treat alien AA- numbers as CoCodes.
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  decideInsuranceGroupIdentity,
  decideLegalInsurerIdentity,
  insuranceGroupProvisionalKey,
  legalInsurerProvisionalKey,
  NAIC_COMPANY_STATUS,
  normalizeNaicCompanyCode,
  normalizeNaicGroupCode,
} from './legal-insurer-identity';

export const NAIC_LOC_SOURCE = {
  product: 'LOC-JUN-2026',
  title: '2026 June Detailed Listings of Companies',
  publisher: 'National Association of Insurance Commissioners',
  page: 'https://content.naic.org/publications',
  zipUrl:
    'https://content.naic.org/sites/default/files/publication-detail-list-companies-2026-jun.zip',
  zipFileName: 'publication-detail-list-companies-2026-jun.zip',
  observedAt: '2026-08-27',
} as const;

/** Domestic/US company listings that publish 5-digit COMPANY CODE. */
export const NAIC_LOC_COMPANY_FILES = [
  'PROP.csv',
  'LIFE.csv',
  'HLTH.csv',
  'TILE.csv',
  'FRAT.csv',
  'ORBE.csv',
] as const;

export const NAIC_LOC_GROUP_FILE = 'GPAL.csv';
export const NAIC_LOC_GROUP_MEMBERS_FILE = 'GPNM.csv';

export const NAIC_LOC_EXCLUDED_FILES = [
  'ALAL.csv',
  'ALNM.csv',
  'NAAL.csv',
  'NANM.csv',
  'PLAL.csv',
  'PLNM.csv',
  'CONM.csv',
  'COMB.csv',
] as const;

export type NaicCompanyRow = {
  companyName: string;
  domicile: string;
  groupCode: string | null;
  cocode: string;
  fein: string | null;
  statusCode: string;
  statusLabel: string;
  sourceFile: string;
  rawLine: string;
};

export type NaicGroupRow = {
  groupName: string;
  groupCode: string;
  sourceFile: string;
};

export type NaicGroupMemberRow = {
  groupName: string;
  groupCode: string;
  cocode: string;
  companyName: string;
  domicile: string;
  statusCode: string;
  sourceFile: string;
};

export type NaicListingParse = {
  companies: NaicCompanyRow[];
  groups: NaicGroupRow[];
  memberships: NaicGroupMemberRow[];
  distinctCoCodes: string[];
  distinctGroupCodes: string[];
  collisions: {
    sameCoCodeConflictingNames: Array<{
      cocode: string;
      names: string[];
    }>;
    groupCodeEqualsCoCode: Array<{ code: string }>;
    duplicateMemberships: number;
  };
  statusCounts: Record<string, number>;
  fileCounts: Record<string, number>;
  fingerprint: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^\uFEFF/, '').trim());
}

function headerIndex(headers: string[], ...want: string[]): number {
  const norm = (h: string) => h.toUpperCase().replace(/\s+/g, ' ').trim();
  const hs = headers.map(norm);
  for (const w of want) {
    const i = hs.indexOf(norm(w));
    if (i >= 0) return i;
  }
  return -1;
}

function readCsvRows(path: string): string[][] {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map(parseCsvLine);
}

export function parseNaicListingDir(dir: string): NaicListingParse {
  if (!existsSync(dir)) {
    throw new Error(`NAIC listing directory missing: ${dir}`);
  }

  const companies: NaicCompanyRow[] = [];
  const fileCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const namesByCo = new Map<string, Set<string>>();
  const firstByCo = new Map<string, NaicCompanyRow>();

  for (const file of NAIC_LOC_COMPANY_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const rows = readCsvRows(path);
    if (!rows.length) continue;
    const headers = rows[0]!;
    const iName = headerIndex(headers, 'COMPANY NAME');
    const iDom = headerIndex(headers, 'STATE OF DOMICILE');
    const iGroup = headerIndex(headers, 'GROUP CODE');
    const iCode = headerIndex(headers, 'COMPANY CODE');
    const iFein = headerIndex(headers, 'FEIN NUMBER');
    const iStatus = headerIndex(headers, 'COMPANY STATUS');
    if (iName < 0 || iCode < 0) continue;
    let n = 0;
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]!;
      const cocode = normalizeNaicCompanyCode(cols[iCode]);
      if (!cocode) continue;
      const companyName = String(cols[iName] || '').replace(/\s+/g, ' ').trim();
      if (!companyName) continue;
      const statusCode = String(cols[iStatus] || '').trim();
      const row: NaicCompanyRow = {
        companyName,
        domicile: iDom >= 0 ? String(cols[iDom] || '').trim() : '',
        groupCode: iGroup >= 0 ? normalizeNaicGroupCode(cols[iGroup]) : null,
        cocode,
        fein: iFein >= 0 ? String(cols[iFein] || '').trim() || null : null,
        statusCode,
        statusLabel: NAIC_COMPANY_STATUS[statusCode] || 'unknown',
        sourceFile: file,
        rawLine: cols.join(','),
      };
      companies.push(row);
      n += 1;
      statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1;
      const set = namesByCo.get(cocode) ?? new Set<string>();
      set.add(companyName);
      namesByCo.set(cocode, set);
      if (!firstByCo.has(cocode)) firstByCo.set(cocode, row);
    }
    fileCounts[file] = n;
  }

  const groups: NaicGroupRow[] = [];
  const groupPath = join(dir, NAIC_LOC_GROUP_FILE);
  if (existsSync(groupPath)) {
    const rows = readCsvRows(groupPath);
    const headers = rows[0] || [];
    const iName = headerIndex(headers, 'GROUP NAME');
    const iCode = headerIndex(headers, 'GROUP CODE');
    let n = 0;
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]!;
      const groupCode = iCode >= 0 ? normalizeNaicGroupCode(cols[iCode]) : null;
      const groupName = iName >= 0 ? String(cols[iName] || '').replace(/\s+/g, ' ').trim() : '';
      if (!groupCode || !groupName) continue;
      groups.push({ groupName, groupCode, sourceFile: NAIC_LOC_GROUP_FILE });
      n += 1;
    }
    fileCounts[NAIC_LOC_GROUP_FILE] = n;
  }

  const memberships: NaicGroupMemberRow[] = [];
  const memPath = join(dir, NAIC_LOC_GROUP_MEMBERS_FILE);
  const memKeys = new Set<string>();
  let duplicateMemberships = 0;
  if (existsSync(memPath)) {
    const rows = readCsvRows(memPath);
    const headers = rows[0] || [];
    const iGName = headerIndex(headers, 'GROUP NAME');
    const iGCode = headerIndex(headers, 'GROUP CODE');
    const iCo = headerIndex(headers, 'COMPANY CODE');
    const iCName = headerIndex(headers, 'COMPANY NAME');
    const iDom = headerIndex(headers, 'STATE OF DOMICILE');
    const iStatus = headerIndex(headers, 'COMPANY STATUS');
    let n = 0;
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]!;
      const groupCode = iGCode >= 0 ? normalizeNaicGroupCode(cols[iGCode]) : null;
      const cocode = iCo >= 0 ? normalizeNaicCompanyCode(cols[iCo]) : null;
      if (!groupCode || !cocode) continue;
      const key = `${groupCode}|${cocode}`;
      if (memKeys.has(key)) {
        duplicateMemberships += 1;
        continue;
      }
      memKeys.add(key);
      memberships.push({
        groupName: iGName >= 0 ? String(cols[iGName] || '').replace(/\s+/g, ' ').trim() : '',
        groupCode,
        cocode,
        companyName: iCName >= 0 ? String(cols[iCName] || '').replace(/\s+/g, ' ').trim() : '',
        domicile: iDom >= 0 ? String(cols[iDom] || '').trim() : '',
        statusCode: iStatus >= 0 ? String(cols[iStatus] || '').trim() : '',
        sourceFile: NAIC_LOC_GROUP_MEMBERS_FILE,
      });
      n += 1;
    }
    fileCounts[NAIC_LOC_GROUP_MEMBERS_FILE] = n;
  }

  const sameCoCodeConflictingNames: Array<{ cocode: string; names: string[] }> = [];
  for (const [cocode, names] of namesByCo) {
    const d = decideLegalInsurerIdentity({ cocode, names: Array.from(names) });
    if (d.confidence === 'REVIEW_REQUIRED') {
      sameCoCodeConflictingNames.push({
        cocode,
        names: Array.from(names).sort(),
      });
    }
  }

  const coSet = new Set(firstByCo.keys());
  const groupSet = new Set(groups.map((g) => g.groupCode));
  const groupCodeEqualsCoCode: Array<{ code: string }> = [];
  for (const g of groupSet) {
    const padded = g.padStart(5, '0');
    if (coSet.has(padded) || coSet.has(g)) {
      groupCodeEqualsCoCode.push({ code: g });
    }
  }

  const distinctCoCodes = Array.from(coSet).sort();
  const distinctGroupCodes = Array.from(groupSet).sort((a, b) => Number(a) - Number(b));

  const canonical = JSON.stringify({
    product: NAIC_LOC_SOURCE.product,
    files: NAIC_LOC_COMPANY_FILES,
    distinctCoCodes,
    distinctGroupCodes,
    memberships: memberships
      .map((m) => `${m.groupCode}|${m.cocode}`)
      .sort(),
    conflicting: sameCoCodeConflictingNames.map((c) => c.cocode).sort(),
  });
  const fingerprint = createHash('sha256').update(canonical).digest('hex');

  return {
    companies,
    groups,
    memberships,
    distinctCoCodes,
    distinctGroupCodes,
    collisions: {
      sameCoCodeConflictingNames,
      groupCodeEqualsCoCode,
      duplicateMemberships,
    },
    statusCounts,
    fileCounts,
    fingerprint,
  };
}

export function predictedLegalInsurerEntities(parse: NaicListingParse) {
  const byCo = new Map<string, NaicCompanyRow[]>();
  for (const row of parse.companies) {
    const list = byCo.get(row.cocode) ?? [];
    list.push(row);
    byCo.set(row.cocode, list);
  }
  return parse.distinctCoCodes.map((cocode) => {
    const rows = byCo.get(cocode) ?? [];
    const d = decideLegalInsurerIdentity({
      cocode,
      names: rows.map((r) => r.companyName),
    });
    return {
      kind: 'legal_insurer' as const,
      provisionalKey: legalInsurerProvisionalKey(cocode),
      cocode,
      legalName: d.legalName,
      identityConfidence: d.confidence,
      reason: d.reason,
      groupCode: rows.find((r) => r.groupCode)?.groupCode ?? null,
      statusCodes: Array.from(new Set(rows.map((r) => r.statusCode))).sort(),
      sourceFiles: Array.from(new Set(rows.map((r) => r.sourceFile))).sort(),
    };
  });
}

export function predictedInsuranceGroupEntities(parse: NaicListingParse) {
  const groupByCode = new Map(parse.groups.map((g) => [g.groupCode, g]));
  const membersByGroup = new Map<string, string[]>();
  for (const m of parse.memberships) {
    const list = membersByGroup.get(m.groupCode) ?? [];
    list.push(m.cocode);
    membersByGroup.set(m.groupCode, list);
  }
  return parse.distinctGroupCodes.map((groupCode) => {
    const row = groupByCode.get(groupCode);
    const d = decideInsuranceGroupIdentity({
      groupCode,
      names: row ? [row.groupName] : [],
    });
    const members = membersByGroup.get(groupCode) ?? [];
    return {
      kind: 'insurance_group' as const,
      provisionalKey: insuranceGroupProvisionalKey(groupCode),
      groupCode,
      groupName: d.groupName,
      identityConfidence: d.confidence,
      memberCoCodes: [...members].sort(),
      memberCount: members.length,
    };
  });
}

export function listingDirFromZipParent(root: string): string | null {
  const extracted = join(root, 'loc-jun-2026');
  if (existsSync(join(extracted, 'PROP.csv'))) return extracted;
  if (existsSync(join(root, 'PROP.csv'))) return root;
  return null;
}

export function sha256File(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function fileBytes(path: string): number | null {
  if (!existsSync(path)) return null;
  return statSync(path).size;
}

export function listLocFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(csv|pdf|zip)$/i.test(f)).sort();
}
