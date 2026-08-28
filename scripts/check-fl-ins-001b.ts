/**
 * FL-INS-001B appointed_by reconciliation tests.
 *   npm run check:fl-ins-001b
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { decideAgencyAppointmentJoin } from '../lib/national/fl-agency-appointments';
import { AGENCY_CARRIER_APPOINTMENT_TYPE } from '../lib/national/fl-individual-appointments';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
const src = readFileSync(join(root, 'scripts/national/run-fl-ins-001b.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const doc = readFileSync(join(root, 'docs/florida/FL-INS-001B-appointed-by-reconciliation.md'), 'utf8');

function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}

assert(existsSync(join(reports, 'fl-ins-001b-appointed-by-census.json')), 'census');
assert(existsSync(join(reports, 'fl-ins-001b-difference-classification.json')), 'diff');
assert(existsSync(join(reports, 'fl-ins-001b-deterministic-set.json')), 'det');
assert(existsSync(join(reports, 'fl-ins-001b-grain.json')), 'grain');
assert(existsSync(join(reports, 'fl-ins-001b-publication-regression.json')), 'pub');
assert(existsSync(join(reports, 'fl-ins-001b-verdict.json')), 'verdict');
assert(existsSync(join(root, 'docs/florida/FL-INS-001B-appointed-by-reconciliation.md')), 'doc');

const census = load('fl-ins-001b-appointed-by-census.json');
const det = load('fl-ins-001b-deterministic-set.json');
const pub = load('fl-ins-001b-publication-regression.json');
const verdict = load('fl-ins-001b-verdict.json');
const grain = load('fl-ins-001b-grain.json');
const cls = (census.classification || {}) as Record<string, unknown>;

assert(census.live === 2680, 'live 2680');
assert(census.florida_dfs_appointments === 2680, 'florida dataset 2680');
assert(census.fl_appointer_targets === 2680, 'fl targets 2680');
assert(census.non_florida === 0, 'non-florida 0');
assert(verdict.status === 'COMPLETE — FLORIDA AGENCY APPOINTMENT COUNT RECONCILED', 'status');
assert(verdict.semanticSafety === 'PASS', 'semantic');
assert(verdict.startedNext === false, 'did not start 002');

assert(cls.LEGITIMATE_PREEXISTING === 987, 'preexisting 987');
assert(cls.LEGITIMATE_OTHER_SOURCE === 0, 'other source 0');
assert(cls.LEGITIMATE_OTHER_JURISDICTION === 0, 'other jurisdiction 0');
assert(cls.FL_CONFIRMED_BUT_OMITTED_FROM_PRIOR_BASELINE === 1691, '1691 omitted from 989');
assert(cls.DUPLICATE === 0, 'dup 0');
assert(cls.STALE_EXTRA === 2, 'stale 2');
assert(cls.WRONG_TARGET === 0, 'wrong 0');
assert(cls.UNKNOWN === 0, 'unknown 0');
assert(987 + 1691 + 2 === 2680, 'class sum');

assert(det.expectedConfirmed === 2678, 'expected 2678');
assert(det.PRODUCTION_CORRECT === 2678, 'correct 2678');
assert(det.MISSING === 0, 'missing 0');
assert(det.STALE_EXTRA === 2, 'det stale 2');
assert(det.STALE_EXTRA_RETAINED === 2, 'retained');
assert(det.WRONG_TARGET === 0, 'det wrong 0');
assert(det.DUPLICATE === 0, 'det dup 0');
assert(det.zeroDelta === true, 'zero delta');
assert(Array.isArray(det.staleExtraIds) && (det.staleExtraIds as unknown[]).length === 2, 'stale ids');

assert(grain.pairsWithMultipleRows === 81, '81 multi pairs');
assert(grain.keepMultiRowPairs === true, 'keep multi');
assert(grain.distinctAgencyAppointerPairs === 2117, '2117 pairs');

const changes = census.dataChanges as Record<string, number>;
assert(changes.inserted === 0 && changes.updated === 0 && changes.deleted === 0, 'no 001B writes');

assert(!/\.from\([^)]+\)\.(insert|update|upsert|delete)/i.test(src), 'runner read-only');
assert(!/oir/i.test(src) || /Do not mint OIR|does not mint OIR/i.test(src), 'no OIR start');
assert(src.includes('APPOINTER_RESOLVES_TO') === false || /not started/i.test(src), 'no resolves-to write');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people off');
assert(mayPublishEntityKind('person') === false, 'person gate');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal gate');
assert((sitemap.match(/['"`]\/florida['"`]/g) || []).length <= 1, '007 /florida only');
assert(AGENCY_CARRIER_APPOINTMENT_TYPE === 'appointed_by', 'agency type');
assert(
  decideAgencyAppointmentJoin({ npn: '1234567', agencyIdsForNpn: ['a'] }).confidence === 'CONFIRMED',
  'exact npn'
);
assert(
  decideAgencyAppointmentJoin({ npn: 'ACME', agencyIdsForNpn: [] }).action === 'hold',
  'no name match'
);
assert(pub.pass === true, 'publication pass');
const livePub = pub.live as Record<string, unknown>;
assert(livePub.providers === 170499, 'providers');
assert(livePub.agencies === 82071, 'agencies');
assert(livePub.persons === 1029860, 'persons');
assert(livePub.bridges === 37515, 'bridges');
assert(/KEEP 2,680/.test(doc), 'keep decision');
assert(/FL-INS-002/.test(doc) && /Not started/.test(doc), '002 not started');
assert(/31c6fbf8-3b84-4eb6-9baa-c750fc77c473/.test(doc), 'stale id 1');
assert(/ea5441f1-97a6-4137-a2bd-74e0ae37e656/.test(doc), 'stale id 2');

if (errors.length) {
  console.error('FL-INS-001B FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-001B PASS appointed_by reconciled publication-safe');
