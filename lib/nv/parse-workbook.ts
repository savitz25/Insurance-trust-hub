/**
 * Parse NV DOI "Firms by License Type" workbook / CSV.
 * Section headers: "Firm License Type : Independent Adjuster"
 * apply to following data rows until the next section header.
 */

import { createReadStream, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { extname } from 'path';

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
  sheet: string;
  rowNumber: number;
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

export function extractFirmLicenseType(cell: string): string | null {
  const s = (cell || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^Firm License Type\s*:\s*(.+)$/i);
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

export function rowFromCells(
  cols: string[],
  firmLicenseType: string,
  sheet: string,
  rowNumber: number
): NvFirmRawRow | null {
  const license = (cols[0] || '').trim();
  if (!looksLikeLicense(license)) return null;
  const name = (cols[1] || '').trim();
  if (!name) return null;
  return {
    license,
    name,
    address: (cols[2] || '').trim(),
    city: (cols[3] || '').trim(),
    state: (cols[4] || '').trim(),
    zip: (cols[5] || '').trim(),
    phone: (cols[6] || '').trim(),
    email: (cols[7] || '').trim(),
    originalIssueDate: (cols[8] || '').trim(),
    expirationDate: (cols[9] || '').trim(),
    firmLicenseType,
    sheet,
    rowNumber,
  };
}

export function parseNvFirmsCsvSync(absPath: string): NvFirmRawRow[] {
  const text = readFileSync(absPath, 'utf8');
  const rows: NvFirmRawRow[] = [];
  let firmType = '';
  let rowNumber = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    rowNumber++;
    const cols = parseCsvLine(line);
    const headerType = extractFirmLicenseType(cols[0] || '') || extractFirmLicenseType(line);
    if (headerType) {
      firmType = headerType;
      continue;
    }
    if (isColumnHeaderRow(cols)) continue;
    const row = rowFromCells(cols, firmType, 'csv', rowNumber);
    if (row) rows.push(row);
  }
  return rows;
}

export async function parseNvFirmsCsv(absPath: string): Promise<NvFirmRawRow[]> {
  const rows: NvFirmRawRow[] = [];
  let firmType = '';
  let rowNumber = 0;
  const rl = createInterface({
    input: createReadStream(absPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    rowNumber++;
    const cols = parseCsvLine(line);
    const headerType = extractFirmLicenseType(cols[0] || '') || extractFirmLicenseType(line);
    if (headerType) {
      firmType = headerType;
      continue;
    }
    if (isColumnHeaderRow(cols)) continue;
    const row = rowFromCells(cols, firmType, 'csv', rowNumber);
    if (row) rows.push(row);
  }
  return rows;
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
    let firmType = '';
    matrix.forEach((line, idx) => {
      const cols = (line ?? []).map((c) =>
        c instanceof Date ? excelDateToIso(c) : String(c ?? '').trim()
      );
      if (!cols.some((c) => c)) return;
      const headerType =
        extractFirmLicenseType(cols[0] || '') ||
        extractFirmLicenseType(cols.filter(Boolean).join(' '));
      if (headerType) {
        firmType = headerType;
        return;
      }
      if (isColumnHeaderRow(cols)) return;
      const row = rowFromCells(cols, firmType, sheetName, idx + 1);
      if (row) {
        row.originalIssueDate = excelDateToIso(row.originalIssueDate) || row.originalIssueDate;
        row.expirationDate = excelDateToIso(row.expirationDate) || row.expirationDate;
        rows.push(row);
      }
    });
  }
  return rows;
}

export async function parseNvFirmsFile(absPath: string): Promise<NvFirmRawRow[]> {
  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const ext = extname(absPath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parseNvFirmsXlsx(absPath);
  }
  if (ext === '.csv') {
    return parseNvFirmsCsv(absPath);
  }
  const head = readFileSync(absPath, { encoding: 'utf8' }).slice(0, 80);
  if (head.includes('PK')) return parseNvFirmsXlsx(absPath);
  return parseNvFirmsCsv(absPath);
}
