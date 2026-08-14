/**
 * Parse NV DOI firm workbooks / CSV.
 * Section headers:
 *   Firm License Type : Independent Adjuster
 *   Qualification : Casualty
 * apply to following data rows until the next section header.
 */

import { createReadStream, existsSync, readFileSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { basename, extname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

export type NvFirmRawRow = {
  license: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  originalIssueDate: string;
  expirationDate: string;
  firmLicenseType: string;
  qualification: string;
  sheet: string;
  rowNumber: number;
};

export function isNvIndividualProducerFile(pathOrName: string): boolean {
  const n = basename(pathOrName).toLowerCase();
  return /producer.?list/.test(n) && !/firm/.test(n);
}

export function isNvFirmSourceFile(pathOrName: string): boolean {
  const n = basename(pathOrName).toLowerCase();
  if (isNvIndividualProducerFile(n)) return false;
  return /firm/.test(n) && /\.(csv|xlsx|xls)$/i.test(n);
}

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

export function extractFirmLicenseType(cell: string): string | null {
  const s = (cell || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^Firm License Type\s*:\s*(.+)$/i);
  if (!m) return null;
  return m[1]!.trim();
}

export function extractQualification(cell: string): string | null {
  const s = (cell || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^Qualification\s*:\s*(.+)$/i);
  if (!m) return null;
  return m[1]!.trim();
}

function isColumnHeaderRow(cols: string[]): boolean {
  const first = (cols[0] || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return first === 'license' || first.startsWith('license ');
}

function looksLikeLicense(raw: string): boolean {
  const s = raw.trim();
  if (!s || /^firm license type/i.test(s)) return false;
  return /\d/.test(s) && s.length >= 3 && s.length <= 20;
}

type ColMap = {
  license: number;
  name: number;
  address: number;
  city: number;
  state: number;
  zip: number;
  phone: number;
  email: number;
  issue: number;
  exp: number;
};

const DEFAULT_COL_MAP: ColMap = {
  license: 0,
  name: 1,
  address: 2,
  city: 3,
  state: 4,
  zip: 5,
  phone: 6,
  email: 7,
  issue: 8,
  exp: 9,
};

export function headerColMap(cols: string[]): ColMap | null {
  if (!isColumnHeaderRow(cols)) return null;
  const norm = cols.map((c) => c.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  const idx = (re: RegExp, fallback: number) => {
    const i = norm.findIndex((h) => re.test(h));
    return i >= 0 ? i : fallback;
  };
  const exp = idx(/expir|renewal/, 9);
  const issue = idx(/original issue|issue date/, 8);
  return {
    license: idx(/^license$/, 0),
    name: idx(/^name$/, 1),
    address: idx(/^address$/, 2),
    city: idx(/^city$/, 3),
    state: idx(/^state$/, 4),
    zip: idx(/^zip/, 5),
    phone: idx(/^phone/, 6),
    email: idx(/^email/, 7),
    issue,
    exp,
  };
}

function cellAt(cols: string[], i: number): string {
  return (cols[i] || '').trim();
}

export function rowFromCells(
  cols: string[],
  firmLicenseType: string,
  sheet: string,
  rowNumber: number,
  colMap: ColMap = DEFAULT_COL_MAP,
  qualification = ''
): NvFirmRawRow | null {
  const license = cellAt(cols, colMap.license);
  if (!looksLikeLicense(license)) return null;
  const name = cellAt(cols, colMap.name);
  if (!name) return null;
  return {
    license,
    name,
    address: cellAt(cols, colMap.address),
    city: cellAt(cols, colMap.city),
    state: cellAt(cols, colMap.state),
    zip: cellAt(cols, colMap.zip),
    phone: cellAt(cols, colMap.phone),
    email: cellAt(cols, colMap.email),
    originalIssueDate: cellAt(cols, colMap.issue),
    expirationDate: cellAt(cols, colMap.exp),
    firmLicenseType,
    qualification,
    sheet,
    rowNumber,
  };
}

function defaultFirmTypeFromName(absPath: string): string {
  const n = basename(absPath).toLowerCase();
  if (/non-resident|nonresident/.test(n) && /firm/.test(n)) {
    return 'Non-Resident Producer Firm';
  }
  return '';
}

function ingestMatrix(
  lines: string[][],
  sheet: string,
  fallbackFirmType: string
): NvFirmRawRow[] {
  const rows: NvFirmRawRow[] = [];
  let firmType = fallbackFirmType;
  let qualification = '';
  let colMap = DEFAULT_COL_MAP;
  lines.forEach((cols, idx) => {
    if (!cols.some((c) => c?.trim())) return;
    const blob = cols.filter(Boolean).join(' ');
    const headerType = extractFirmLicenseType(cols[0] || '') || extractFirmLicenseType(blob);
    if (headerType) {
      firmType = headerType;
      return;
    }
    const qual = extractQualification(cols[0] || '') || extractQualification(blob);
    if (qual) {
      qualification = qual;
      if (!firmType) firmType = fallbackFirmType;
      return;
    }
    const mapped = headerColMap(cols);
    if (mapped) {
      colMap = mapped;
      return;
    }
    const row = rowFromCells(
      cols,
      firmType,
      sheet,
      idx + 1,
      colMap,
      qualification
    );
    if (row) rows.push(row);
  });
  return rows;
}

export function parseNvFirmsCsvSync(absPath: string): NvFirmRawRow[] {
  const text = readFileSync(absPath, 'utf8');
  const lines: string[][] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    lines.push(parseCsvLine(line));
  }
  return ingestMatrix(lines, 'csv', defaultFirmTypeFromName(absPath));
}

export async function parseNvFirmsCsv(absPath: string): Promise<NvFirmRawRow[]> {
  const lines: string[][] = [];
  const rl = createInterface({
    input: createReadStream(absPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    lines.push(parseCsvLine(line));
  }
  return ingestMatrix(lines, 'csv', defaultFirmTypeFromName(absPath));
}

function excelDateToIso(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(utc.getTime())) return utc.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

export async function parseNvFirmsXlsx(absPath: string): Promise<NvFirmRawRow[]> {
  type XlsxLib = {
    readFile: (
      p: string,
      opts?: object
    ) => { SheetNames: string[]; Sheets: Record<string, unknown> };
    utils: { sheet_to_json: (sheet: unknown, opts?: object) => unknown[][] };
  };
  let xlsx: XlsxLib;
  try {
    const dynImport = new Function('spec', 'return import(spec)') as (
      spec: string
    ) => Promise<XlsxLib>;
    xlsx = await dynImport('xlsx');
  } catch {
    throw new Error(
      'xlsx package is required to parse .xlsx. Run npm install xlsx, or save the workbook as CSV.'
    );
  }
  const wb = xlsx.readFile(absPath, { cellDates: true, raw: false }) as {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  const rows: NvFirmRawRow[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as unknown[][];
    const fallback = defaultFirmTypeFromName(absPath);
    const parsed = ingestMatrix(
      matrix.map((line) =>
        (line ?? []).map((c) =>
          c instanceof Date ? excelDateToIso(c) : String(c ?? '').trim()
        )
      ),
      sheetName,
      fallback
    );
    for (const row of parsed) {
      row.originalIssueDate = excelDateToIso(row.originalIssueDate) || row.originalIssueDate;
      row.expirationDate = excelDateToIso(row.expirationDate) || row.expirationDate;
      rows.push(row);
    }
  }
  return rows;
}

function convertXlsxToCsv(absXlsx: string): string {
  const script = resolve(process.cwd(), 'scripts/vt/xlsx-to-csv.py');
  if (!existsSync(script)) throw new Error(`Missing ${script}`);
  const out = join(tmpdir(), `nv-doi-${Date.now()}-${basename(absXlsx)}.csv`);
  const res = spawnSync('python', [script, absXlsx, out], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || 'xlsx-to-csv failed');
  }
  return out;
}

export async function parseNvFirmsFile(absPath: string): Promise<NvFirmRawRow[]> {
  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const ext = extname(absPath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    try {
      return await parseNvFirmsXlsx(absPath);
    } catch {
      return parseNvFirmsCsv(convertXlsxToCsv(absPath));
    }
  }
  if (ext === '.csv') {
    return parseNvFirmsCsv(absPath);
  }
  const head = readFileSync(absPath, { encoding: 'utf8' }).slice(0, 80);
  if (head.includes('PK')) return parseNvFirmsXlsx(absPath);
  return parseNvFirmsCsv(absPath);
}

export function listNvFirmFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  let files = readdirSync(dir).filter((f) => isNvFirmSourceFile(f));
  const hasXlsxLicense = files.some(
    (f) => /firm/i.test(f) && /license/i.test(f) && /\.xlsx$/i.test(f)
  );
  if (hasXlsxLicense) {
    files = files.filter((f) => !(/firm/i.test(f) && /license/i.test(f) && /\.csv$/i.test(f)));
  }
  return files.map((f) => join(dir, f));
}
