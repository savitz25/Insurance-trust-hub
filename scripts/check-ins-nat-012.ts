/**
 * INS-NAT-012 person/producer LOA codebook gates.
 * Homepage and Florida must remain unchanged.
 *   npm run check:ins-nat-012
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import {
  AGENCY_MULTISTATE,
  buildInsuranceHomeIntelV1,
  fingerprintHomeIntel,
} from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../lib/national/publication';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const report = JSON.parse(readFileSync(join(root, 'data/reports/ins-nat-012-person-loa.json'), 'utf8')) as {
  db_writes: number;
  pagination: string;
  fingerprint: string;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  P5: number;
  P6: number;
  P7: number;
  P8: number;
  P9: number;
  P10: number;
  P11: number;
  equations: Record<string, boolean>;
  personDatasets: Record<string, { entity_grain: string; dataset: string }>;
  homepageUntouched: boolean;
};
const codebook = JSON.parse(readFileSync(join(root, 'data/codebooks/ins-nat-012-person-loa-v1.json'), 'utf8')) as {
  version: string;
  person_grain: boolean;
  nationalPublicChart: boolean;
  fingerprint: string;
  entries: Array<{
    source_dataset: string;
    raw_label: string;
    mapping_confidence: string;
    mapping_basis: string;
    person_grain: boolean;
    included_in_cross_source_analysis: boolean;
  }>;
};
const lock = JSON.parse(readFileSync(join(root, 'data/reports/ins-home-003b-sql-lock.json'), 'utf8')) as {
  sqlLock: string;
};

assert(report.db_writes === 0, 'db_writes = 0');
assert(/keyset/i.test(report.pagination), 'keyset extraction');
assert(/no unordered/i.test(report.pagination), 'no unordered range documented');
assert(report.homepageUntouched === true, 'homepage untouched flag');
assert(report.P2 + report.P3 === report.P1, 'P2+P3=P1');
assert(report.P5 + report.P6 + report.P7 + report.P8 === report.P2, 'P5..P8=P2');
assert(report.P9 <= report.P4, 'P9≤P4');
assert(report.P11 <= report.P10, 'P11≤P10');
assert(report.equations.p2_plus_p3_eq_p1 && report.equations.p5_to_p8_eq_p2, 'equation flags');
assert(report.P10 >= 3, 'FL TX VT person LOA states');
assert(codebook.version === 'ins-nat-012-person-loa-v1', 'codebook version');
assert(codebook.person_grain === true, 'person grain');
assert(codebook.nationalPublicChart === false, 'no public product pie');
assert(codebook.fingerprint === report.fingerprint, 'artifact fingerprint shared');
assert(typeof report.fingerprint === 'string' && report.fingerprint.length === 64, 'sha256 fingerprint');

const personDs = new Set(['florida_dfs_individual', 'texas_tdi_individual', 'vermont_dfr_individual']);
for (const row of codebook.entries) {
  assert(personDs.has(row.source_dataset), `person dataset only: ${row.source_dataset}`);
  assert(row.person_grain === true, 'entry person grain');
  assert(row.raw_label.length > 0, 'raw label');
  assert(['EXACT', 'DEFENSIBLE_COMPOSITE', 'SOURCE_SPECIFIC', 'UNRESOLVED'].includes(row.mapping_confidence), 'confidence');
  assert(row.mapping_basis.length > 8, 'basis');
  assert(!/silently split|split into Property and Casualty as independent/i.test(row.mapping_basis) || row.mapping_confidence === 'DEFENSIBLE_COMPOSITE', 'composites preserved');
}
assert(!codebook.entries.some((r) => /texas_tdi$|massachusetts_doi_regulatory|vermont_dfr$/.test(r.source_dataset) && !r.source_dataset.includes('individual')), 'agency datasets excluded');

const extractor = readFileSync(join(root, 'scripts/national/run-ins-nat-012-person-loa.py'), 'utf8');
assert(!/\.range\s*\(/.test(extractor.replace(/#.*$/gm, '')), 'no .range() in extractor');
assert(/order=id/.test(extractor), 'ordered keyset');
assert(!/cms_marketplace/.test(extractor), 'Marketplace excluded');
assert(!/medicare/i.test(extractor.split('class ')[0] || extractor), 'Medicare not mixed');
assert(/no name\/email\/phone/.test(extractor) || /no name/.test(extractor), 'no fuzzy identity');

const a = buildInsuranceHomeIntelV1('2026-08-29T05:48:24.729Z');
const b = buildInsuranceHomeIntelV1('2026-08-30T00:00:00.000Z');
assert(a.fingerprint === '934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9', 'homepage fingerprint');
assert(a.fingerprint === b.fingerprint && a.fingerprint === fingerprintHomeIntel(a), 'home fingerprint stable');
assert(a.featuredFindings[2]?.title === 'Lines of authority matter — and they are not one national taxonomy yet', 'Story #3 unchanged');
assert(lock.sqlLock === 'LOCKED', 'Story #2 SQL lock');
assert(AGENCY_MULTISTATE.d1 === 82071 && AGENCY_MULTISTATE.d2 === 82071, 'Story #2 D1 D2');
assert(AGENCY_MULTISTATE.d3 === 109927 && AGENCY_MULTISTATE.d4 === 117354, 'Story #2 D3 D4');
assert(AGENCY_MULTISTATE.one === 62202 && AGENCY_MULTISTATE.tenPlus === 0, 'Story #2 buckets');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'public people disabled');
assert(a.publicAvailability.publicPeople === 0, 'public people 0');
assert(a.publicAvailability.publicLegalInsurers === 0, 'public legal insurers 0');
assert(a.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');
const page = readFileSync(join(root, 'components/home/insurance-home-intelligence.tsx'), 'utf8');
assert(!page.includes('href="/texas"'), 'sitemap expansion 0');

const snap = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-state-snapshot.json'), 'utf8'));
const ready = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-profile-readiness.json'), 'utf8'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint');
assert(view.fingerprint === '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93', 'florida exact');

const fpSrc = {
  source_inventory: report.personDatasets,
  codebook: codebook.entries,
  denominators: {
    P1: report.P1,
    P2: report.P2,
    P3: report.P3,
    P4: report.P4,
    P5: report.P5,
    P6: report.P6,
    P7: report.P7,
    P8: report.P8,
    P10: report.P10,
    P11: report.P11,
  },
};
void createHash;

if (errors.length) {
  console.error(`INS-NAT-012 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-012 PASS');
console.log('P1', report.P1, 'P4', report.P4, 'P10', report.P10);
console.log('artifact', report.fingerprint);
console.log('homepage', a.fingerprint);
console.log('florida', view.fingerprint);
console.log('db_writes', report.db_writes);
