/**
 * Parse Vermont DFR quarterly licensee spreadsheet / CSV.
 * XLSX is converted via scripts/vt/xlsx-to-csv.py (openpyxl), then streamed.
 */

import { createReadStream, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { extname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import type { VtRawRow } from '@/lib/vt/normalize';

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
  return '';
}

export function rowFromRecord(rec: Record<string, string>): VtRawRow {
  return {
    firstName: pick(rec, ['FIRST NAME', 'First Name']),
    lastOrBusinessName: pick(rec, [
      'LAST NAME OR BUSINESS NAME',
      'Last Name or Business Name',
      'Name',
    ]),
    npn: pick(rec, ['NPN']),
    resState: pick(rec, ['RES STATE', 'Resident State']),
    licenseNo: pick(rec, ['LICENSE NO', 'License No', 'License Number']),
    licenseStatus: pick(rec, ['LICENSE STATUS', 'License Status']),
    licenseClass: pick(rec, ['LICENSE CLASS', 'License Class']),
    licenseEffectiveDate: pick(rec, ['LICENSE EFFECTIVE DATE', 'Effective Date']),
    licenseExpirationDate: pick(rec, ['LICENSE EXPIRATION DATE', 'Expiration Date']),
    loaName: pick(rec, ['LOA NAME', 'LOA', 'Line of Authority']),
    loaStatus: pick(rec, ['LOA STATUS']),
    address1: pick(rec, ['BUS ADDRESS1', 'BUSINESS ADDRESS1', 'Address']),
    address2: pick(rec, ['BUS ADDRESS2']),
    city: pick(rec, ['BUSINESS CITY', 'City']),
    businessStateAbbr: pick(rec, ['BUSINESS STATE ABBR', 'State']),
    zip: pick(rec, ['BUSINESS ZIP', 'BUSINESS ZIP EXCEL', 'Zip']),
    county: pick(rec, ['BUSINESS COUNTY', 'County']),
  };
}

export function parseVtCsvSync(absPath: string): VtRawRow[] {
  const text = readFileSync(absPath, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]!).map((h) => h.trim());
  const out: VtRawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = cols[idx] ?? '';
    });
    const row = rowFromRecord(rec);
    if (row.licenseNo || row.lastOrBusinessName) out.push(row);
  }
  return out;
}

export async function parseVtCsv(absPath: string): Promise<VtRawRow[]> {
  const rows: VtRawRow[] = [];
  let headers: string[] | null = null;
  const rl = createInterface({
    input: createReadStream(absPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!headers) {
      headers = cols.map((h) => h.trim());
      continue;
    }
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] ?? '';
    });
    const row = rowFromRecord(rec);
    if (row.licenseNo || row.lastOrBusinessName) rows.push(row);
  }
  return rows;
}

export function convertVtXlsxToCsv(absXlsx: string): string {
  const script = resolve(process.cwd(), 'scripts/vt/xlsx-to-csv.py');
  if (!existsSync(script)) {
    throw new Error(`Missing ${script}`);
  }
  const out = join(tmpdir(), `vt-dfr-${Date.now()}.csv`);
  const res = spawnSync('python', [script, absXlsx, out], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || 'xlsx-to-csv failed');
  }
  return out;
}

export async function parseVtLicenseFile(absPath: string): Promise<VtRawRow[]> {
  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const ext = extname(absPath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const csv = convertVtXlsxToCsv(absPath);
    return parseVtCsv(csv);
  }
  return parseVtCsv(absPath);
}
