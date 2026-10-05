import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/alabama-intelligence/al-ins-001.json'));
const page = read('app/alabama/page.tsx');
const sitemap = read('app/sitemap.ts');

const sum = (rows: { total: number }[]) => rows.reduce((total, row) => total + row.total, 0);
const column = (key: 'domestic' | 'foreign' | 'alien' | 'other' | 'total') =>
  snapshot.companyOverview.rows.reduce((total: number, row: Record<string, number>) => total + row[key], 0);

for (const row of snapshot.companyOverview.rows) {
  assert.equal(row.domestic + row.foreign + row.alien + row.other, row.total, row.name);
}
assert.equal(column('domestic'), snapshot.companyOverview.domestic);
assert.equal(column('foreign'), snapshot.companyOverview.foreign);
assert.equal(column('alien'), snapshot.companyOverview.alien);
assert.equal(column('other'), snapshot.companyOverview.other);
assert.equal(column('total'), snapshot.companyOverview.printedTotal);
assert.equal(snapshot.companyOverview.printedTotal, 2571);
assert.equal(snapshot.companyOverview.printedTotalIsNotAnAuthorizedInsurerCensus, true);
assert.equal(snapshot.companyOverview.categoryEntriesAreNotDistinctCompanies, true);
assert.equal(sum(snapshot.licenseType.rows), snapshot.licenseType.printedTotal);
assert.equal(snapshot.licenseType.printedTotal, 241269);
assert.equal(sum(snapshot.businessType.rows), snapshot.businessType.printedTotal);
assert.equal(snapshot.businessType.printedTotal, 14309);
assert.equal(snapshot.licenseTablesAreNotAdded, true);
assert.notEqual(
  snapshot.licenseType.printedTotal + snapshot.businessType.printedTotal,
  snapshot.narrative.licenseesWhoCanSell,
);
assert.equal(snapshot.narrative.licensesIssuedIsApproximateActivity, true);
assert.equal(snapshot.narrative.basedInTheStateIsALocationAttribute, true);
assert.equal(snapshot.annualReport.layoutDateIsNotTheAuthorityClock, true);
assert.equal(snapshot.annualReport.sha256, '709897198abdec9cc7fd29bea813e457110935b24e94b73e3d5e9e75921c4cb4');

const examGiven = snapshot.examinations.types.reduce((total: number, row: { given: number }) => total + row.given, 0);
const examPassed = snapshot.examinations.types.reduce((total: number, row: { passed: number }) => total + row.passed, 0);
assert.equal(examGiven, snapshot.examinations.examsGiven);
assert.equal(examPassed, snapshot.examinations.examsPassed);
const firstGiven = snapshot.examinations.firstAttempts.types.reduce((total: number, row: { given: number }) => total + row.given, 0);
const firstPassed = snapshot.examinations.firstAttempts.types.reduce((total: number, row: { passed: number }) => total + row.passed, 0);
assert.equal(firstGiven, snapshot.examinations.firstAttempts.examsGiven);
assert.equal(firstPassed, snapshot.examinations.firstAttempts.examsPassed);
assert.equal(snapshot.examinations.firstAttempts.notAddedToAllAttempts, true);

const complaints = snapshot.consumerServices.rows.reduce((total: number, row: { complaints: number }) => total + row.complaints, 0);
const inquiries = snapshot.consumerServices.rows.reduce((total: number, row: { inquiries: number }) => total + row.inquiries, 0);
assert.equal(complaints, snapshot.consumerServices.complaintTotal);
assert.equal(inquiries, snapshot.consumerServices.inquiryTotal);
assert.equal(complaints + inquiries, snapshot.consumerServices.handledComplaintsAndInquiries);
assert.equal(snapshot.consumerServices.notAComplaintCensus, true);

