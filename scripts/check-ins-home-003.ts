/**
 * INS-HOME-003 agency × distinct credentialed-state rollup + Finding #2 gates.
 *   npm run check:ins-home-003
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import {
  AGENCY_MULTISTATE,
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
const report = JSON.parse(
  readFileSync(join(root, 'data/reports/ins-home-003-multistate.json'), 'utf8'),
) as {
  db_writes: number;
  pass: boolean;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  buckets: { one: number; two: number; threeToFour: number; fiveToNine: number; tenPlus: number };
  exclusions: Record<string, number>;
  includedStates: string[];
};

assert(report.db_writes === 0, 'db_writes = 0');
assert(report.pass === true, 'rollup gates');
assert(report.d2 <= report.d1, 'D2 <= D1');
assert(
  report.buckets.one +
    report.buckets.two +
    report.buckets.threeToFour +
    report.buckets.fiveToNine +
    report.buckets.tenPlus ===
    report.d2,
  'bucket sum = D2',
);
assert(report.d3 >= report.d2, 'D3 >= D2');
assert(report.exclusions.agencyCredentialRowsScanned === report.d4, 'D4 = scanned agency credential rows');
assert(report.exclusions.excludedUnknownState === 0, 'no unknown-state counted');
assert(JSON.stringify(report.includedStates) === JSON.stringify(['FL', 'MA', 'OH', 'TX', 'VT']), 'included states');

assert(AGENCY_MULTISTATE.d1 === report.d1, 'locked D1');
assert(AGENCY_MULTISTATE.d2 === report.d2, 'locked D2');
assert(AGENCY_MULTISTATE.d3 === report.d3, 'locked D3');
assert(AGENCY_MULTISTATE.d4 === report.d4, 'locked D4');
assert(AGENCY_MULTISTATE.one === report.buckets.one, 'bucket 1');
assert(AGENCY_MULTISTATE.two === report.buckets.two, 'bucket 2');
assert(AGENCY_MULTISTATE.threeToFour === report.buckets.threeToFour, 'bucket 3-4');
assert(AGENCY_MULTISTATE.fiveToNine === report.buckets.fiveToNine, 'bucket 5-9');
assert(AGENCY_MULTISTATE.tenPlus === report.buckets.tenPlus, 'bucket 10+');

const a = buildInsuranceHomeIntelV1('2026-08-29T05:21:39.295Z');
const b = buildInsuranceHomeIntelV1('2026-08-30T00:00:00.000Z');
assert(a.version === INS_HOME_INTEL_VERSION, 'keep insurance-home-intel-v1');
assert(a.fingerprint === b.fingerprint, 'deterministic fingerprint');
assert(a.fingerprint === fingerprintHomeIntel(a), 'fingerprint recomputes');
assert(a.featuredFindings.length === 3, 'exactly 3 findings');
assert(a.featuredFindings[0]?.id === 'network', 'finding 1 unchanged id');
assert(a.featuredFindings[2]?.id === 'lines-of-authority', 'finding 3 unchanged id');
const f2 = a.featuredFindings[1];
assert(f2?.id === 'multi-state-licensing', 'finding 2 id');
assert(f2?.title === 'Some agencies hold credentials across multiple states', 'finding 2 title');
assert(f2?.series.length === 5, 'five buckets');
assert(f2?.series.reduce((n, row) => n + row.value, 0) === AGENCY_MULTISTATE.d2, 'series sum D2');
assert(f2?.series.every((row) => row.shareOf === AGENCY_MULTISTATE.d2), 'percentages use D2');
const pct = f2!.series.reduce((n, row) => n + (100 * row.value) / (row.shareOf || 1), 0);
assert(Math.abs(pct - 100) < 0.15, `percentage total ~100 got ${pct.toFixed(2)}`);
assert(/LICENSED_IN is not SERVES/i.test(f2?.summary || ''), 'LICENSED_IN ≠ SERVES');
assert(!/best|top agent|trust score|safest/i.test(JSON.stringify(f2)), 'no quality/rank language');

assert(a.agencyMultistate.d2 === 82071, 'payload D2');
assert(credentialIsAppointment() === false, 'credential ≠ appointment');
assert(appointmentIsInsurerIdentity() === false, 'appointment ≠ insurer');
assert(licenseIsEndorsement() === false, 'license ≠ endorsement');
assert(marketplaceIsLicense() === false, 'marketplace ≠ license');
assert(complaintIsViolation() === false, 'complaint ≠ violation');
assert(noMatchIsClean() === false, 'no-match ≠ clean');
assert(geographyIsServiceTerritory() === false, 'geo ≠ service territory');
assert(brandIsLegalInsurer() === false, 'brand ≠ legal insurer');

const page = readFileSync(join(root, 'components/home/insurance-home-intelligence.tsx'), 'utf8');
assert(page.includes('data-intel-event="insurance_intel_explain_chart"'), 'reuse explain event');
assert(page.includes('href="/texas"'), 'texas intelligence route live');
assert(page.includes('href="/washington"'), 'washington intelligence route live');

const snap = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-state-snapshot.json'), 'utf8'));
const ready = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-profile-readiness.json'), 'utf8'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint unchanged');
assert(
  view.fingerprint === '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93',
  'florida fingerprint exact',
);

if (errors.length) {
  console.error(`INS-HOME-003 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-HOME-003 PASS');
console.log('fingerprint', a.fingerprint);
console.log('d2', AGENCY_MULTISTATE.d2);
console.log('florida', view.fingerprint);
