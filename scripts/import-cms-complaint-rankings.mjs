/**
 * Parse CMS 2026 Star Ratings Measure Data → Plan Complaint Index rankings.
 * Outputs TypeScript module content to stdout or --out path.
 *
 * Usage:
 *   node scripts/import-cms-complaint-rankings.mjs
 *   node scripts/import-cms-complaint-rankings.mjs --out lib/insurance/cms/generated-rankings.ts
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
// Fallback for Windows path quirks
const REPO = process.cwd();
const CMS_ROOT = process.env.CMS_DATA_ROOT
  || path.join(REPO, 'cms-data')
  || path.join(REPO, 'cms-data');

const MEASURE_DATA = path.join(
  CMS_ROOT,
  'star-ratings',
  '2026-star-ratings-data-tables',
  '2026 Star Ratings Data Table - Measure Data (Oct 8 2025).csv'
);
const MEASURE_STARS = path.join(
  CMS_ROOT,
  'star-ratings',
  '2026-star-ratings-data-tables',
  '2026 Star Ratings Data Table - Measure Stars (Oct 8 2025).csv'
);
const SUMMARY_XLSX_CANDIDATES = [
  path.join(CMS_ROOT, 'star-ratings', '2026-star-ratings-data-tables', '2026 Star Ratings Data Table - Summary Ratings (July 22 2026).xlsx'),
  path.join(CMS_ROOT, 'star-ratings', '2026-star-ratings-data-tables', '2026_Report_Card_Master_Table_2026_07_22.xlsx'),
];
const CPSC_CONTRACT = path.join(
  CMS_ROOT,
  'enrollment',
  'cpsc-enrollment-2026-07',
  'CPSC_Enrollment_2026_07',
  'CPSC_Contract_Info_2026_07.csv'
);
const MEASURE_DATA_2025 = path.join(
  CMS_ROOT,
  'star-ratings',
  '2025-star-ratings-data-tables',
  '2025 Star Ratings Data Table - Measure Data (Dec 2 2024).csv'
);

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function isNumericRate(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  // Percentages like 89% are not complaint rates
  if (s.includes('%')) return false;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n);
}

function parseRate(v) {
  return Number(String(v).trim().replace(/,/g, ''));
}

function parseStarRatingsTable(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCSV(text);
  // row0 title, row1 domain headers, row2 measure codes, row3 measurement periods, row4+ data
  const measureRow = rows[2].map((c) => c.trim());
  const c28i = measureRow.findIndex((m) => m.startsWith('C28'));
  const d02i = measureRow.findIndex((m) => m.startsWith('D02'));
  if (c28i < 0 && d02i < 0) {
    throw new Error(`C28/D02 columns not found in ${filePath}`);
  }

  const out = new Map();
  for (let r = 4; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || !cols[0] || !String(cols[0]).trim()) continue;
    const contractId = String(cols[0]).trim();
    const orgType = String(cols[1] || '').trim();
    const contractName = String(cols[2] || '').trim();
    const marketingName = String(cols[3] || '').trim();
    const parentOrg = String(cols[4] || '').trim();

    let healthRate = null;
    let drugRate = null;
    if (c28i >= 0 && isNumericRate(cols[c28i])) healthRate = parseRate(cols[c28i]);
    if (d02i >= 0 && isNumericRate(cols[d02i])) drugRate = parseRate(cols[d02i]);

    // Prefer health plan complaints (C28); fall back to drug plan (D02)
    const rate = healthRate != null ? healthRate : drugRate;
    if (rate == null) continue;

    const measureUsed = healthRate != null ? 'C28' : 'D02';
    out.set(contractId, {
      contractId,
      orgType,
      contractName,
      marketingName,
      parentOrg,
      healthRate,
      drugRate,
      rate,
      measureUsed,
    });
  }
  return out;
}

function parseMeasureStars(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCSV(text);
  const measureRow = rows[2].map((c) => c.trim());
  const c28i = measureRow.findIndex((m) => m.startsWith('C28'));
  const d02i = measureRow.findIndex((m) => m.startsWith('D02'));
  const stars = new Map();
  for (let r = 4; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || !cols[0]) continue;
    const id = String(cols[0]).trim();
    let s = null;
    if (c28i >= 0 && isNumericRate(cols[c28i])) s = parseRate(cols[c28i]);
    else if (d02i >= 0 && isNumericRate(cols[d02i])) s = parseRate(cols[d02i]);
    if (s != null) stars.set(id, s);
  }
  return stars;
}

/** Build contract → set of state codes from CPSC contract/enrollment info. */
function parseContractStates(filePath) {
  const map = new Map(); // contractId -> Set of states
  if (!fs.existsSync(filePath)) {
    console.error('WARN: CPSC contract info missing:', filePath);
    return map;
  }
  // CPSC_Contract_Info may have Contract ID + state; also try enrollment file for State
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCSV(text);
  if (rows.length < 2) return map;
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const contractIdx = header.findIndex((h) =>
    ['contract id', 'contract_id', 'contractid', 'contract number', 'contract'].includes(h)
  );
  const stateIdx = header.findIndex((h) =>
    ['state', 'state code', 'state_code', 'statecd', 'ssa state'].includes(h) || h === 'state'
  );
  // log header for debugging
  console.error('CPSC Contract header sample:', header.slice(0, 20).join(' | '));
  console.error('contractIdx', contractIdx, 'stateIdx', stateIdx);

  if (contractIdx < 0) return map;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const cid = String(cols[contractIdx] || '').trim();
    if (!cid) continue;
    if (!map.has(cid)) map.set(cid, new Set());
    if (stateIdx >= 0) {
      const st = String(cols[stateIdx] || '').trim().toUpperCase();
      if (st.length === 2) map.get(cid).add(st);
    }
  }
  return map;
}