const pc = snapshot.filings.propertyAndCasualty;
assert.equal(pc.homeowners + pc.auto + pc.otherLines, pc.printedTotal);
const lh = snapshot.filings.lifeAndHealth;
assert.equal(lh.annuity + lh.health + lh.life + lh.otherLines, lh.visibleRowSum);
assert.notEqual(lh.visibleRowSum, lh.printedTotal);
assert.equal(lh.published, false);

assert.equal(snapshot.receivership.rows.length, 17);
assert.equal(snapshot.receivership.rows.filter((row: { status: string }) => row.status === 'ACTIVE').length, 6);
assert.equal(snapshot.receivership.rows.filter((row: { status: string }) => row.status === 'CLOSED').length, 11);
assert.equal(snapshot.receivership.authorityAsOf, null);
assert.equal(snapshot.receivership.rows[1].name, 'DEARBOR');
assert.equal(snapshot.examIndex.pdfLinks, 84);
assert.equal(snapshot.examIndex.notACompanyCount, true);
for (const roster of Object.values(snapshot.rosters) as { rowCount: number | null; status: string }[]) {
  assert.equal(roster.rowCount, null);
  assert.equal(roster.status, 'NOT_ACQUIRED');
}
assert.equal(snapshot.fireMarshalPermitsAreNotProducerLicenses, true);
assert.equal(snapshot.graph.graphWrites, 0);
assert.equal(snapshot.graph.nameOnlyAdverseJoins, 0);
assert.equal(snapshot.graph.newCanonicalOrganizations, 0);

for (const q of [
  'insurance company Alabama',
  'insurer Alabama',
  'insurance agency Alabama',
  'insurance producer Alabama',
  'insurance agent Alabama',
  'insurance adjuster Alabama',
  'surplus lines broker Alabama',
  'managing general agent Alabama',
  'Alabama insurance license',
  'Alabama ALDOI',
  'AL DOI insurance license',
  'insurance enforcement Alabama',
  'insurance complaints Alabama',
  'financial exam Alabama',
  'receivership Alabama',
  'insurance agency Birmingham',
  'insurance agency Montgomery',
  'insurance agency Huntsville',
  'insurance agency Tuscaloosa',
  'insurance agency Mobile Alabama',
]) assert.equal(interpretInsuranceAskQuery(q).query.jurisdiction?.state, 'AL', q);

assert.notEqual(interpretInsuranceAskQuery('mobile home insurance').interpretation[0]?.label, 'Alabama ALDOI');
assert.notEqual(interpretInsuranceAskQuery('insurance agency Mobile').interpretation[0]?.label, 'Alabama ALDOI');
assert.equal(interpretInsuranceAskQuery('insurance agency Mobile, Alabama').interpretation[0]?.label, 'Alabama ALDOI');
assert.equal(interpretInsuranceAskQuery('insurance agency Birmingham Michigan').query.jurisdiction?.state, 'MI');
assert.equal(interpretInsuranceAskQuery('insurance agency Lafayette').query.jurisdiction?.state, 'LA');
assert.equal(interpretInsuranceAskQuery('insurance adjuster Alabama').query.entityClass, undefined);
assert.equal(interpretInsuranceAskQuery('surplus lines broker Alabama').query.entityClass, undefined);
assert.equal(interpretInsuranceAskQuery('managing general agent Alabama').query.entityClass, undefined);
assert.equal(interpretInsuranceAskQuery('insurance agent Alabama').query.entityClass, 'person');
assert.equal(interpretInsuranceAskQuery('insurance agency Alabama').query.entityClass, 'agency');
assert.equal(interpretInsuranceAskQuery('insurance company Alabama').query.entityClass, 'insurer');
assert.notEqual(
  interpretInsuranceAskQuery('insurance agent Alabama').query.entityClass,
  interpretInsuranceAskQuery('insurance adjuster Alabama').query.entityClass,
);

