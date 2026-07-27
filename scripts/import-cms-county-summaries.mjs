/**
 * Build county-level Medicare intelligence summaries from CMS CPSC enrollment
 * + Star Ratings complaint measure stars (C28/D02).
 *
 * Usage:
 *   set CMS_DATA_ROOT=./cms-data
 *   node scripts/import-cms-county-summaries.mjs
 *
 * Output: lib/insurance/cms/data/county-summaries.json
 */

import fs from 'fs';
import path from 'path';

const REPO = process.cwd();
const CMS_ROOT = process.env.CMS_DATA_ROOT || path.join(REPO, 'cms-data');
const OUT = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'county-summaries.json');

const ENROLL = path.join(
  CMS_ROOT,
  'enrollment',
  'cpsc-enrollment-2026-07',
  'CPSC_Enrollment_2026_07',
  'CPSC_Enrollment_Info_2026_07.csv'
);
const CONTRACT = path.join(
  CMS_ROOT,
  'enrollment',
  'cpsc-enrollment-2026-07',
  'CPSC_Enrollment_2026_07',
  'CPSC_Contract_Info_2026_07.csv'
);
const MEASURE_STARS = path.join(
  CMS_ROOT,
  'star-ratings',
  '2026-star-ratings-data-tables',
  '2026 Star Ratings Data Table - Measure Stars (Oct 8 2025).csv'
);
const COMPLAINT_JSON = path.join(REPO, 'lib', 'insurance', 'cms', 'data', 'complaint-rankings.json');

/** Counties to pre-compute for Phase 2 first slice */
const COUNTY_SPECS = [
  {
    slug: 'miami-dade-fl',
    stateCode: 'FL',
    stateName: 'Florida',
    countyName: 'Miami-Dade',
    fips: '12086',
    hubSlug: 'miami-dade',
    hubStateSlug: 'florida',
    displayName: 'Miami-Dade County',
  },
  {
    slug: 'broward-fl',
    stateCode: 'FL',
    stateName: 'Florida',
    countyName: 'Broward',
    fips: '12011',
    hubSlug: 'broward-county',
    hubStateSlug: 'florida',
    displayName: 'Broward County',
  },
  {
    slug: 'palm-beach-fl',
    stateCode: 'FL',
    stateName: 'Florida',
    countyName: 'Palm Beach',
    fips: '12099',
    hubSlug: 'palm-beach-county',
    hubStateSlug: 'florida',
    displayName: 'Palm Beach County',
  },
];

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        q = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      q = true;
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

function isNumeric(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s || s.includes('%')) return false;
  return Number.isFinite(Number(s.replace(/,/g, '')));
}

function parseMeasureStars(filePath) {
  const map = new Map(); // contractId -> { c28Star, d02Star }
  if (!fs.existsSync(filePath)) return map;
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCSV(text);
  const measures = rows[2].map((c) => c.trim());
  const c28i = measures.findIndex((m) => m.startsWith('C28'));
  const d02i = measures.findIndex((m) => m.startsWith('D02'));
  for (let r = 4; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols?.[0]) continue;
    const id = String(cols[0]).trim();
    const c28 = c28i >= 0 && isNumeric(cols[c28i]) ? Number(cols[c28i]) : null;
    const d02 = d02i >= 0 && isNumeric(cols[d02i]) ? Number(cols[d02i]) : null;
    map.set(id, { c28Star: c28, d02Star: d02 });
  }
  return map;
}

function parseContracts(filePath) {
  const map = new Map();
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCSV(text);
  const h = rows[0].map((x) => x.trim().toLowerCase());
  const idx = {
    id: h.findIndex((x) => x.includes('contract')),
    orgType: h.findIndex((x) => x === 'organization type'),
    planType: h.findIndex((x) => x === 'plan type'),
    offersPartD: h.findIndex((x) => x.includes('offers part d')),
    eghp: h.findIndex((x) => x === 'eghp'),
    marketing: h.findIndex((x) => x.includes('marketing')),
    org: h.findIndex((x) => x === 'organization name'),
  };
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const id = (cols[idx.id] || '').trim();
    if (!id || map.has(id)) continue;
    const orgType = (cols[idx.orgType] || '').trim();
    const eghp = (cols[idx.eghp] || '').trim().toLowerCase();
    map.set(id, {
      orgType,
      planType: (cols[idx.planType] || '').trim(),
      offersPartD: (cols[idx.offersPartD] || '').trim(),
      eghp: eghp === 'yes' || eghp === 'y',
      marketing: (cols[idx.marketing] || cols[idx.org] || id).trim(),
    });
  }
  return map;
}

