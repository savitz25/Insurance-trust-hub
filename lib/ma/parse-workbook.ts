/**
 * Parse Massachusetts DOI agency list CSV / XLSX, or the licensed-companies dump.
 * Licensed-company files are parsed honestly and tagged — never treated as agencies.
 * XLSX via scripts/vt/xlsx-to-csv.py (openpyxl).
 */

import { createReadStream, existsSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { extname, join, resolve, basename } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import type { MaRawRow, MaRecordKind } from '@/lib/ma/normalize';

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

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9#]+/g, ' ').trim();
}

export function detectMaHeaderKind(cols: string[]): MaRecordKind | null {
  const headers = cols.map(normalizeHeader).filter(Boolean);
  const blob = headers.join(' | ');
  if (
    headers.includes('company type') &&
    (headers.includes('company') || headers.some((h) => h.includes('naic')))
  ) {
    return 'licensed_company';
  }
  if (/licensed or approved companies/i.test(blob)) return null;
  if (
    headers.some((h) =>
      /agency name|license number|license no|business name|legal name|entity name/.test(h)
    )
  ) {
    return 'agency';
  }
  if (headers.includes('name') && headers.some((h) => /license/.test(h))) {
    return 'agency';
  }
  return null;
}

function pick(rec: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (rec[k]) return rec[k]!;
    const found = Object.keys(rec).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && rec[found]) return rec[found]!;
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [rk, val] of Object.entries(rec)) {
    const n = rk.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (lowerKeys.some((k) => n === k.toLowerCase() || n.includes(k.toLowerCase())) && val) {
      return val;
    }
  }
  return '';
}

export function rowFromRecord(
  rec: Record<string, string>,
  sourceFile: string,
  kind: MaRecordKind = 'agency'
): MaRawRow {
  if (kind === 'licensed_company') {
    return {
      name: pick(rec, ['Company', 'Company Name']),
      dba: '',
      licenseNo: pick(rec, ['NAIC #', 'NAIC', 'NAIC Number', 'Company Code']),
      licenseType: pick(rec, ['Company Type', 'Type']),
      licenseStatus: pick(rec, ['Status', 'License Status']) || 'active',
      npn: '',
      phone: pick(rec, ['Phone', 'Telephone', 'Phone Number']),
      address1: pick(rec, ['Address', 'Street Address']),
      city: pick(rec, ['City']),
      state: pick(rec, ['State', 'ST']),
      zip: pick(rec, ['Zip', 'ZIP', 'Zip Code', 'Postal Code']),
      county: pick(rec, ['County']),
      issueDate: '',
      expirationDate: '',
      sourceFile,
      recordKind: 'licensed_company',
    };
  }

  return {
    name: pick(rec, [
      'Agency Name',
      'Business Name',
      'Name of Agency',
      'Name',
      'Legal Name',
      'Entity Name',
    ]),
    dba: pick(rec, ['DBA', 'D/B/A', 'Trade Name', 'Doing Business As']),
    licenseNo: pick(rec, [
      'License Number',
      'License No',
      'License #',
      'Lic Number',
      'Lic No',
    ]),
    licenseType: pick(rec, [
      'License Type',
      'License Class',
      'Line of Authority',
      'LOA',
      'Type',
    ]),
    licenseStatus: pick(rec, ['Status', 'License Status', 'Lic Status']),
    npn: pick(rec, ['NPN', 'National Producer Number']),
    phone: pick(rec, ['Phone', 'Telephone', 'Phone Number', 'Business Phone']),
    address1: pick(rec, [
      'Address',
      'Street Address',
      'Business Address',
      'Address 1',
      'Street',
    ]),
    city: pick(rec, ['City', 'Business City']),
    state: pick(rec, ['State', 'Business State', 'ST']),
    zip: pick(rec, ['Zip', 'ZIP', 'Zip Code', 'Postal Code', 'Business Zip']),
    county: pick(rec, ['County', 'Business County']),
    issueDate: pick(rec, [
      'Issue Date',
      'Date Licensed',
      'Effective Date',
      'Licensed Date',
    ]),
    expirationDate: pick(rec, [
      'Expiration Date',
      'Exp Date',
      'Expires',
      'License Expiration',
    ]),
    sourceFile,
    recordKind: 'agency',
  };
}

function recordFromCols(headers: string[], cols: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((h, idx) => {
    if (!h) return;
    rec[h] = (cols[idx] ?? '').replace(/^\t+/, '').trim();
  });
  return rec;
}

function parseLines(text: string, sourceFile: string): MaRawRow[] {
  const lines = text.split(/\r?\n/);
  let headers: string[] | null = null;
  let kind: MaRecordKind | null = /licensed.?compan/i.test(sourceFile)
    ? 'licensed_company'
    : null;
  const out: MaRawRow[] = [];

  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!headers) {
      const detected = detectMaHeaderKind(cols);
      if (!detected) continue;
      headers = cols.map((h) => h.trim());
      kind = detected;
      continue;
    }
    const rec = recordFromCols(headers, cols);
    const row = rowFromRecord(rec, sourceFile, kind ?? 'agency');
    if (row.licenseNo || row.name) out.push(row);
  }
  return out;
}

export function parseMaCsvSync(absPath: string): MaRawRow[] {
  const { readFileSync } = require('fs') as typeof import('fs');
  return parseLines(readFileSync(absPath, 'utf8'), basename(absPath));
}

export async function parseMaCsv(absPath: string): Promise<MaRawRow[]> {
  const chunks: string[] = [];
  const rl = createInterface({
    input: createReadStream(absPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const rawLine of rl) {
    chunks.push(rawLine);
  }
  return parseLines(chunks.join('\n'), basename(absPath));
}

function convertXlsxToCsv(absXlsx: string): string {
  const script = resolve(process.cwd(), 'scripts/vt/xlsx-to-csv.py');
  if (!existsSync(script)) throw new Error(`Missing ${script}`);
  const out = join(tmpdir(), `ma-doi-${Date.now()}-${basename(absXlsx)}.csv`);
  const res = spawnSync('python', [script, absXlsx, out], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || 'xlsx-to-csv failed');
  }
  return out;
}

export async function parseMaLicenseFile(absPath: string): Promise<MaRawRow[]> {
  if (!existsSync(absPath)) throw new Error(`File not found: ${absPath}`);
  const ext = extname(absPath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parseMaCsv(convertXlsxToCsv(absPath));
  }
  return parseMaCsv(absPath);
}

export function listMaRawFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(xlsx|xls|csv)$/i.test(f) && !/^readme/i.test(f))
    .map((f) => join(dir, f));
}