for (const q of ['NAIC 10064 Alabama mover', 'NAIC 10064 Alabama contractor']) {
  const parsed = interpretInsuranceAskQuery(q).query;
  assert.deepEqual(parsed.identifier, { type: 'naic_company_code', value: '10064' });
  assert.equal(parsed.entityClass, 'insurer');
}
for (const q of ['NPN 20000635 Alabama lender', 'NPN 20000635 Alabama mover']) {
  assert.deepEqual(interpretInsuranceAskQuery(q).query.identifier, { type: 'npn', value: '20000635' });
}
assert.equal(interpretInsuranceAskQuery('20000635 Alabama').query.identifier, undefined);

for (const term of ['best', 'safest', 'recommended', 'most trustworthy', 'top-rated', 'Trust Score', 'AggregateRating']) {
  assert.equal(interpretInsuranceAskQuery(`${term} Alabama insurance agency`).query.coverageState, 'UNSUPPORTED', term);
}

const censusNumbers = /\b(?:2,571|2571|241,269|241269|14,309|14309|262,664|262664|204,628|204628|32,976|32976|36,854|36854|51,000|51000|8,265|8265|7,269|7269|2,366|2366|2,005|2005)\b/;
for (const q of [
  'homeowners insurance agencies Alabama',
  'auto insurance agencies Alabama',
  'how many homeowners insurance agencies in Alabama',
]) {
  const parsed = interpretInsuranceAskQuery(q);
  assert.equal(parsed.query.mode, 'fail_closed', q);
  assert.equal(parsed.query.coverageState, 'UNSUPPORTED', q);
  assert.doesNotMatch(parsed.query.failReason ?? '', censusNumbers, q);
}

const combined = interpretInsuranceAskQuery('how many insurance companies and agents and adjusters in Alabama');
assert.equal(combined.query.mode, 'fail_closed');
assert.equal(combined.query.coverageState, 'NOT_ACQUIRED');
assert.equal(combined.query.entityClass, undefined);
assert.match(combined.query.failReason ?? '', /separate grains/i);
assert.doesNotMatch(combined.query.failReason ?? '', censusNumbers);

const fire = interpretInsuranceAskQuery('Alabama fire marshal permit');
assert.match(fire.query.failReason ?? '', /not Alabama insurance producer licenses/i);
assert.equal(interpretInsuranceAskQuery('financial exam Alabama').query.coverageState, 'PARTIAL');
assert.equal(interpretInsuranceAskQuery('receivership Alabama').query.coverageState, 'PARTIAL');
assert.equal(interpretInsuranceAskQuery('insurance enforcement Alabama').query.coverageState, 'NOT_ACQUIRED');
assert.match(interpretInsuranceAskQuery('unauthorized insurance companies Alabama').query.failReason ?? '', /not an unauthorized-company roster/i);

assert.equal(STATE_RESEARCH.AL, '/alabama');
assert.equal(normalizedPublishedStatePath('/Alabama'), '/alabama');
assert.equal((sitemap.match(/'\/alabama'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/alabama', import.meta.url)), ['page.tsx']);
assert.match(page, /NOT_ACQUIRED/);
assert.match(page, /OPEN_SEARCH_ONLY/);
assert.match(page, /Graph writes: 0/);
assert.match(page, /null/);
assert.match(page, /not an authorized-insurer census/i);
assert.match(page, /The two totals are not added/);
assert.match(page, /No city pages are published/);
assert.match(page, /DEARBOR/);
assert.match(page, /State Fire Marshal permits are not insurance producer licenses/);
assert.match(page, /not a provider-level complaint census/i);
assert.match(page, /Life and Health filing lines are not published/);
assert.doesNotMatch(page, /2,005|2005/);
assert.doesNotMatch(page, /255,578|255578/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /\/alabama\/(?:birmingham|montgomery|huntsville|tuscaloosa|mobile)/);
assert.doesNotMatch(page, /wisconsin-intelligence|ldi\.la\.gov/);
console.log('AL-INS-001 regulator grains, separate tables, null rosters, routing, publication: PASS');
