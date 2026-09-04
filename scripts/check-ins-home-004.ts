/**
 * INS-HOME-004 — agency LOA normalization audit gates.
 * Story #3 remains the source-family taxonomy story.
 *   npm run check:ins-home-004
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
const census = JSON.parse(readFileSync(join(root, 'data/reports/ins-home-004-loa-census.json'), 'utf8')) as {
  db_writes: number;
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
  L6: number;
  L7: number;
  L8: number;
  residual: number;
  storyDecision: string;
  pagination: string;
  codebook: Array<{
    raw_label: string;
    raw_code: string | null;
    mapping_confidence: string;
    mapping_basis: string;
    included_in_national_story: boolean;
    source_dataset: string;
    raw_rows: number;
  }>;
};
const codebook = JSON.parse(readFileSync(join(root, 'data/codebooks/ins-home-004-agency-loa-v1.json'), 'utf8')) as {
  version: string;
  nationalStory: string;
  entries: unknown[];
};
const lock = JSON.parse(readFileSync(join(root, 'data/reports/ins-home-003b-sql-lock.json'), 'utf8')) as {
  sqlLock: string;
};

assert(census.db_writes === 0, 'db_writes = 0');
assert(/keyset/i.test(census.pagination), 'deterministic keyset');
assert(!/unordered/i.test(census.pagination) || /no unordered/i.test(census.pagination), 'no unordered census');
assert(census.storyDecision === 'INTENTIONALLY_UNCHANGED', 'Story #3 unchanged');
assert(codebook.nationalStory === 'INTENTIONALLY_UNCHANGED', 'codebook national story');
assert(census.L1 === 69545, 'L1 agency LOA rows');
assert(census.L2 + census.L3 + census.L4 + census.residual === census.L1, 'L2+L3+L4+excl = L1');
assert(census.L6 <= census.L5, 'L6 ≤ L5');
assert(census.L8 <= census.L7, 'L8 ≤ L7');
assert(census.L7 === 3, 'L7 TX/MA/VT');
assert(census.L4 === 0, 'no hidden unresolved residual after codebook');

for (const row of census.codebook) {
  assert(typeof row.raw_label === 'string' && row.raw_label.length > 0, 'raw label');
  assert('raw_code' in row, 'raw code field');
  assert(['EXACT', 'DEFENSIBLE_COMPOSITE', 'SOURCE_SPECIFIC', 'UNRESOLVED'].includes(row.mapping_confidence), 'confidence');
  assert(row.mapping_basis.length > 10, 'mapping basis');
  assert(row.included_in_national_story === false, 'not in national family chart');
}
assert(!census.codebook.some((r) => /texas_tdi_individual|florida_dfs_individual|vermont_dfr_individual/.test(r.source_dataset)), 'no person LOA datasets in agency codebook');

const extractor = readFileSync(join(root, 'scripts/national/run-ins-home-004-loa-keyset.py'), 'utf8');
assert(!/\.range\s*\(/.test(extractor), 'extractor has no range()');
assert(/order=id/.test(extractor), 'ordered keyset');
assert(!/cms_marketplace|medicare/i.test(extractor), 'no CMS/Medicare in extractor');
assert(!/appointment/i.test(extractor), 'no appointments in extractor');

const a = buildInsuranceHomeIntelV1('2026-08-29T05:48:24.729Z');
const b = buildInsuranceHomeIntelV1('2026-08-30T00:00:00.000Z');
assert(a.version === INS_HOME_INTEL_VERSION, 'contract version');
assert(a.fingerprint === '94aa1ee193c1b7c62e83bc9060a18202a3c8a71ec5ec5fb1d8bc0775857905bb', 'homepage fingerprint unchanged');
assert(a.fingerprint === b.fingerprint, 'deterministic fingerprint');
assert(a.fingerprint === fingerprintHomeIntel(a), 'fingerprint recomputes');
assert(a.featuredFindings[0]?.id === 'network', 'Story #1 unchanged');
assert(a.featuredFindings[0]?.title === 'Insurance is a network, not one company list', 'Story #1 title');
const f2 = a.featuredFindings[1];
assert(f2?.title === 'Some agencies hold credentials across multiple states', 'Story #2 title');
assert(lock.sqlLock === 'LOCKED', 'Story #2 SQL lock LOCKED');
assert(AGENCY_MULTISTATE.d1 === 82071 && AGENCY_MULTISTATE.d2 === 82071, 'Story #2 D1 D2');
assert(AGENCY_MULTISTATE.d3 === 109927 && AGENCY_MULTISTATE.d4 === 117354, 'Story #2 D3 D4');
assert(AGENCY_MULTISTATE.one === 62202, '1 state');
assert(AGENCY_MULTISTATE.two === 13289, '2 states');
assert(AGENCY_MULTISTATE.threeToFour === 6546, '3-4');
assert(AGENCY_MULTISTATE.fiveToNine === 34, '5-9');
assert(AGENCY_MULTISTATE.tenPlus === 0, '10+');
const f3 = a.featuredFindings[2];
assert(f3?.id === 'lines-of-authority', 'Story #3 id');
assert(f3?.title === 'Lines of authority matter — and they are not one national taxonomy yet', 'Story #3 unchanged title');
assert(f3?.series.map((s) => s.key).join(',') === 'texas_tdi_individual,texas_tdi,massachusetts,vermont', 'Story #3 still source-family rows');
assert(/not one national taxonomy/i.test(f3?.title || ''), 'no fake national taxonomy');

const page = readFileSync(join(root, 'components/home/insurance-home-intelligence.tsx'), 'utf8') + JSON.stringify(a);
assert(!page.includes('77887') && !page.includes('77,887'), 'obsolete 77887 absent');
assert(!page.includes('74983') && !page.includes('74,983'), 'obsolete 74983 absent');
assert(a.publicAvailability.publicPeople === 0, 'public people 0');
assert(a.publicAvailability.publicLegalInsurers === 0, 'public legal insurers 0');
assert(a.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');
assert(page.includes('href="/texas"'), 'texas intelligence route live');
assert(credentialIsAppointment() === false, 'LOA/credential ≠ appointment');
assert(appointmentIsInsurerIdentity() === false, 'appointment ≠ insurer');
assert(licenseIsEndorsement() === false, 'license ≠ endorsement');
assert(marketplaceIsLicense() === false, 'CMS ≠ license');
assert(complaintIsViolation() === false, 'complaint ≠ violation');
assert(noMatchIsClean() === false, 'no-match ≠ clean');
assert(geographyIsServiceTerritory() === false, 'geo ≠ territory');
assert(brandIsLegalInsurer() === false, 'brand ≠ legal insurer');
for (const phrase of FORBIDDEN_HOME_COPY) {
  if (phrase === 'trust score' || phrase === 'paid ranking') continue;
  assert(!page.toLowerCase().includes(phrase), `no ${phrase}`);
}

const snap = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-state-snapshot.json'), 'utf8'));
const ready = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-profile-readiness.json'), 'utf8'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint');
assert(view.fingerprint === '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93', 'florida exact');

if (errors.length) {
  console.error(`INS-HOME-004 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-HOME-004 PASS');
console.log('story3', census.storyDecision);
console.log('L1', census.L1, 'L5', census.L5);
console.log('fingerprint', a.fingerprint);
console.log('florida', view.fingerprint);
console.log('db_writes', a.db_writes);
