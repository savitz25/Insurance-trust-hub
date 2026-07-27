/**
 * Build searchable PPEF shards for Medicare provider lookup (Phase 3A).
 *
 * Fields from PPEF base extract:
 * NPI, PROVIDER_TYPE_DESC, STATE_CD, FIRST_NAME, MDL_NAME, LAST_NAME, ORG_NAME
 * (City/address are in a separate PPEF location file — not included here.)
 *
 * Usage:
 *   set CMS_DATA_ROOT=path/to/cms-data
 *   node scripts/import-cms-ppef-search-shards.mjs
 *   node scripts/import-cms-ppef-search-shards.mjs --states=FL,TX
 *
 * Output: lib/insurance/cms/data/ppef-search/{STATE}/{LETTER}.json
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const REPO = process.cwd();
const CMS_ROOT =
  process.env.CMS_DATA_ROOT || path.join(REPO, '..', 'insurance-trust-hub', 'cms-data');
const INPUT = path.join(
  CMS_ROOT,
  'provider-enrollment',
  'PPEF_Enrollment_Extract_2026.07.17.csv'
);
const OUT_DIR = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'ppef-search');

const statesArg = process.argv.find((a) => a.startsWith('--states='));
const STATES = new Set(
  (statesArg ? statesArg.split('=')[1] : 'FL')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
);

function shardKey(lastName, orgName) {
  const raw = (lastName || orgName || '').trim().toUpperCase();
  if (!raw) return '_';
  const ch = raw[0];
  if (ch >= 'A' && ch <= 'Z') return ch;
  return '_';
}

function parseLine(line) {
  // PPEF base file has no quoted commas in practice for name fields; use CSV-safe parse
  const cols = [];
  let field = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === ',' && !q) {
      cols.push(field);
      field = '';
      continue;
    }
    field += c;
  }
  cols.push(field);
  return cols;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('Missing PPEF extract:', INPUT);
    process.exit(1);
  }

  console.error('Building PPEF search shards for states:', [...STATES].join(', '));
  console.error('Input:', INPUT);

  // state -> letter -> array
  const buckets = new Map();
  for (const st of STATES) buckets.set(st, new Map());

  const stream = fs.createReadStream(INPUT, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerDone = false;
  let rows = 0;
  let kept = 0;
  const idx = {
    npi: 0,
    typeDesc: 5,
    state: 6,
    first: 7,
    mid: 8,
    last: 9,
    org: 10,
  };

  for await (const line of rl) {
    if (!headerDone) {
      const h = parseLine(line).map((x) => x.trim().toUpperCase());
      idx.npi = h.indexOf('NPI');
      idx.typeDesc = h.indexOf('PROVIDER_TYPE_DESC');
      idx.state = h.indexOf('STATE_CD');
      idx.first = h.indexOf('FIRST_NAME');
      idx.mid = h.indexOf('MDL_NAME');
      idx.last = h.indexOf('LAST_NAME');
      idx.org = h.indexOf('ORG_NAME');
      headerDone = true;
      continue;
    }
    if (!line) continue;
    rows++;
    const cols = parseLine(line);
    const state = (cols[idx.state] || '').trim().toUpperCase();
    if (!STATES.has(state)) continue;

    const npi = (cols[idx.npi] || '').replace(/\D/g, '');
    if (npi.length !== 10) continue;

    const first = (cols[idx.first] || '').trim();
    const mid = (cols[idx.mid] || '').trim();
    const last = (cols[idx.last] || '').trim();
    const org = (cols[idx.org] || '').trim();
    const typeDesc = (cols[idx.typeDesc] || '').trim();

    const letter = shardKey(last, org);
    const stateMap = buckets.get(state);
    if (!stateMap.has(letter)) stateMap.set(letter, []);
    stateMap.get(letter).push({
      npi,
      first,
      mid,
      last,
      org,
      state,
      type: typeDesc,
    });
    kept++;
    if (kept % 50000 === 0) console.error('…kept', kept, 'scanned', rows);
  }

  // Write shards + manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(INPUT),
    dataVintage: 'PPEF Enrollment Extract 2026.07.17',
    syncedAt: '2026-07-27T00:00:00.000Z',
    fields: ['npi', 'first', 'mid', 'last', 'org', 'state', 'type'],
    notes: [
      'Built from CMS Medicare Fee-For-Service Public Provider Enrollment base extract.',
      'City/address not included (separate PPEF practice-location sub-file).',
      'Presence in this index indicates the NPI appeared in the PPEF active enrollment extract for the listed state.',
    ],
    states: {},
  };

  for (const [state, letterMap] of buckets) {
    const stateDir = path.join(OUT_DIR, state);
    fs.mkdirSync(stateDir, { recursive: true });
    let stateTotal = 0;
    const letters = [];
    for (const [letter, records] of letterMap) {
      // Deduplicate by NPI (keep first)
      const seen = new Set();
      const unique = [];
      for (const r of records) {
        if (seen.has(r.npi)) continue;
        seen.add(r.npi);
        unique.push(r);
      }
      unique.sort((a, b) => {
        const la = (a.last || a.org || '').localeCompare(b.last || b.org || '');
        if (la !== 0) return la;
        return (a.first || '').localeCompare(b.first || '');
      });
      const file = path.join(stateDir, `${letter}.json`);
      fs.writeFileSync(file, JSON.stringify(unique));
      stateTotal += unique.length;
      letters.push({ letter, count: unique.length, file: `${state}/${letter}.json` });
      console.error('Wrote', state, letter, unique.length);
    }
    manifest.states[state] = { total: stateTotal, shards: letters.sort((a, b) => a.letter.localeCompare(b.letter)) };
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.error('Done. Manifest →', path.join(OUT_DIR, 'manifest.json'));
  console.error(JSON.stringify(manifest.states, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
