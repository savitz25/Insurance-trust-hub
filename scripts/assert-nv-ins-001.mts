/**
 * NV-INS-001 state sprint: Nevada Division of Insurance regulator-stated figures, company-authority instruments,
 * the current Enforcements & Orders posting, the MHPAEA company-report index, 2022-2024 complaint-data aggregates
 * and the company / agency / producer roster boundaries.
 *   npm run assert:nv-ins-001
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NEVADA_INTELLIGENCE_GATE, CANONICAL_NV_SNAPSHOT_FINGERPRINT } from '../lib/nevada-intelligence/publication';
import { assertNevadaInsurance } from '../lib/nevada-intelligence/snapshot';
import { buildNevadaInsuranceJsonLd, nvJsonLdHasForbiddenRatings } from '../lib/nevada-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));
const ok = (cond: unknown, message: string) => {
  if (!cond) throw new Error(`assert:nv-ins-001 ${message}`);
};
const sha = (obj: unknown) => {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])])) : v;
  return createHash('sha256').update(JSON.stringify(sort(obj))).digest('hex');
};

const snap = assertNevadaInsurance();
ok(snap.fingerprint === CANONICAL_NV_SNAPSHOT_FINGERPRINT, 'fingerprint gate');
ok(NEVADA_INTELLIGENCE_GATE.path === '/nevada' && NEVADA_INTELLIGENCE_GATE.robotsIndex, 'publication gate');
ok(snap.market_report_census.figures_as_of_month === '2024-10' && snap.retrieved_at.startsWith('2026-09-25'), 'report clock vs retrieval clock');
ok(snap.enforcement.list_date === null && snap.source_as_of === null, 'no invented list date or single source clock');

// Committed extracts are the ones the snapshot was built from; raw captures stay out of git.
const SRC = 'data/nevada/nv-ins-001';
for (const [name, hash] of Object.entries(snap.source_extracts)) ok(sha(json(`${SRC}/${name}`)) === hash, `${name} extract hash`);
ok(read('.gitignore').includes('/data/nevada/nv-ins-001/raw/**'), 'raw captures gitignored');
const sources = json(`${SRC}/sources.json`);
for (const [name, meta] of Object.entries(sources.captures as Record<string, { sha256: string; status: number }>)) {
  ok(/^[a-f0-9]{64}$/.test(meta.sha256), `${name} capture hash recorded`);
}
ok(sources.captures['complaints-2024.zip'].status === 200 && sources.captures['imr-2025.pdf'].status === 200, 'primary captures 200');
ok(snap.self_serve_lists.automated_access_result === 'REJECTED_BY_BOT_DEFENSE', 'self-serve access result recorded, not bypassed');
const committedFiles = readdirSync(join(root, SRC)).filter((f) => f.endsWith('.json'));
ok(committedFiles.every((f) => !/\.(zip|pdf|xlsx|html)$/.test(f)) && !existsSync(join(root, SRC, 'raw', '.keep')), 'no raw bytes committed');

// Privacy: no respondent names, no personal email / phone / street address in anything committed for Nevada.
const committed = committedFiles.map((f) => read(`${SRC}/${f}`)).join('\n') + read('lib/nevada-intelligence/accepted-snapshot.json');
ok(!/"(RESPONDENT NAME|respondent_name|respondents)"\s*:\s*\[/.test(committed), 'no respondent name list');
// NDOI's coverage type "Fire, Allied Lines & CMP" is the only comma-name shape allowed.
ok(!/[A-Z][a-z]+, [A-Z][a-z]+ [A-Z][a-z]+/.test(committed.replace(/Fire, Allied Lines & CMP/g, '')), 'no "Last, First Middle" individual names');
ok(!/[\w.+-]+@(?!doi\.nv\.gov)[\w-]+\.[\w.]+/.test(committed), 'no personal email addresses');
ok(!/\(\d{3}\) ?\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b/.test(committed), 'no phone numbers');
ok(!/\b\d{2,5} [A-Z][a-z]+ (Street|St|Avenue|Ave|Road|Rd|Blvd|Drive|Dr|Lane|Ln)\b/.test(committed), 'no street addresses');
const complaint = json(`${SRC}/complaint-data.json`);
ok(complaint.respondent_names_committed === false && complaint.respondents_include_individual_people === true, 'complaint respondent privacy');
ok(Object.values(complaint.years_acquired as Record<string, Record<string, unknown>>).every((y) => !Object.keys(y).some((k) => /name/.test(k) && !/format|strings/.test(k))), 'no name fields in complaint years');

// Identity: nothing attached, nothing written, no combined totals.
ok(snap.enforcement.orders[0].identifiers_printed.naic.length === 0 && snap.enforcement.orders[0].exact_attachment === null, 'order is standalone');
ok(snap.mhpaea_reports.rows.every((r) => !('naic' in r)), 'MHPAEA rows carry no invented NAIC');
ok(snap.profile_attachments.EXACT_PROFILE_ATTACHMENTS === 0 && snap.expansion_ledger.GRAPH_WRITES === 0, 'no graph writes');
ok(snap.capabilities.combined_nevada_insurance_total === 'UNSUPPORTED', 'no combined total');
ok(snap.market_report_census.licensees.republished_as_combined_total === false, 'report licensee total not republished');

// Publication surfaces.
const sitemap = read('app/sitemap.ts');
const ui = read('components/nevada/nv-state-page.tsx');
ok((sitemap.match(/'\/nevada'/g) || []).length === 1, 'sitemap once');
ok(!sitemap.includes("'/nevada/"), 'no nested nevada sitemap routes');
ok(read('lib/design/insurance-design-system.ts').includes("href: '/nevada'"), 'footer');
ok(normalizedPublishedStatePath('/Nevada') === '/nevada' && normalizedPublishedStatePath('/NEVADA') === '/nevada', '308 mixed case');
ok(normalizedPublishedStatePath('/nevada') === null && normalizedPublishedStatePath('/Nevada/las-vegas') === null, 'no local path normalization');
ok(!existsSync(join(root, 'app/nevada/[city]')) && readdirSync(join(root, 'app/nevada')).join(',') === 'page.tsx', 'no Nevada sub-routes');
for (const heading of ['Legal companies', 'Producers', 'Agencies', 'Company authority', 'Enforcement', 'Complaints', 'SERFF filings', 'Limitations']) {
  ok(ui.includes(`>${heading}</h2>`), `section ${heading}`);
}
const uiText = ui.replace(/\s+/g, ' ').replace(/not a ranking, recommendation or Trust Score/g, '');
ok(!/trust ?score|star rating|best insurer|safest|recommended agency|top[- ]rated/i.test(uiText), 'no ranking copy');
const ld = buildNevadaInsuranceJsonLd(snap);
ok(!nvJsonLdHasForbiddenRatings(ld), 'no rating schema');

// Search matrix: exact identifiers first, NDOI lenses only, city is geography.
const ask = (q: string) => interpretInsuranceAskQuery(q).query;
const expect = (q: string, coverage: string | undefined, mode = 'fail_closed') => {
  const r = ask(q);
  ok(r.mode === mode, `${q}: mode ${r.mode}`);
  if (coverage !== undefined) ok(r.coverageState === coverage, `${q}: coverage ${r.coverageState}`);
  return r;
};
for (const q of ['insurance companies Nevada', 'licensed insurer Nevada', 'Nevada insurance company']) {
  const r = expect(q, 'PARTIAL');
  ok(/1,652 licensed domestic and foreign insurers/.test(r.failReason ?? '') && /No downloadable NDOI company list/.test(r.failReason ?? ''), `${q}: NDOI-stated, no list`);
}
ok(ask('NAIC 10064 Nevada').mode === 'identifier', 'NAIC outranks Nevada');
ok(interpretInsuranceAskQuery('NAIC 10064 Nevada').interpretation.some((i) => i.label === 'Nevada NDOI'), 'NAIC Nevada context note');
ok(ask('NPN 10391484 Nevada').mode === 'identifier', 'NPN outranks Nevada');
ok(/16,810 agency licensees/.test(expect('insurance agency Nevada', 'NOT_ACQUIRED').failReason ?? ''), 'agency');
for (const q of ['insurance agent Nevada', 'producer Nevada']) ok(expect(q, 'NOT_ACQUIRED').entityClass === 'person', `${q}: person grain`);
expect('HMO Nevada', 'NOT_ACQUIRED');
expect('title insurer Nevada', 'NOT_ACQUIRED');
ok(/Certificate of Registration/.test(expect('risk retention group Nevada', 'NOT_ACQUIRED').failReason ?? ''), 'RRG instrument');
ok(/147 captive insurers/.test(expect('captive insurer Nevada', 'PARTIAL').failReason ?? ''), 'captive');
expect('workers compensation insurer Nevada', 'NOT_ACQUIRED');
for (const q of ['Nevada insurance enforcement', 'insurance order Nevada']) ok(/Cause No\. 26\.0028/.test(expect(q, 'PARTIAL').failReason ?? ''), `${q}: current order`);
ok(expect('producer discipline Nevada', 'PARTIAL').entityClass === 'person', 'producer discipline is person grain');
ok(/6,019 complaint-reason rows/.test(expect('insurance complaint Nevada', 'PARTIAL').failReason ?? ''), 'complaint aggregates');
for (const q of ['insurance agent Las Vegas', 'insurance company Reno', 'insurance agencies in Las Vegas NV', 'insurance agent Henderson Nevada']) {
  const r = expect(q, 'UNSUPPORTED');
  ok(r.jurisdiction?.meaning === 'recorded_address_state', `${q}: city is geography`);
}
ok(ask('insurance agency Henderson Kentucky').jurisdiction?.state === 'KY', 'shared city outside Nevada is not Nevada');
expect('best insurance agent Nevada', 'UNSUPPORTED');
expect('Nevada SERFF rate filings', 'KNOWN');
ok(ask('insurance companies Tennessee').failReason?.includes('TDCI') === true, 'Tennessee routing unaffected');

console.log(`assert:nv-ins-001 pass ${snap.fingerprint.slice(0, 12)}`);
