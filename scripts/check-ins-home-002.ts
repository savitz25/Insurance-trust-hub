/**
 * INS-HOME-002 — national homepage refinement gates.
 * Payload fingerprint stays locked. Copy/a11y/overflow only.
 *   npm run check:ins-home-002
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
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../lib/national/publication';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '7474172a3996c574e26058be24b6af5149765f801660ddedba9d5508ef332fc1';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';

const a = buildInsuranceHomeIntelV1('2026-08-29T05:48:24.729Z');
const b = buildInsuranceHomeIntelV1('2026-08-30T00:00:00.000Z');

assert(a.version === INS_HOME_INTEL_VERSION, 'insurance-home-intel-v1');
assert(a.version === 'insurance-home-intel-v1', 'contract id literal');
assert(a.db_writes === 0, 'db_writes = 0');
assert(a.fingerprint === b.fingerprint, 'deterministic fingerprint');
assert(a.fingerprint === fingerprintHomeIntel(a), 'fingerprint recomputes');
assert(a.fingerprint === HOME_FP, 'payload fingerprint locked');
assert(a.population.agencies.value === 82071, '82,071 agency denominator');
assert(AGENCY_MULTISTATE.d1 === 82071 && AGENCY_MULTISTATE.d2 === 82071, 'D1/D2 locked');
assert(AGENCY_MULTISTATE.d3 === 109927 && AGENCY_MULTISTATE.d4 === 117354, 'D3/D4 locked');
assert(AGENCY_MULTISTATE.one === 62202, 'bucket 1 = 62,202');
assert(AGENCY_MULTISTATE.two === 13289, 'bucket 2 = 13,289');
assert(AGENCY_MULTISTATE.threeToFour === 6546, 'bucket 3–4 = 6,546');
assert(AGENCY_MULTISTATE.fiveToNine === 34, 'bucket 5–9 = 34');
assert(AGENCY_MULTISTATE.tenPlus === 0, 'bucket 10+ = 0');
assert(
  AGENCY_MULTISTATE.one +
    AGENCY_MULTISTATE.two +
    AGENCY_MULTISTATE.threeToFour +
    AGENCY_MULTISTATE.fiveToNine +
    AGENCY_MULTISTATE.tenPlus ===
    AGENCY_MULTISTATE.d2,
  'locked buckets sum to D2',
);
assert(a.population.legalInsurers.value === 6185, '6,185 legal insurers');
assert(a.publicAvailability.publicPeople === 0, 'public people remain 0');
assert(a.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');
assert(a.publicAvailability.publicLegalInsurers === 0, 'public legal insurers 0');
assert(a.publicAvailability.publicDirectoryProviders === 170499, 'directory listings 170,499');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'person profiles gated');
assert(a.featuredFindings.length === 3, 'exactly 3 stories');
assert(a.featuredFindings[0]?.id === 'network', 'story 1 id');
assert(a.featuredFindings[1]?.id === 'multi-state-licensing', 'story 2 id');
assert(a.featuredFindings[2]?.id === 'lines-of-authority', 'story 3 id');
assert(a.featuredFindings[0]?.title === 'Insurance is a network, not one company list', 'story 1 title');
assert(a.featuredFindings[1]?.title === 'Some agencies hold credentials across multiple states', 'story 2 title');
assert(
  a.featuredFindings[2]?.title === 'Lines of authority matter — and they are not one national taxonomy yet',
  'story 3 title',
);

const f2 = a.featuredFindings[1];
assert(f2?.series.map((row) => row.value).join(',') === '62202,13289,6546,34,0', 'locked multi-state series');
assert(f2?.series.every((row) => row.shareOf === 82071), 'story 2 shareOf is D2');

assert(credentialIsAppointment() === false, 'credential ≠ appointment');
assert(appointmentIsInsurerIdentity() === false, 'appointment ≠ insurer identity');
assert(licenseIsEndorsement() === false, 'license ≠ endorsement');
assert(marketplaceIsLicense() === false, 'Marketplace ≠ license');
assert(complaintIsViolation() === false, 'complaint ≠ violation');
assert(noMatchIsClean() === false, 'no-match ≠ clean');
assert(geographyIsServiceTerritory() === false, 'geography ≠ service territory');
assert(brandIsLegalInsurer() === false, 'brand ≠ legal insurer');

const page = src('components/home/insurance-home-intelligence.tsx');
const zip = src('components/zip-search.tsx');
const pwa = src('components/pwa/insurance-pwa-provider.tsx');
const ui = page + zip;

assert(/countHeaderForFinding|LOA observation rows/.test(page), 'per-finding table count header');
assert(/finding\.id === ['"]network['"]/.test(page) || /id === ['"]network['"]/.test(page), 'network column is Entities');
assert(page.includes('LOA observation rows'), 'story 3 table is LOA observation rows, not Agencies');
assert(/Browse public directory listings/.test(page), 'directory CTA is listings, not all licensed agencies');
assert(!/Agency directory lookup/i.test(page), 'old ZIP heading removed');
assert(!/Research licensed agencies/i.test(page), 'old licensed-agencies CTA removed');
assert(/public directory listings/i.test(page), 'ZIP panel says directory listings');
assert(/not a search of all graph agencies/i.test(ui), 'ZIP does not claim all graph agencies');
assert(/directory listings/i.test(zip), 'zip-search copy is listings');
assert(/Search listings/.test(zip), 'submit label Search listings');
assert(/aria-label="Search public insurance directory listings by ZIP code"/.test(zip), 'ZIP form labeled');
assert(/aria-label="ZIP code for public directory listings"/.test(zip), 'ZIP input labeled');
assert(/role="alert"/.test(zip), 'ZIP validation alert');
assert(/directoryListings\.value|publicDirectoryProviders/.test(page), 'directory listing count distinguished from graph agencies');
assert(/appointing-entity records/.test(page) && /licensed_insurance_companies/.test(page), 'legal insurer ≠ entity_kind=carrier');
assert(/appointing_carrier_entities|appointingCarriers/.test(page), 'carrier-kind count shown as distinct grain');
assert(/Public people pages remain 0|public people pages remain 0/i.test(page), 'people not a public directory');
assert(/The legal insurer that underwrites/.test(page), 'Carrier glossary');
assert(/licensed business that may sell/.test(page), 'Agency glossary');
assert(/licensed individual/i.test(page), 'Producer glossary');
assert(page.includes('insurance_intel_trace_number'), 'Trace this number');
assert(page.includes('insurance_intel_explain_chart'), 'Explain this chart');
assert(page.includes('sourceAsOf') && page.includes('generatedAt'), 'trace retrieval clock');
assert(!/national Life\/Health\/Property/i.test(ui), 'no person LOA national product chart');
assert(!/person LOA (pie|product-line chart)/i.test(ui), 'person LOA product chart absent');
assert(!/NATIONAL PERSON PRODUCT-LINE CHART/.test(ui), 'person product-line chart not present');
assert(
  /not collapsed into a fake national Property/.test(a.featuredFindings[2]?.summary || ''),
  'story 3 still forbids a fake national pie',
);
assert(!/Life, Health, and Property producer/i.test(page), 'no producer product-line chart UI');
assert(a.featuredFindings.every((f) => f.id !== 'person-loa-product'), 'no person LOA finding');
assert(!page.toLowerCase().includes('ranking of'), 'no ranking language');
assert(!/\bbest (agency|agent|insurer)\b/i.test(ui), 'no best-of ranking');
assert(!/\btop (agency|agent)s?\b/i.test(ui), 'no top-agent ranking');
for (const phrase of FORBIDDEN_HOME_COPY) {
  const hit = ui.toLowerCase().includes(phrase);
  if (!hit) continue;
  if (phrase === 'trust score' || phrase === 'paid ranking') continue;
  assert(false, `forbidden copy: ${phrase}`);
}
assert(/no paid rankings/i.test(src('app/page.tsx')), 'SEO no-paid-rankings');
assert(src('app/page.tsx').includes("path: '/'"), 'homepage metadata path');
assert(page.includes('href="/texas"'), 'texas intelligence route live');
assert(page.includes('href="/washington"'), 'washington intelligence route live');
assert(pwa.includes('box-border') && pwa.includes('max-w-full') && pwa.includes('min-w-0'), 'PWA banner cannot overflow 390');
assert(pwa.includes('shrink-0'), 'PWA close control shrink-0');
assert(/overflow-x:\s*clip/.test(src('app/globals.css')), 'root overflow clip safety');

const codebook = JSON.parse(src('data/codebooks/ins-nat-012-person-loa-v1.json')) as {
  nationalPublicChart: boolean;
};
assert(codebook.nationalPublicChart === false, 'person LOA national public chart prohibited');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint constant');
assert(view.fingerprint === FL_FP, 'Florida fingerprint unchanged');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-HOME-002'), 'florida contract not edited');
assert(!src('app/florida/page.tsx').includes('INS-HOME-002'), 'florida page not edited for this task');

if (errors.length) {
  console.error(`INS-HOME-002 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-HOME-002 PASS');
console.log('contract', a.version);
console.log('fingerprint', a.fingerprint);
console.log('agencies', a.population.agencies.value);
console.log('legal_insurers', a.population.legalInsurers.value);
console.log('public_people', a.publicAvailability.publicPeople);
console.log('buckets', `${AGENCY_MULTISTATE.one}/${AGENCY_MULTISTATE.two}/${AGENCY_MULTISTATE.threeToFour}/${AGENCY_MULTISTATE.fiveToNine}/${AGENCY_MULTISTATE.tenPlus}`);
console.log('florida_fingerprint', view.fingerprint);
console.log('db_writes', a.db_writes);
console.log('NATIONAL PERSON PRODUCT-LINE CHART: NOT PRESENT');
