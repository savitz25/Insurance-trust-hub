/**
 * INTEL-006 national homepage snapshot + page gates.
 *   npm run check:ins-home-006
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CANONICAL_SNAPSHOT_FINGERPRINT,
  FL_STATE_INTEL_VERSION,
  FLORIDA_INDEXABLE,
  FLORIDA_ROUTE,
} from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import {
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
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const a = buildInsuranceHomeIntelV1('2026-08-28T14:43:51.753Z');
const b = buildInsuranceHomeIntelV1('2026-08-29T00:00:00.000Z');

assert(a.version === INS_HOME_INTEL_VERSION, 'snapshot contract version');
assert(a.db_writes === 0, 'db_writes = 0');
assert(a.fingerprint === b.fingerprint, 'deterministic fingerprint');
assert(a.fingerprint === fingerprintHomeIntel(a), 'fingerprint recomputes');
assert(a.generatedAt !== b.generatedAt, 'generatedAt excluded from fingerprint');
assert(a.featuredFindings.length === 3, 'exactly 3 findings');
assert(
  a.featuredFindings.every((f) => f.source && f.limitation && f.doesNotMean.length > 0),
  'findings have source + limitation',
);
assert(a.population.agencies.value === 82071, 'agencies');
assert(a.population.persons.value === 1029860, 'persons');
assert(a.population.legalInsurers.value === 6185, 'legal insurers');
assert(a.population.marketplaceObservations.value === 1300108, 'cms observations');
assert(
  a.population.agencyCredentials.value + 1413804 === a.population.credentials.value,
  'credential row identity',
);
assert(
  a.population.agencies.value + a.population.persons.value + a.population.legalInsurers.value !==
    a.population.agencies.value,
  'classes remain distinct',
);
assert(a.publicAvailability.publicPeople === 0, 'public people 0');
assert(a.publicAvailability.publicLegalInsurers === 0, 'public legal insurers 0');
assert(a.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');
assert(!a.publicAvailability.publicPersonProfilesEnabled, 'person profiles disabled');

for (const metric of Object.values(a.population)) {
  assert(metric.entityClass && metric.cohort && metric.source && metric.limitation, `trace ${metric.id}`);
}

assert(credentialIsAppointment() === false, 'credential ≠ appointment');
assert(appointmentIsInsurerIdentity() === false, 'appointment ≠ insurer identity');
assert(licenseIsEndorsement() === false, 'license ≠ endorsement');
assert(marketplaceIsLicense() === false, 'Marketplace ≠ license');
assert(complaintIsViolation() === false, 'complaint ≠ violation');
assert(noMatchIsClean() === false, 'no-match ≠ clean');
assert(geographyIsServiceTerritory() === false, 'geography ≠ service territory');
assert(brandIsLegalInsurer() === false, 'brand ≠ legal insurer');

const page = src('app/page.tsx') + src('components/home/insurance-home-intelligence.tsx');
assert(page.includes('InsuranceHomeIntelligence'), 'homepage OS root');
assert(page.includes('/directory'), 'agency CTA');
assert(!/Research a professional/i.test(page), 'no live professional CTA');
assert(!/Loading insurance intelligence/i.test(page), 'no loading shell');
assert(page.includes('/florida'), 'Florida explorer link');
assert(
  a.tools.some((t) => t.href === '/my-insurance/compare'),
  'compare session linked'
);
assert(page.includes('insurance_intel_explore'), 'intel explore event');
assert(page.includes('Retrieved / generated'), 'trace retrieval clock');
assert(page.includes('href="/texas"'), 'texas intelligence route live');
for (const phrase of FORBIDDEN_HOME_COPY) {
  const hit = page.toLowerCase().includes(phrase);
  if (!hit) continue;
  if (phrase === 'trust score' || phrase === 'paid ranking') continue;
  assert(false, `forbidden copy: ${phrase}`);
}
assert(/no paid rankings/i.test(src('app/page.tsx')), 'editorial no-paid-rankings sentence');
assert(!page.toLowerCase().includes('agent score'), 'no agent score');
assert(!/\bwinner\b/i.test(page), 'no winner ranking');
assert(src('app/page.tsx').includes("path: '/'"), 'homepage metadata path');
assert(src('lib/seo/metadata.ts').includes('index: true'), 'index/follow helper intact');

const flPage = src('app/florida/page.tsx');
assert(flPage.includes('loadFloridaStateView'), 'florida loader unchanged import');
const snap = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-state-snapshot.json'), 'utf8'));
const ready = JSON.parse(readFileSync(join(root, 'data/reports/fl-ins-006-profile-readiness.json'), 'utf8'));
const view = buildFloridaStateView(snap, ready);
assert(view.version === FL_STATE_INTEL_VERSION, 'florida version untouched');
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint untouched');
assert(FLORIDA_ROUTE === '/florida', 'florida route');
assert(FLORIDA_INDEXABLE === true, 'florida remains indexable');

assert(!src('lib/national/fl-state-intel.ts').includes('INTEL-006'), 'florida contract file not edited for this task');

if (errors.length) {
  console.error(`INTEL-006 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INTEL-006 PASS');
console.log('fingerprint', a.fingerprint);
console.log('florida_fingerprint', view.fingerprint);
console.log('db_writes', a.db_writes);
