/**
 * Build a compact PPEF NPI presence index for server-side lookup.
 *
 * Full PPEF extract is ~300MB — we only store NPI strings (10 digits) as a
 * sorted JSON array for Set membership checks. Optional --max-rows for tests.
 *
 * Usage:
 *   CMS_DATA_ROOT=... node scripts/import-cms-ppef-index.mjs
 *   CMS_DATA_ROOT=... node scripts/import-cms-ppef-index.mjs --max-rows 50000
 *
 * Output: lib/insurance/cms/data/ppef-active-npis.json (can be large ~20–40MB)
 * If file would be huge, we also write a meta stub and skip full index when
 * PPEF_SKIP_FULL=1 — resolver then only uses Opt Out + optional overrides.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const REPO = process.cwd();
const CMS_ROOT = process.env.CMS_DATA_ROOT || path.join(REPO, '..', 'insurance-trust-hub', 'cms-data');
const INPUT = path.join(CMS_ROOT, 'provider-enrollment', 'PPEF_Enrollment_Extract_2026.07.17.csv');
const OUT = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'ppef-active-npis.json');
const META_OUT = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'ppef-meta.json');

const maxRowsArg = process.argv.indexOf('--max-rows');
const maxRows = maxRowsArg >= 0 ? Number(process.argv[maxRowsArg + 1]) : Infinity;
const skipFull = process.env.PPEF_SKIP_FULL === '1' || process.argv.includes('--skip-full');

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('Missing', INPUT);
    process.exit(1);
  }

  const meta = {
    sourceFile: path.basename(INPUT),
    sourcePathHint: 'cms-data/provider-enrollment/PPEF_Enrollment_Extract_2026.07.17.csv',
    syncedAt: '2026-07-27T00:00:00.000Z',
    dataVintage: 'PPEF 2026-07-17 extract (2026-07-01 dataset release)',
    columnsUsed: ['NPI'],
    note: 'NPI present in PPEF base extract indicates actively approved to bill Medicare FFS (PECOS public file).',
  };

  if (skipFull) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(META_OUT, JSON.stringify(meta, null, 2));
    // Keep empty array so imports don't break — resolver treats empty as "index not loaded"
    if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, '[]');
    console.error('Skipped full PPEF index (PPEF_SKIP_FULL). Meta written.');
    return;
  }

  const stream = fs.createReadStream(INPUT, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerDone = false;
  let npiIdx = 0;
  const npis = new Set();
  let rows = 0;

  for await (const line of rl) {
    if (!headerDone) {
      const header = line.replace(/^\uFEFF/, '').split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      npiIdx = header.findIndex((h) => h.toUpperCase() === 'NPI');
      if (npiIdx < 0) {
        console.error('NPI column not found', header.slice(0, 10));
        process.exit(1);
      }
      headerDone = true;
      continue;
    }
    if (!line) continue;
    // PPEF is simple CSV without embedded commas in NPI field — first column is NPI
    const npi = line.slice(0, 12).split(',')[0].replace(/\D/g, '');
    if (npi.length === 10) npis.add(npi);
    rows++;
    if (rows >= maxRows) break;
    if (rows % 500000 === 0) console.error('…rows', rows, 'unique NPIs', npis.size);
  }

  meta.rowCountScanned = rows;
  meta.uniqueNpis = npis.size;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const sorted = [...npis].sort();
  fs.writeFileSync(OUT, JSON.stringify(sorted));
  fs.writeFileSync(META_OUT, JSON.stringify(meta, null, 2));
  console.error(`Wrote ${sorted.length} NPIs → ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`);
  console.error('Meta →', META_OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
