/**
 * Parse Mississippi MID Insurance Producer Entity CSV / XLSX.
 * Real export headers: AGENCYID, NAME, MAILADDRESS*, MAILCITY, MAILSTATE, MAILZIP, PHONE, EXP. DATE
 * XLSX via scripts/vt/xlsx-to-csv.py (openpyxl).
 */

import { createReadStream, existsSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { extname, join, resolve, basename } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import type { MsRawRow } from '@/lib/ms/normalize';

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

function pick(rec: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (rec[k]) return rec[k]!;
    const found = Object.keys(rec).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && rec[found]) return rec[found]!;
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [rk, val] of Object.entries(rec)) {
    const n = rk.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim();
    if (lowerKeys.some((k) => n === k.toLowerCase() || n.includes(k.toLowerCase())) && val) {
      return val;
    }
  }
  return '';
}

export function rowFromRecord(rec: Record<string, string>, sourceFile: string): MsRawRow {
  const addr = [
    pick(rec, ['MAILADDRESS1', 'Mail Address 1', 'Address 1', 'Address', 'Street']),
    pick(rec, ['MAILADDRESS2', 'Mail Address 2', 'Address 2']),
    pick(rec, ['MAILADDRESS3', 'Mail Address 3', 'Address 3']),
  ]
    .filter(Boolean)
    .join(', ');

  return {
    name: pick(rec, ['NAME', 'Agency Name', 'Entity Name', 'Legal Name', 'Business Name']),
    dba: pick(rec, ['DBA', 'D/B/A', 'Trade Name']),
    licenseNo: pick(rec, [
      'AGENCYID',
      'Agency ID',
      'License Number',
      'License No',
      'License #',
    ]),
    licenseType:
      pick(rec, ['License Type', 'License Class', 'Type']) || 'Insurance Producer Entity',
    licenseStatus: pick(rec, ['Status', 'License Status']) || 'active',
    npn: pick(rec, ['NPN', 'National Producer Number']),
    phone: pick(rec, ['PHONE', 'Phone', 'Telephone']),
    address1: addr,
    city: pick(rec, ['MAILCITY', 'Mail City', 'City']),
    state: pick(rec, ['MAILSTATE', 'Mail State', 'State', 'ST']),
    zip: pick(rec, ['MAILZIP', 'Mail Zip', 'Zip', 'ZIP', 'Zip Code']),
    county: pick(rec, ['County', 'MAILCOUNTY']),
    issueDate: pick(rec, ['Issue Date', 'Effective Date']),
    expirationDate: pick(rec, ['EXP. DATE', 'Exp. Date', 'Expiration Date', 'Exp Date']),
    sourceFile,
  };
}

function recordFromCols(headers: string[], cols: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((h, idx) => {
    if (!h) return;
    rec[h] = (cols[idx] ?? '').trim();
  });
  return rec;
}

function looksLikeHeader(cols: string[]): boolean {
  const blob = cols.map((c) => c.toLowerCase()).join(' | ');
  return /agencyid|license number|name/.test(blob) && /name|city|state/.test(blob);
}

function parseLines(text: string, sourceFile: string): MsRawRow[] {
  const lines = text.split(/\r?\n/);
  let headers: string[] | null = null;
  const out: MsRawRow[] = [];
  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!headers) {
      if (!looksLikeHeader(cols)) continue;
      headers = cols.map((h) => h.trim());
      continue;
    }
    const rec = recordFromCols(headers, cols);
    const row = rowFromRecord(rec, sourceFile);
    if (row.licenseNo || row.name) out.push(row);
  }
  return out;
}

export function parseMsCsvSync(absPath: string): MsRawRow[] {
  const { readFileSync } = require('fs') as typeof import('fs');
  return parseLines(readFileSync(absPath, 'utf8'), basename(absPath));
}

export async function parseMsCsv(absPath: string): Promise<MsRawRow[]> {
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
  const out = join(tmpdir(), `ms-mid-${Date.now()}-${basename(absXlsx)}.csv`);
  const res = spawnSync('python', [script, absXlsx, out], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || 'xlsx-to-csv failed');
  }
  return out;
}

export async function parseMsLicenseFile(absPath: string): Promise<MsRawRow[]> {
  if (!existsSync(absPath)) throw new Error(`File not found: ${absPath}`);
  const ext = extname(absPath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parseMsCsv(convertXlsxToCsv(absPath));
  }
  return parseMsCsv(absPath);
}

export function resolveMsSourceFile(input: string): string {
  if (existsSync(input)) return input;
  for (const ext of ['.csv', '.xlsx', '.xls']) {
    if (existsSync(input + ext)) return input + ext;
  }
  throw new Error(`File not found: ${input}`);
}

export function listMsRawFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(xlsx|xls|csv)$/i.test(f) && !/^readme/i.test(f))
    .map((f) => join(dir, f));
}