/**
 * Build contract → { states: Set, enrollmentByState: Map<state, number> }
 * Enrollment "*" is CMS suppression (≤10) — counts as presence but not "material" enrollment.
 */
function parseEnrollmentStates(enrollmentPath) {
  const map = new Map(); // contractId -> { states: Set, materialStates: Set, enrollmentByState: Map }
  if (!fs.existsSync(enrollmentPath)) return map;
  const text = fs.readFileSync(enrollmentPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return map;
  const header = parseCSV(lines[0] + '\n')[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  let stateIdx = header.indexOf('state');
  if (stateIdx < 0) stateIdx = header.findIndex((h) => h === 'state code' || h === 'state_code');
  let contractIdx = header.indexOf('contract number');
  if (contractIdx < 0) {
    contractIdx = header.findIndex(
      (h) => h.includes('contract') && (h.includes('id') || h.includes('number'))
    );
  }
  let enrollIdx = header.indexOf('enrollment');
  console.error('CPSC Enrollment header sample:', header.slice(0, 15).join(' | '));
  console.error('enroll contractIdx', contractIdx, 'stateIdx', stateIdx, 'enrollIdx', enrollIdx);
  if (contractIdx < 0 || stateIdx < 0) return map;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = parseCSV(lines[i] + '\n')[0];
    if (!cols) continue;
    const cid = String(cols[contractIdx] || '').trim();
    const st = String(cols[stateIdx] || '').trim().toUpperCase();
    if (!cid || st.length !== 2) continue;
    if (!map.has(cid)) {
      map.set(cid, { states: new Set(), materialStates: new Set(), enrollmentByState: new Map() });
    }
    const entry = map.get(cid);
    entry.states.add(st);
    const raw = enrollIdx >= 0 ? String(cols[enrollIdx] || '').trim() : '';
    const n = raw && raw !== '*' ? Number(raw.replace(/,/g, '')) : 0;
    if (Number.isFinite(n) && n > 0) {
      entry.enrollmentByState.set(st, (entry.enrollmentByState.get(st) || 0) + n);
      // Material = at least 50 published enrollees in that state (filters EGHP noise)
      if ((entry.enrollmentByState.get(st) || 0) >= 50) {
        entry.materialStates.add(st);
      }
    }
  }
  return map;
}

function classifyPlanType(orgType, contractId, measureUsed) {
  const t = (orgType || '').toLowerCase();
  const id = (contractId || '').toUpperCase();
  if (t.includes('pdp') || id.startsWith('S')) return 'Part D';
  if (measureUsed === 'D02' && (id.startsWith('S') || t.includes('drug'))) return 'Part D';
  // MA-PD if both drug and health typically; CMS org types vary
  if (t.includes('local ccp') || t.includes('regional ccp') || t.includes('pffs') || t.includes('msa') || id.startsWith('H') || id.startsWith('R')) {
    return 'Medicare Advantage';
  }
  if (t.includes('employer') && id.startsWith('S')) return 'Part D';
  return 'Other';
}

function carrierDisplayName(row) {
  const name = (row.marketingName || row.contractName || row.parentOrg || row.contractId).trim();
  // Collapse excessive whitespace
  return name.replace(/\s+/g, ' ');
}

function trendFromRates(current, prior) {
  if (prior == null || current == null) return 'unknown';
  const delta = current - prior;
  // Complaint rates are typically 0–few per 1k; small absolute change matters
  if (Math.abs(delta) < 0.02) return 'stable';
  if (delta < 0) return 'improving'; // lower complaints = better
  return 'worsening';
}

function pickTopForScope(rows, limit) {
  return rows
    .slice()
    .sort((a, b) => a.complaintRatePerThousand - b.complaintRatePerThousand || a.contractId.localeCompare(b.contractId))
    .slice(0, limit);
}

function main() {
  console.error('CMS_ROOT=', CMS_ROOT);
  console.error('MEASURE_DATA exists', fs.existsSync(MEASURE_DATA));

  const current = parseStarRatingsTable(MEASURE_DATA);
  console.error('Contracts with numeric complaint rate:', current.size);

  let prior = new Map();
  try {
    prior = parseStarRatingsTable(MEASURE_DATA_2025);
    console.error('2025 prior contracts with rate:', prior.size);
  } catch (e) {
    console.error('No 2025 prior for trend:', e.message);
  }

  const stars = parseMeasureStars(MEASURE_STARS);
  console.error('Measure stars for complaint measure:', stars.size);

  const enrollPath = path.join(
    CMS_ROOT,
    'enrollment',
    'cpsc-enrollment-2026-07',
    'CPSC_Enrollment_2026_07',
    'CPSC_Enrollment_Info_2026_07.csv'
  );
  console.error('Parsing enrollment for state service areas…');
  const enrollMap = parseEnrollmentStates(enrollPath);
  console.error('Contracts with state mapping:', enrollMap.size);

  const all = [];
  for (const [contractId, row] of current) {
    const geo = enrollMap.get(contractId);
    const states = geo ? [...geo.states].sort() : [];
    const materialStates = geo ? [...geo.materialStates].sort() : [];
    const priorRow = prior.get(contractId);
    const priorRate = priorRow ? priorRow.rate : null;
    const planType = classifyPlanType(row.orgType, contractId, row.measureUsed);
    const starRating = stars.has(contractId) ? stars.get(contractId) : null;

    // Skip pure employer/union direct PDP rows for consumer-facing index when rate is only D02 and no marketing name
    all.push({
      contractId,
      carrierName: carrierDisplayName(row),
      parentOrg: row.parentOrg,
      orgType: row.orgType,
      complaintRatePerThousand: row.rate,
      measureUsed: row.measureUsed,
      starRating,
      trend: trendFromRates(row.rate, priorRate),
      planType,
      states,
      materialStates,
    });
  }

  const isEmployerOnly = (r) => {
    const t = (r.orgType || '').toLowerCase();
    return t.includes('employer/union only direct') || t.includes('employer/union only');
  };

  // Prefer non-employer consumer MA/PD contracts for national display
  const consumerPool = all.filter((r) => !isEmployerOnly(r));

  // National: top 40 lowest complaint rates
  const national = pickTopForScope(consumerPool.length ? consumerPool : all, 40).map((r, i) => ({
    ...r,
    stateCode: 'US',
    stateName: 'National',
    rank: i + 1,
  }));

  // State tabs: material enrollment (≥50 published) and not employer-only EGHP noise
  const flPool = consumerPool.filter((r) => r.materialStates.includes('FL'));
  const txPool = consumerPool.filter((r) => r.materialStates.includes('TX'));
  console.error('FL material consumer contracts:', flPool.length, 'TX:', txPool.length);

  function toRankingRow(r, i, stateCode, stateName) {
    return {
      id: `${stateCode.toLowerCase()}-${r.contractId}`,
      rank: i + 1,
      carrierName: r.carrierName,
      contractId: r.contractId,
      stateCode,
      stateName,
      complaintRatePerThousand: r.complaintRatePerThousand,
      starRating: r.starRating,
      trend: r.trend,
      planType: r.planType,
      measureUsed: r.measureUsed,
      isPlaceholder: false,
    };
  }

  const florida = pickTopForScope(flPool, 25).map((r, i) => toRankingRow(r, i, 'FL', 'Florida'));
  const texas = pickTopForScope(txPool, 25).map((r, i) => toRankingRow(r, i, 'TX', 'Texas'));
  // rebuild national with clean shape
  const nationalClean = national.map((r, i) => toRankingRow(r, i, 'US', 'National'));

  // Stats
  const rates = all.map((r) => r.complaintRatePerThousand).sort((a, b) => a - b);
  console.error('Rate min/median/max', rates[0], rates[Math.floor(rates.length / 2)], rates[rates.length - 1]);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFiles: {
      measureData: path.basename(MEASURE_DATA),
      measureStars: path.basename(MEASURE_STARS),
      measureData2025: path.basename(MEASURE_DATA_2025),
      cpscContract: path.basename(CPSC_CONTRACT),
    },
    meta: {
      dataVintage: '2026 Star Ratings (CY2024 measurement for C28/D02)',
      syncedAt: '2026-07-27T00:00:00.000Z',
      sourceLabel: 'CMS 2026 Star Ratings Data Tables — Measure Data',
      sourceDataset:
        'C28: Complaints about the Health Plan · D02: Complaints about the Drug Plan (rate per 1,000 member months / CMS Star measure scale)',
      usingPlaceholderData: false,
      totalContractsWithRate: all.length,
      floridaContracts: flPool.length,
      texasContracts: txPool.length,
    },
    national: nationalClean,
    florida,
    texas,
    // Full index for lookup by contract (compact) — used by Trust Score / verification
    byContractId: Object.fromEntries(
      all.map((r) => [
        r.contractId,
        {
          rate: r.complaintRatePerThousand,
          measure: r.measureUsed,
          carrierName: r.carrierName,
          planType: r.planType,
          starRating: r.starRating,
          materialStates: r.materialStates,
        },
      ])
    ),
  };

  const outIdx = process.argv.indexOf('--out');
  const outJsonIdx = process.argv.indexOf('--json');
  if (outJsonIdx >= 0) {
    const p = process.argv[outJsonIdx + 1];
    fs.writeFileSync(p, JSON.stringify(payload, null, 2));
    console.error('Wrote JSON', p);
  }

  // Always write processed JSON into lib for the app to import
  const defaultJson = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'complaint-rankings.json');
  fs.mkdirSync(path.dirname(defaultJson), { recursive: true });
  fs.writeFileSync(defaultJson, JSON.stringify(payload, null, 2));
  console.error('Wrote', defaultJson, 'bytes', fs.statSync(defaultJson).size);

  console.error('\nNational top 8:');
  nationalClean.slice(0, 8).forEach((r) =>
    console.error(`  ${r.rank}. ${r.contractId} ${r.carrierName} ${r.complaintRatePerThousand} (${r.planType})`)
  );
  console.error('\nFlorida top 8:');
  florida.slice(0, 8).forEach((r) =>
    console.error(`  ${r.rank}. ${r.contractId} ${r.carrierName} ${r.complaintRatePerThousand}`)
  );
  console.error('\nTexas top 8:');
  texas.slice(0, 8).forEach((r) =>
    console.error(`  ${r.rank}. ${r.contractId} ${r.carrierName} ${r.complaintRatePerThousand}`)
  );
}

main();
