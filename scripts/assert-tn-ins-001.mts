/**
 * TN-INS-001 state sprint: Tennessee TDCI licensed companies, activity events, company actions,
 * examinations, and the producer / agency / complaint capability boundaries.
 *   npm run assert:tn-ins-001
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TENNESSEE_INTELLIGENCE_GATE, CANONICAL_TN_SNAPSHOT_FINGERPRINT } from '../lib/tennessee-intelligence/publication';
import { assertTennesseeInsurance } from '../lib/tennessee-intelligence/snapshot';
import { buildTennesseeInsuranceJsonLd, tnJsonLdHasForbiddenRatings } from '../lib/tennessee-intelligence/jsonld';
import { lookupTennesseeNaic, searchTennesseeCompanyName, tennesseeEventsForNaic } from '../lib/tennessee-intelligence/lookup';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));
const ok = (cond: unknown, message: string) => {
  if (!cond) throw new Error(`assert:tn-ins-001 ${message}`);
};
const sha = (obj: unknown) => {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])])) : v;
  return createHash('sha256').update(JSON.stringify(sort(obj))).digest('hex');
};

const snap = assertTennesseeInsurance();
ok(snap.fingerprint === CANONICAL_TN_SNAPSHOT_FINGERPRINT, 'fingerprint gate');
ok(TENNESSEE_INTELLIGENCE_GATE.path === '/tennessee' && TENNESSEE_INTELLIGENCE_GATE.robotsIndex, 'publication gate');
ok(snap.source_as_of === '2026-08-31' && snap.retrieved_at.startsWith('2026-09-25'), 'source clock vs retrieval clock');
ok(snap.company_actions.list_date === null && !('source_as_of' in snap.company_actions), 'actions archive keeps no invented list date');

// Committed extracts are the ones the snapshot was built from; raw captures stay out of git.
const SRC = 'data/tennessee/tn-ins-001';
for (const [name, hash] of Object.entries(snap.source_extracts)) ok(sha(json(`${SRC}/${name}`)) === hash, `${name} extract hash`);
ok(read('.gitignore').includes('/data/tennessee/tn-ins-001/raw/**'), 'raw captures gitignored');
const sources = json(`${SRC}/sources.json`);
ok(/^[a-f0-9]{64}$/.test(sources.licensed_companies.data_endpoint.sha256), 'raw table hash recorded');
ok(sources.licensed_companies.list_statement === 'As of August 31, 2026.', 'list statement verbatim');

// Privacy: no street address, ZIP or phone; no counterparty captions; no action document links; no producer names.
const licensed = json(`${SRC}/licensed-companies.json`);
ok(!licensed.columns.some((c: string) => /ADDRESS|ZIP|PHONE|MAO_CITY/.test(c)), 'address / phone columns not committed');
ok(licensed.rows.every((r: string[]) => r.length === licensed.columns.length), 'licensed rows keep committed columns only');
const actions = json(`${SRC}/company-actions-index.json`);
ok(actions.lines.every((l: { documents: Array<Record<string, unknown>> }) => l.documents.every((d) => !('url' in d) && !('href' in d))), 'no action document links');
ok(actions.lines.every((l: { caption_as_listed: string | null }) => !l.caption_as_listed || !/\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+|d\/b\/a/.test(l.caption_as_listed)), 'no individual-name captions');
ok(!/content\/dam\/tn\/commerce\/documents\/insurance\/companyactions/.test(read(`${SRC}/company-actions-index.json`)), 'no action PDF paths');
const pd = json(`${SRC}/producer-discipline-census.json`);
ok(pd.names_published_here === false && Object.keys(pd).every((k) => !/name$|names$|links?$|urls?$/.test(k) || k === 'names_published_here'), 'producer discipline counts only');
ok(!/agentproduceractions\//.test(read(`${SRC}/producer-discipline-census.json`) + read(`${SRC}/sources.json`)), 'no producer document paths');
const committed = ['licensed-companies.json', 'monthly-update.json', 'company-actions-index.json', 'company-examinations-index.json', 'consumer-and-licensing-pages.json', 'sources.json']
  .map((f) => read(`${SRC}/${f}`)).join('\n') + read('lib/tennessee-intelligence/accepted-companies.json') + read('lib/tennessee-intelligence/accepted-snapshot.json');
ok(!/[\w.+-]+@(?!tn\.gov)[\w-]+\.[\w.]+/.test(committed), 'no personal email addresses');
ok(!/\b\d{10}\b/.test(read('lib/tennessee-intelligence/accepted-companies.json')), 'no phone numbers in accepted companies');

// Identity: NAIC-keyed, placeholder excluded, two-type NAIC stays one identity, no duplicate universe.
const companies = json('lib/tennessee-intelligence/accepted-companies.json');
ok(companies.identities.length === snap.licensed_companies.distinct_naic, 'one identity per NAIC');
ok(new Set(companies.identities.map((r: { naic: string }) => r.naic)).size === companies.identities.length, 'no duplicate NAIC identities');
ok(companies.placeholder_naic_rows.length === 72 && companies.placeholder_naic_rows.every((r: { naic_as_published: string }) => r.naic_as_published === '99999'), 'placeholder rows stay research rows');
ok(companies.identities.filter((r: { listings: unknown[] }) => r.listings.length === 2).length === 14, 'two company types stay on one identity');
ok(companies.identities.filter((r: { in_national_identity_index: boolean }) => r.in_national_identity_index).length === 2022, 'exact spine matches');
ok(lookupTennesseeNaic('16862')?.name === '1842 Insurance Company', 'NAIC 16862 on the TDCI list');
ok(lookupTennesseeNaic('99999') === null, 'placeholder is not an identity');
ok(lookupTennesseeNaic('00000') === null, 'unknown NAIC');
ok(tennesseeEventsForNaic('34118').some((e) => e.section === 'mergers'), 'monthly merger event by exact NAIC');
ok(searchTennesseeCompanyName('Tennessee insurance companies').hits.length === 0, 'category words are not a name');
ok(searchTennesseeCompanyName('Tennessee insurer Farm Bureau').hits.every((r) => /farm bureau/i.test(r.name)), 'name lookup stays inside the TDCI list');
const statuses = new Set(companies.identities.flatMap((r: { listings: Array<{ status: string }> }) => r.listings.map((l) => l.status)));
ok(statuses.has('Eligible') && statuses.has('Registered') && statuses.has('Suspended') && !statuses.has('ACTIVE'), 'status reasons stay source-native');
ok(snap.naic_crosswalk.licensed_companies.graph_write === false && snap.expansion_ledger.GRAPH_WRITES === 0, 'no graph writes');

// Publication surfaces.
const sitemap = read('app/sitemap.ts');
const ui = read('components/tennessee/tn-state-page.tsx');
ok((sitemap.match(/'\/tennessee'/g) || []).length === 1, 'sitemap once');
ok(!sitemap.includes("'/tennessee/"), 'no nested tennessee sitemap routes');
ok(read('lib/design/insurance-design-system.ts').includes("href: '/tennessee'"), 'footer');
ok(read('lib/seo/published-state-path.ts').includes("'tennessee'"), 'published-state registry');
ok(read('lib/insurance-ask/recovery.ts').includes('TN: "/tennessee"'), 'recovery route');
ok(read('package.json').includes('assert:tn-ins-001'), 'package script');
ok(!existsSync(join(root, 'app/tennessee/nashville')) && !existsSync(join(root, 'app/tennessee/[city]')), 'no local routes');
ok(!/all Tennessee (agents|agencies|companies|insurers)/i.test(ui), 'completeness claim');
ok(/not a ranking, recommendation, or Trust Score/i.test(ui), 'trust score guard');
ok(/never\s+added into one Tennessee insurer total/.test(ui), 'company types are not summed');
ok(/No Tennessee insurance total is\s+formed/.test(ui), 'no combined total');
ok(!/aggregateRating|ratingValue|Financial Strength/i.test(ui), 'page renders no ratings');
ok(!tnJsonLdHasForbiddenRatings(buildTennesseeInsuranceJsonLd(snap)), 'jsonld ratings');
ok(normalizedPublishedStatePath('/Tennessee') === '/tennessee', '308 helper');
ok(normalizedPublishedStatePath('/TENNESSEE') === '/tennessee', '308 caps');
ok(normalizedPublishedStatePath('/tennessee') === null, 'canonical no redirect');
ok(normalizedPublishedStatePath('/Tennessee/nashville') === null, 'no local normalize');
for (const prior of ['massachusetts', 'ohio', 'georgia', 'north-carolina', 'pennsylvania']) ok(existsSync(join(root, `app/${prior}/page.tsx`)), `${prior} route`);

// Search matrix.
const q = (text: string) => interpretInsuranceAskQuery(text).query;
for (const text of ['insurance companies Tennessee', 'licensed insurer Tennessee', 'licensed insurance companies Tennessee']) {
  const r = q(text);
  ok(r.mode === 'fail_closed' && r.entityClass === 'insurer' && r.coverageState === 'PARTIAL', `company grain: ${text}`);
  ok(/2,029 distinct NAIC/.test(r.failReason ?? '') && /placeholder NAIC 99999/.test(r.failReason ?? ''), `company answer: ${text}`);
}
const naic = interpretInsuranceAskQuery('NAIC 16862 Tennessee');
ok(naic.query.mode === 'identifier' && naic.query.identifier?.value === '16862', 'NAIC identifier outranks state routing');
ok(naic.interpretation.some((l) => l.label === 'Tennessee TDCI list' && /1842 Insurance Company/.test(l.value) && /domicile MD/.test(l.value)), 'NAIC Tennessee context');
ok(interpretInsuranceAskQuery('NAIC 34118 Tennessee').interpretation.some((l) => /not on TDCI's List/.test(l.value) && /merged into Colony/.test(l.value)), 'off-list NAIC keeps its event');
ok(q('NAIC 10064').mode === 'identifier' && !interpretInsuranceAskQuery('NAIC 10064').interpretation.some((l) => /Tennessee/.test(l.label)), 'national NAIC unchanged');
const npn = interpretInsuranceAskQuery('NPN 10391484 Tennessee');
ok(npn.query.mode === 'identifier' && npn.query.identifier?.type === 'npn', 'NPN identifier outranks state routing');
ok(npn.interpretation.some((l) => /not Tennessee license status/.test(l.value)), 'NPN Tennessee context');
const health = q('health insurer Tennessee');
ok(health.coverageState === 'PARTIAL' && /17 HEALTH MAINTENANCE ORGANIZATION rows/.test(health.failReason ?? '') && /no complete health-insurer count/.test(health.failReason ?? ''), 'health');
ok(/1,063 rows with COMPANY_TYPE "PROPERTY"/.test(q('property casualty insurer Tennessee').failReason ?? ''), 'property casualty');
ok(q('workers compensation insurer Tennessee').coverageState === 'UNSUPPORTED', 'workers comp is not readable from the list');
ok(/Eligible is not admitted/.test(q('surplus lines insurer Tennessee').failReason ?? ''), 'surplus lines');
const agent = q('insurance agent Tennessee');
ok(agent.coverageState === 'NOT_ACQUIRED' && agent.entityClass === 'person', 'producer roster');
const agency = q('insurance agency Tennessee');
ok(agency.coverageState === 'NOT_ACQUIRED' && agency.entityClass === 'agency' && /not a Tennessee agency census/.test(agency.failReason ?? ''), 'agency roster');
ok(/NAIC public license lookup/.test(q('producer license Tennessee').failReason ?? ''), 'producer license verification');
for (const text of ['Tennessee insurance enforcement', 'insurance company action Tennessee']) {
  const r = q(text);
  ok(r.coverageState === 'PARTIAL' && /234 index lines/.test(r.failReason ?? '') && /none is attached to an insurer by name/.test(r.failReason ?? ''), `actions: ${text}`);
  ok(/Not every entry is punitive/.test(r.failReason ?? ''), `action semantics: ${text}`);
}
ok(/293 examinations/.test(q('insurance examination Tennessee').failReason ?? '') && /not a score/.test(q('insurance examination Tennessee').failReason ?? ''), 'examinations');
const complaints = q('insurance complaints Tennessee');
ok(complaints.coverageState === 'NOT_ACQUIRED' && /not an enforcement finding/.test(complaints.failReason ?? '') && /not a quality score/.test(complaints.failReason ?? ''), 'complaints');
ok(q('insurance agent disciplinary actions Tennessee').entityClass === 'person', 'producer discipline stays person grain');
for (const [text, city] of [['insurance company Nashville', 'Nashville'], ['insurance agent Memphis', 'Memphis'], ['insurance agency Franklin Tennessee', 'Franklin']]) {
  const r = q(text);
  ok(r.coverageState === 'UNSUPPORTED' && (r.failReason ?? '').includes(city) && r.requestedCity === city, `local: ${text}`);
}
ok(q('insurance agency Cleveland').jurisdiction?.state !== 'TN', 'bare Cleveland is not Tennessee');
ok(q('best insurance company Tennessee').coverageState === 'UNSUPPORTED', 'no ranking');
ok(/never added into one Tennessee insurance total/.test(q('insurance agencies and insurance companies Tennessee').failReason ?? ''), 'no combined total');
ok(q('auto insurance companies Tennessee').coverageState === 'UNSUPPORTED', 'no product-qualified cohort');
ok(!/Tennessee/.test(q('licensed insurance companies Massachusetts').failReason ?? ''), 'Massachusetts unchanged');

console.log('assert:tn-ins-001 pass', snap.fingerprint.slice(0, 12));
