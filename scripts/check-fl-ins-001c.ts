/**
 * FL-INS-001C source-control / production lock tests.
 *   npm run check:fl-ins-001c
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  isConflictingPipeGrain,
  mayDeleteAppointedById,
  RETAINED_HISTORICAL_APPOINTED_BY_IDS,
  sourceDedupeKey,
  decideAgencyAppointmentJoin,
  agencyAppointmentUsesName,
  personAppointmentInheritsToAgency,
  associatedWithInheritsAppointment,
  appointmentTypeIsLoa,
} from '../lib/national/fl-agency-appointments';
import { flDfsNumberIsNaic } from '../lib/national/appointer-crosswalk';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}

assert(existsSync(join(root, 'docs/florida/FL-INS-001-final.md')), 'final doc');
assert(existsSync(join(reports, 'fl-ins-001-final.json')), 'final json');
assert(existsSync(join(reports, 'fl-ins-001c-production-precheck.json')), 'precheck');
assert(existsSync(join(reports, 'fl-ins-001c-artifact-classification.json')), 'class');
assert(existsSync(join(reports, 'fl-ins-001c-publication-regression.json')), 'pub');
assert(existsSync(join(reports, 'fl-ins-001c-verdict.json')), 'verdict');
assert(existsSync(join(reports, 'fl-ins-001-appointment-reconciliation.json')), 'recon');
assert(existsSync(join(reports, 'fl-ins-001-cleanup-before.json')), 'cleanup-before');
assert(existsSync(join(reports, 'fl-ins-001-coverage.json')), 'coverage');
assert(existsSync(join(reports, 'fl-ins-001-idempotency.json')), 'idem');
assert(existsSync(join(reports, 'fl-ins-001b-appointed-by-census.json')), '001b');

const final = load('fl-ins-001-final.json');
const pre = load('fl-ins-001c-production-precheck.json');
const verdict = load('fl-ins-001c-verdict.json');
const recon = load('fl-ins-001-appointment-reconciliation.json');
const cov = load('fl-ins-001-coverage.json');
const ts = readFileSync(join(root, 'scripts/national/run-fl-ins-001.ts'), 'utf8');
const py = readFileSync(join(root, 'scripts/national/fl-ins-001.py'), 'utf8');
const csrc = readFileSync(join(root, 'scripts/national/run-fl-ins-001c.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const apt = readFileSync(join(root, 'docs/florida/FL-INS-001-appointment-contract.md'), 'utf8');

assert(final.EXPECTED_CURRENT === 2678, 'expected 2678');
assert(final.RETAINED_HISTORICAL === 2, 'historical 2');
assert(final.PRODUCTION === 2680, 'prod 2680');
assert(final.MISSING === 0 && final.WRONG_TARGET === 0 && final.DUPLICATE === 0, 'zero delta');
assert(final.wrong_grain_live === 0, 'wrong grain 0');
assert(final.pass === true, 'final pass');
assert(pre.appointed_by_total === 2680, 'pre total');
assert(pre.florida_appointed_by === 2680, 'pre fl');
assert(pre.expected_current === 2678, 'pre current');
assert(pre.retained_historical === 2, 'pre hist');
assert(pre.wrong_grain_live === 0, 'pre grain');
assert(pre.APPOINTER_RESOLVES_TO_fl === 0, 'pre resolves 0');
assert(pre.fl_appointers === 12030, 'pre appointers');
assert(recon.EXPECTED === 2678 && recon.MISSING === 0, 'recon expected');
assert(recon.STALE_EXTRA === 2, 'recon stale 2');
assert(cov.canonical_agencies_with_ge1_fl_appointment === 1628, '1628 agencies');
assert(cov.canonical_fl_credentialed_with_appointment === 1605, '1605 cred');
assert(cov.canonical_fl_credentialed_without_appointment === 55334, '55334 without');
assert(verdict.startedNext === false, '002 not started');
assert(
  verdict.status === 'COMPLETE — FL-INS-001 SOURCE CONTROL / PRODUCTION RECONCILED',
  'status'
);

assert(isConflictingPipeGrain('A|B|C|D') === true, 'conflict');
assert(isConflictingPipeGrain('fl-dfs-biz:A|B|C') === false, 'canonical');
assert(
  mayDeleteAppointedById('31c6fbf8-3b84-4eb6-9baa-c750fc77c473') === false,
  'retain 1'
);
assert(
  mayDeleteAppointedById('ea5441f1-97a6-4137-a2bd-74e0ae37e656') === false,
  'retain 2'
);
assert(RETAINED_HISTORICAL_APPOINTED_BY_IDS.length === 2, '2 ids');
assert(
  decideAgencyAppointmentJoin({ npn: '1234567', agencyIdsForNpn: ['a'] }).confidence === 'CONFIRMED',
  'exact npn'
);
assert(agencyAppointmentUsesName() === false, 'no name');
assert(personAppointmentInheritsToAgency() === false, 'no person inherit');
assert(associatedWithInheritsAppointment() === false, 'no associated inherit');
assert(appointmentTypeIsLoa() === false, 'not loa');
assert(flDfsNumberIsNaic() === false, 'appointer != insurer');
assert(
  sourceDedupeKey({
    licenseNumber: 'L',
    appointingEntityNumber: '1',
    appointmentType: 'T',
  }).split('|').length === 3,
  '3-part grain'
);

assert(/liveWrongGrain/.test(ts) && /does not insert appointed_by/i.test(ts), 'ts cleanup idempotent');
assert(!/\.from\(\s*['"]national_relationships['"]\s*\)\.insert/i.test(ts), 'ts no rel insert');
assert(py.includes('live_wrong_grain_ids') && py.includes('cleanup no-op'), 'py live scan');
assert(!/2563/.test(py.split('live_wrong_grain_ids')[1]?.slice(0, 400) || '2563'), 'py scan not hardcoded 2563');
assert(!/\.from\([^)]+\)\.(insert|update|upsert|delete)/i.test(csrc), '001c read-only');
assert(!/oir/i.test(csrc) || /Does not start OIR/i.test(csrc), 'no oir');
assert(/2,678/.test(apt) && /2,680/.test(apt), 'contract lock');
assert(!/Inserted \*\*2,563\*\*/.test(apt), 'contract not 2563-as-final');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people off');
assert(mayPublishEntityKind('person') === false, 'person gate');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal gate');
assert((sitemap.match(/['"`]\/florida['"`]/g) || []).length <= 1, '007 /florida only');

const pub = load('fl-ins-001c-publication-regression.json');
const live = pub.live as Record<string, unknown>;
assert(live.providers === 170499, 'providers');
assert(live.agencies === 82071, 'agencies');
assert(live.persons === 1029860, 'persons');
assert(live.bridges === 37515, 'bridges');

if (errors.length) {
  console.error('FL-INS-001C FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`FL-INS-001C PASS source-control production-lock tests=${19 + 12}`);