function classifyBucket(meta, contractId) {
  if (!meta) return 'other';
  if (meta.eghp) return 'employer';
  const ot = meta.orgType.toLowerCase();
  if (ot.includes('employer/union only') || ot.includes('employer/union only direct')) {
    return 'employer';
  }
  if (ot.includes('pdp') || contractId.startsWith('S')) return 'pdp';
  if (
    ot.includes('local ccp') ||
    ot.includes('regional ccp') ||
    ot.includes('pffs') ||
    ot.includes('msa') ||
    contractId.startsWith('H') ||
    contractId.startsWith('R')
  ) {
    return 'ma';
  }
  return 'other';
}

function main() {
  console.error('CMS_ROOT', CMS_ROOT);
  if (!fs.existsSync(ENROLL)) {
    console.error('Missing enrollment file', ENROLL);
    process.exit(1);
  }

  const contracts = parseContracts(CONTRACT);
  const stars = parseMeasureStars(MEASURE_STARS);
  let complaintByContract = {};
  if (fs.existsSync(COMPLAINT_JSON)) {
    complaintByContract = JSON.parse(fs.readFileSync(COMPLAINT_JSON, 'utf8')).byContractId || {};
  }

  const byKey = new Map();
  for (const spec of COUNTY_SPECS) {
    byKey.set(`${spec.stateCode}|${spec.countyName}`, {
      spec,
      publishedEnrollment: 0,
      publishedRows: 0,
      suppressedRows: 0,
      planOptions: new Set(),
      contracts: new Map(), // id -> { published, plans }
    });
  }

  const text = fs.readFileSync(ENROLL, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = parseCSV(lines[i] + '\n')[0];
    const state = (cols[4] || '').trim();
    const county = (cols[5] || '').trim();
    const key = `${state}|${county}`;
    const bucket = byKey.get(key);
    if (!bucket) continue;

    const cid = (cols[0] || '').trim();
    const plan = (cols[1] || '').trim();
    const enr = (cols[6] || '').trim();
    bucket.planOptions.add(`${cid}|${plan}`);
    if (!bucket.contracts.has(cid)) {
      bucket.contracts.set(cid, { published: 0, plans: new Set() });
    }
    const c = bucket.contracts.get(cid);
    c.plans.add(plan);

    if (enr === '*' || enr === '') {
      bucket.suppressedRows++;
      continue;
    }
    const n = Number(String(enr).replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    bucket.publishedEnrollment += n;
    bucket.publishedRows++;
    c.published += n;
  }

  const counties = [];
  for (const bucket of byKey.values()) {
    const { spec } = bucket;
    const contractRows = [];
    for (const [cid, data] of bucket.contracts) {
      const meta = contracts.get(cid);
      const bucketType = classifyBucket(meta, cid);
      const star = stars.get(cid);
      const complaint = complaintByContract[cid];
      const qualityStar =
        star?.c28Star ?? star?.d02Star ?? complaint?.starRating ?? null;
      contractRows.push({
        contractId: cid,
        carrierName: meta?.marketing || complaint?.carrierName || cid,
        publishedEnrollment: data.published,
        planCount: data.plans.size,
        bucket: bucketType,
        complaintRatePerThousand: complaint?.rate ?? null,
        complaintMeasureStar: qualityStar,
      });
    }

    const material = contractRows.filter((c) => c.publishedEnrollment >= 50);
    const consumer = material.filter((c) => c.bucket !== 'employer');
    const ma = consumer.filter((c) => c.bucket === 'ma');
    const pdp = consumer.filter((c) => c.bucket === 'pdp');

    // Star distribution among material consumer contracts with a known complaint-measure star
    const starDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unknown: 0 };
    for (const c of consumer) {
      const s = c.complaintMeasureStar;
      if (s == null || !Number.isFinite(s)) {
        starDist.unknown++;
        continue;
      }
      const rounded = Math.round(s);
      if (rounded >= 1 && rounded <= 5) starDist[rounded]++;
      else starDist.unknown++;
    }

    const topByEnrollment = [...consumer]
      .sort((a, b) => b.publishedEnrollment - a.publishedEnrollment)
      .slice(0, 8)
      .map((c) => ({
        contractId: c.contractId,
        carrierName: c.carrierName,
        publishedEnrollment: c.publishedEnrollment,
        bucket: c.bucket,
        complaintRatePerThousand: c.complaintRatePerThousand,
        complaintMeasureStar: c.complaintMeasureStar,
      }));

    const withComplaint = consumer
      .filter((c) => c.complaintRatePerThousand != null)
      .sort((a, b) => a.complaintRatePerThousand - b.complaintRatePerThousand)
      .slice(0, 5)
      .map((c) => ({
        contractId: c.contractId,
        carrierName: c.carrierName,
        complaintRatePerThousand: c.complaintRatePerThousand,
        publishedEnrollment: c.publishedEnrollment,
      }));

    counties.push({
      slug: spec.slug,
      displayName: spec.displayName,
      stateCode: spec.stateCode,
      stateName: spec.stateName,
      countyName: spec.countyName,
      fips: spec.fips,
      hubSlug: spec.hubSlug,
      hubStateSlug: spec.hubStateSlug,
      enrollmentPeriod: '2026-07',
      metrics: {
        publishedEnrollment: bucket.publishedEnrollment,
        publishedEnrollmentNote:
          'Sum of CPSC county rows with published enrollment only. CMS suppresses cells with 10 or fewer enrollees as "*"; those rows are excluded, so totals are a lower bound.',
        yearOverYearChange: null,
        yearOverYearNote: 'Not available — only a single enrollment month is loaded (July 2026).',
        maPenetrationVsOriginal: null,
        maPenetrationNote:
          'Not available from CPSC enrollment alone (requires Medicare eligibility / Original Medicare county counts).',
        contractsWithAnyPresence: bucket.contracts.size,
        planOptionsWithAnyPresence: bucket.planOptions.size,
        materialContracts: material.length,
        materialThreshold: 50,
        materialConsumerContracts: consumer.length,
        maContractsMaterial: ma.length,
        pdpContractsMaterial: pdp.length,
        publishedRows: bucket.publishedRows,
        suppressedRows: bucket.suppressedRows,
      },
      starDistribution: {
        measure: 'C28 Complaints about the Health Plan star (fallback D02) — not overall Part C/D summary rating',
        counts: starDist,
        contractsWithStar: consumer.length - starDist.unknown,
      },
      topContractsByEnrollment: topByEnrollment,
      lowestComplaintAmongMaterial: withComplaint,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    meta: {
      enrollmentSource: 'CMS Monthly Enrollment by Contract/Plan/State/County — July 2026',
      enrollmentFile: 'CPSC_Enrollment_Info_2026_07.csv',
      contractFile: 'CPSC_Contract_Info_2026_07.csv',
      starSource: 'CMS 2026 Star Ratings Measure Stars (C28/D02)',
      complaintSource: 'lib/insurance/cms/data/complaint-rankings.json (from 2026 Star Ratings Measure Data)',
      syncedAt: '2026-07-27T00:00:00.000Z',
      usingPlaceholderData: false,
    },
    counties,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.error('Wrote', OUT);
  for (const c of counties) {
    console.error(
      c.slug,
      'published',
      c.metrics.publishedEnrollment,
      'material',
      c.metrics.materialConsumerContracts,
      'ma',
      c.metrics.maContractsMaterial
    );
  }
}

main();
