/**
 * Build compact Opt Out NPI list from CMS Opt Out Affidavits CSV.
 * Usage: CMS_DATA_ROOT=... node scripts/import-cms-opt-out.mjs
 */
import fs from 'fs';
import path from 'path';

const REPO = process.cwd();
const CMS_ROOT = process.env.CMS_DATA_ROOT || path.join(REPO, '..', 'insurance-trust-hub', 'cms-data');
const INPUT = path.join(CMS_ROOT, 'provider-enrollment', 'OptOut_June2026.csv');
const OUT = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'opt-out-npis.json');

function parseCSVLine(line) {
  const out = [];
  let field = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === ',' && !q) {
      out.push(field);
      field = '';
      continue;
    }
    field += c;
  }
  out.push(field);
  return out;
}

if (!fs.existsSync(INPUT)) {
  console.error('Missing', INPUT);
  process.exit(1);
}

const text = fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/);
const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
const npiIdx = header.findIndex((h) => h === 'npi');
if (npiIdx < 0) {
  console.error('NPI column not found', header);
  process.exit(1);
}

const npis = new Set();
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const cols = parseCSVLine(lines[i]);
  const npi = String(cols[npiIdx] || '').replace(/\D/g, '');
  if (npi.length === 10) npis.add(npi);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const sorted = [...npis].sort();
fs.writeFileSync(OUT, JSON.stringify(sorted));
console.error(`Wrote ${sorted.length} opt-out NPIs → ${OUT} (${fs.statSync(OUT).size} bytes)`);
