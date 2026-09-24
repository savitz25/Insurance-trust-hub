/**
 * MA-INS-001 state sprint: Massachusetts DOI company lists, designation lists, administrative actions.
 *   npm run assert:ma-ins-001
 * (Distinct from check:ma-ins-001, the earlier MA-INS-001 agency-credential ingest check.)
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASSACHUSETTS_INTELLIGENCE_GATE, CANONICAL_MA_SNAPSHOT_FINGERPRINT } from '../lib/massachusetts-intelligence/publication';
import { assertMassachusettsInsurance } from '../lib/massachusetts-intelligence/snapshot';
import { buildMassachusettsInsuranceJsonLd, maJsonLdHasForbiddenRatings } from '../lib/massachusetts-intelligence/jsonld';
import {
  lookupMassachusettsLicenseActions,
  lookupMassachusettsNaic,
  searchMassachusettsCompanyName,
} from '../lib/massachusetts-intelligence/lookup';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const ok = (cond: unknown, message: string) => {
  if (!cond) throw new Error(`assert:ma-ins-001 ${message}`);
};

const snap = assertMassachusettsInsurance();
ok(snap.fingerprint === CANONICAL_MA_SNAPSHOT_FINGERPRINT, 'fingerprint gate');
ok(MASSACHUSETTS_INTELLIGENCE_GATE.path === '/massachusetts' && MASSACHUSETTS_INTELLIGENCE_GATE.robotsIndex, 'publication gate');

// Official bytes are what the snapshot says they are.
const acquisition = JSON.parse(read('data/massachusetts/ma-ins-001/company-files-acquisition.json'));
for (const meta of Object.values(acquisition.files) as Array<{ file: string; sha256: string }>) {
  const bytes = readFileSync(join(root, 'data/massachusetts/ma-ins-001', meta.file));
  ok(createHash('sha256').update(bytes).digest('hex') === meta.sha256, `${meta.file} sha256`);
}
ok(snap.licensed_or_approved.sha256 === acquisition.files.licensed_or_approved.sha256, 'broad list provenance');
ok(snap.source_as_of === '2026-09-01' && snap.retrieved_at.startsWith('2026-09-24'), 'source clock vs retrieval clock');

// Identity: NAIC-keyed, no duplicate insurers, designations are relationships.
const companies = JSON.parse(read('lib/massachusetts-intelligence/accepted-companies.json'));
ok(companies.identities.length === snap.licensed_or_approved.distinct_naic, 'one identity per NAIC');
ok(new Set(companies.identities.map((r: { naic: string }) => r.naic)).size === companies.identities.length, 'no duplicate NAIC identities');
ok(companies.no_naic_rows.length === snap.licensed_or_approved.rows_missing_naic, 'rows without NAIC stay source rows');
ok(companies.identities.filter((r: { types: string[] }) => r.types.length === 2).length === 23, 'two company types stay on one identity');
ok(lookupMassachusettsNaic('36404')?.designations.includes('6G'), 'NAIC 36404 carries 6G');
ok(lookupMassachusettsNaic('99999') === null, 'unknown NAIC');
ok(searchMassachusettsCompanyName('Massachusetts insurance companies').hits.length === 0, 'category words are not a name');
ok(searchMassachusettsCompanyName('Massachusetts insurer Arbella').hits.every((r) => /arbella/i.test(r.name)), 'name lookup stays inside the DOI list');

// Enforcement: standalone, no names republished, allegation semantics.
const actions = JSON.parse(read('lib/massachusetts-intelligence/accepted-actions.json')).rows as Array<Record<string, unknown>>;
ok(actions.length === 319, 'action rows');
ok(actions.every((row) => !('licensee_name' in row) && !('name' in row)), 'licensee names are not republished');
ok(lookupMassachusettsLicenseActions('18716726').length === 1, 'license 18716726');
ok(lookupMassachusettsLicenseActions('3244649').length === 0, 'unknown license');

// Publication surfaces.
const sitemap = read('app/sitemap.ts');
const ui = read('components/massachusetts/ma-state-page.tsx');
ok((sitemap.match(/'\/massachusetts'/g) || []).length === 1, 'sitemap once');
ok(!sitemap.includes("'/massachusetts/"), 'no nested massachusetts sitemap routes');
ok(read('lib/design/insurance-design-system.ts').includes("href: '/massachusetts'"), 'footer');
ok(read('lib/seo/published-state-path.ts').includes("'massachusetts'"), 'published-state registry');
ok(read('lib/insurance-ask/recovery.ts').includes('MA: "/massachusetts"'), 'recovery route');
ok(read('package.json').includes('assert:ma-ins-001'), 'package script');
ok(!existsSync(join(root, 'app/massachusetts/boston')) && !existsSync(join(root, 'app/massachusetts/[city]')), 'no local routes');
ok(!/all Massachusetts (agents|agencies|companies|insurers)/i.test(ui), 'completeness claim');
ok(/not a ranking, recommendation, or Trust Score/i.test(ui), 'trust score guard');
ok(/never added together/i.test(ui), 'designations are not summed');
ok(/not a finding/i.test(ui), 'allegation is not a finding');
ok(!/licensee_name|Licensee Name\b.*\{/.test(ui), 'page renders no licensee names');
ok(!maJsonLdHasForbiddenRatings(buildMassachusettsInsuranceJsonLd(snap)), 'jsonld ratings');
ok(normalizedPublishedStatePath('/Massachusetts') === '/massachusetts', '308 helper');
ok(normalizedPublishedStatePath('/MASSACHUSETTS') === '/massachusetts', '308 caps');
ok(normalizedPublishedStatePath('/massachusetts') === null, 'canonical no redirect');
ok(normalizedPublishedStatePath('/Massachusetts/boston') === null, 'no local normalize');
for (const prior of ['ohio', 'georgia', 'north-carolina', 'pennsylvania']) ok(existsSync(join(root, `app/${prior}/page.tsx`)), `${prior} route`);

// Search.
const q = (text: string) => interpretInsuranceAskQuery(text).query;
const companiesQ = q('insurance companies Massachusetts');
ok(companiesQ.mode === 'fail_closed' && companiesQ.entityClass === 'insurer', 'companies answer at insurer grain');
ok(/1,693 distinct NAIC/.test(companiesQ.failReason ?? '') && !/agenc(y|ies):/i.test(companiesQ.failReason ?? ''), 'company answer is NAIC grain');
ok(/2,716 rows/.test(q('licensed insurance companies Massachusetts').failReason ?? ''), 'licensed companies');
const auto = q('auto insurance companies Massachusetts');
ok(/587 companies/.test(auto.failReason ?? '') && /never added together/.test(auto.failReason ?? ''), 'auto 6G');
ok(/486 companies/.test(q('workers compensation insurers Massachusetts').failReason ?? ''), 'workers comp 6E');
ok(/566 companies/.test(q('health insurers Massachusetts').failReason ?? ''), 'health 6B');
ok(/not admitted status/.test(q('surplus lines insurers Massachusetts').failReason ?? ''), 'surplus lines');
ok(/NAIC 10017/.test(q('Massachusetts insurer Arbella').failReason ?? ''), 'insurer name lookup');
const naic = interpretInsuranceAskQuery('NAIC 36404 Massachusetts');
ok(naic.query.mode === 'identifier' && naic.query.identifier?.value === '36404', 'NAIC identifier outranks state routing');
ok(naic.interpretation.some((line) => line.label === 'Massachusetts DOI list' && /Auto Liability/.test(line.value)), 'NAIC Massachusetts context');
ok(q('NPN 10391484 Massachusetts').mode === 'identifier', 'NPN identifier outranks state routing');
ok(q('NAIC 10064').mode === 'identifier', 'national NAIC unchanged');
const agency = interpretInsuranceAskQuery('insurance agency Massachusetts');
ok(agency.query.mode === 'entity' && agency.query.coverageState === 'PARTIAL', 'agency search stays executable but partial');
ok(agency.interpretation.some((line) => /not a complete Massachusetts agency roster/.test(line.value)), 'agency partial note');
const producer = q('insurance producer Massachusetts');
ok(producer.mode === 'fail_closed' && producer.coverageState === 'NOT_ACQUIRED' && producer.entityClass === 'person', 'producer roster');
ok(/SBS/.test(q('agent license Massachusetts').failReason ?? ''), 'agent license verification');
for (const text of ['Massachusetts insurance enforcement', 'DOI administrative actions Massachusetts', 'insurance license discipline Massachusetts', 'cease and desist insurance Massachusetts']) {
  const r = q(text);
  ok(r.mode === 'fail_closed' && r.coverageState === 'PARTIAL' && /319 rows/.test(r.failReason ?? ''), `enforcement: ${text}`);
  ok(/not a finding/.test(r.failReason ?? '') && /public record request/.test(r.failReason ?? ''), `enforcement semantics: ${text}`);
}
const license = q('Massachusetts license 18716726');
ok(license.identifier?.type === 'state_license' && /Settlement Agreement/.test(license.failReason ?? ''), 'license number lookup');
ok(!/Tran|Trucly/.test(license.failReason ?? ''), 'license lookup republishes no name');
for (const [text, city] of [['insurance company Boston', 'Boston'], ['insurance agency Worcester', 'Worcester'], ['insurance agency Springfield MA', 'Springfield']]) {
  const r = q(text);
  ok(r.coverageState === 'UNSUPPORTED' && (r.failReason ?? '').includes(city), `local: ${text}`);
}
const springfield = interpretInsuranceAskQuery('insurance producer Springfield');
ok(!springfield.query.requestedCity && /more than one state/i.test(JSON.stringify(springfield.interpretation)), 'bare Springfield stays ambiguous');
ok(q('insurance producer Springfield IL').jurisdiction?.state === 'IL', 'Springfield IL untouched');
const complaints = q('Massachusetts insurance complaints');
ok(complaints.coverageState === 'REQUEST_ONLY' && /not a count for any company/.test(complaints.failReason ?? ''), '2,000 is not a denominator');
ok(q('best insurance company Massachusetts').coverageState === 'UNSUPPORTED', 'no ranking');
ok(/never added into one Massachusetts insurance total/.test(q('insurance agencies and insurance companies Massachusetts').failReason ?? ''), 'no combined total');
ok(q('Medicare Advantage MA-PD plans').failReason === undefined || !/Massachusetts/.test(q('Medicare Advantage MA-PD plans').failReason ?? ''), 'MA-PD is not Massachusetts');

console.log('assert:ma-ins-001 pass', snap.fingerprint.slice(0, 12));
