/**
 * INS-HOME-003B — SQL lock of Story #2 + ban on unordered PostgREST pagination.
 * Canonical homepage payload remains 99b7ce6 / fingerprint 934a4872… .
 *   npm run check:ins-home-003b
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import {
  AGENCY_MULTISTATE,
  FORBIDDEN_HOME_COPY,
  INS_HOME_INTEL_VERSION,
  appointmentIsInsurerIdentity,
  brandIsLegalInsurer,
  buildInsuranceHomeIntelV1,
  complaintIsViolation,
  credentialIsAppointment,
  fingerprintHomeIntel,
  geographyIsServiceTerritory,
  licenseIsEndorsement,
  marketplaceIsLicense,
  noMatchIsClean,
} from '../lib/national/home-intel';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const report = JSON.parse(readFileSync(join(root, 'data/reports/ins-home-003b-sql-lock.json'), 'utf8')) as {
  db_writes: number;
  sqlLock: string;
  pass: boolean;
  homepageDecision: string;
  canonicalSha: string;
  homepageFingerprint: string;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  buckets: { one: number; two: number; threeToFour: number; fiveToNine: number; tenPlus: number };
  includedStates: string[];
};

assert(report.db_writes === 0, 'db_writes = 0');
assert(report.sqlLock === 'LOCKED', 'SQL lock status recorded LOCKED');
assert(report.pass === true, 'lock pass');
assert(report.homepageDecision === 'KEEP_PRODUCTION_STORY_2', 'no revert');
assert(report.canonicalSha.startsWith('99b7ce6'), 'canonical SHA 99b7ce6');
assert(report.d1 === 82071 && report.d2 === 82071, 'D1/D2 locked');
assert(report.d3 === 109927 && report.d4 === 117354, 'D3/D4 locked');
assert(report.d2 <= report.d1, 'D2 ≤ D1');
assert(report.d3 >= report.d2, 'D3 ≥ D2');
assert(report.d4 >= report.d3, 'D4 ≥ D3');
assert(
  report.buckets.one +
    report.buckets.two +
    report.buckets.threeToFour +
    report.buckets.fiveToNine +
    report.buckets.tenPlus ===
    report.d2,
  'bucket sum = D2',
);
assert(JSON.stringify(report.includedStates) === JSON.stringify(['FL', 'MA', 'OH', 'TX', 'VT']), 'five source states');

assert(AGENCY_MULTISTATE.d1 === report.d1, 'payload D1');
assert(AGENCY_MULTISTATE.d2 === report.d2, 'payload D2');
assert(AGENCY_MULTISTATE.d3 === report.d3, 'payload D3');
assert(AGENCY_MULTISTATE.d4 === report.d4, 'payload D4');
assert(AGENCY_MULTISTATE.one === report.buckets.one, 'bucket 1');
assert(AGENCY_MULTISTATE.two === report.buckets.two, 'bucket 2');
assert(AGENCY_MULTISTATE.threeToFour === report.buckets.threeToFour, 'bucket 3-4');
assert(AGENCY_MULTISTATE.fiveToNine === report.buckets.fiveToNine, 'bucket 5-9');
assert(AGENCY_MULTISTATE.tenPlus === report.buckets.tenPlus, 'bucket 10+');

const a = buildInsuranceHomeIntelV1('2026-08-29T05:48:24.729Z');
const b = buildInsuranceHomeIntelV1('2026-08-30T00:00:00.000Z');
assert(a.version === INS_HOME_INTEL_VERSION, 'contract version');
assert(a.db_writes === 0, 'payload db_writes');
assert(a.fingerprint === b.fingerprint, 'deterministic fingerprint');
assert(a.fingerprint === fingerprintHomeIntel(a), 'fingerprint recomputes');
assert(
  a.fingerprint === '934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9',
  'homepage fingerprint unchanged from 99b7ce6',
);
assert(a.fingerprint === report.homepageFingerprint, 'report fingerprint matches payload');
assert(a.featuredFindings.length === 3, 'exactly 3 findings');
assert(a.publicAvailability.publicPeople === 0, 'public people 0');
assert(a.publicAvailability.publicLegalInsurers === 0, 'public legal insurers 0');
assert(a.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');

const f2 = a.featuredFindings[1];
assert(f2?.id === 'multi-state-licensing', 'finding 2 id');
assert(f2?.title === 'Some agencies hold credentials across multiple states', 'locked Story #2 title');
assert(/LICENSED_IN is not SERVES/i.test(f2?.summary || ''), 'LICENSED_IN ≠ SERVES');
assert(/attached state credential/i.test(`${f2?.chartCaption} ${f2?.limitation}`), 'attached state credential evidence');
assert(!/active agency licenses/i.test(JSON.stringify(f2)), 'not active licenses');
assert(!/complete 50-state/i.test(f2?.summary || ''), 'not a 50-state census in summary');
assert(f2?.series.every((row) => row.shareOf === AGENCY_MULTISTATE.d2), 'percentages use D2');

const page = readFileSync(join(root, 'components/home/insurance-home-intelligence.tsx'), 'utf8');
const home = JSON.stringify(a) + page;
for (const n of [77887, 61559, 10551, 5760, 74983, 60318, 9590, 5062]) {
  assert(!home.includes(String(n)) && !home.includes(n.toLocaleString('en-US')), `provisional ${n} absent`);
}
assert(home.includes('62,202') || home.includes('62202'), 'canonical 1-state bucket present');

const keyset = readFileSync(join(root, 'scripts/national/run-ins-home-003.ts'), 'utf8');
assert(keyset.includes(".order('id'"), 'keyset ORDER BY id');
assert(keyset.includes(".gt('id'"), 'keyset id cursor');
assert(!/\.range\s*\(/.test(keyset.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'no unordered range pagination in census fetch');
assert(/disqualified/i.test(keyset), 'unordered range ban documented');

const sql = readFileSync(join(root, 'scripts/sql/ins-home-003b-lock.sql'), 'utf8');
assert(/^\s*--/m.test(sql) && /GROUP BY/i.test(sql), 'SQL GROUP BY lock');
assert(/COUNT\(DISTINCT/i.test(sql), 'COUNT DISTINCT in SQL');
assert(/BEGIN READ ONLY/.test(readFileSync(join(root, 'scripts/national/run-ins-home-003b-sql.ts'), 'utf8')), 'SQL runner read-only');
assert(!/\b(INSERT|UPDATE|DELETE|MERGE|CREATE TABLE)\b/.test(sql), 'lock SQL is SELECT-only');
assert(sql.includes("entity_kind = 'agency'"), 'person credentials excluded');
assert(/^[A-Z]{2}$/.test('FL') && sql.includes('^[A-Z]{2}$'), 'two-letter jurisdictions');
assert(!/fuzzy|name similarity/i.test(sql), 'no fuzzy identity');

assert(credentialIsAppointment() === false, 'credential ≠ appointment');
assert(appointmentIsInsurerIdentity() === false, 'appointment ≠ insurer');
assert(licenseIsEndorsement() === false, 'license ≠ endorsement');
assert(marketplaceIsLicense() === false, 'marketplace ≠ license');
assert(complaintIsViolation() === false, 'complaint ≠ violation');
assert(noMatchIsClean() === false, 'no-match ≠ clean');
assert(geographyIsServiceTerritory() === false, 'geo ≠ service territory');
assert(brandIsLegalInsurer() === false, 'brand ≠ legal insurer');
assert(page.includes('data-intel-event="insurance_intel_explain_chart"'), 'Explain this chart');
assert(page.includes('data-intel-event="insurance_intel_trace_number"'), 'Trace this number');
assert(page.includes('href="/texas"'), 'texas intelligence route live');
for (const phrase of FORBIDDEN_HOME_COPY) {
  if (phrase === 'trust score' || phrase === 'paid ranking') continue;
  assert(!page.toLowerCase().includes(phrase), `no ${phrase}`);
}

const snap = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-state-snapshot.json'), 'utf8'));
const ready = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-profile-readiness.json'), 'utf8'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint unchanged');
assert(
  view.fingerprint === '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93',
  'florida fingerprint exact',
);

if (errors.length) {
  console.error(`INS-HOME-003B FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-HOME-003B PASS');
console.log('sqlLock', report.sqlLock);
console.log('fingerprint', a.fingerprint);
console.log('florida', view.fingerprint);
console.log('db_writes', a.db_writes);
