import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/south-carolina-intelligence/sc-ins-001.json'));
const page = read('app/south-carolina/page.tsx');
const sitemap = read('app/sitemap.ts');
const premium = snapshot.premiumByStatement;
const ask = (q: string) => interpretInsuranceAskQuery(q);
const typeRows = (name: string) => snapshot.doiCompanyList.parsedTypes.find((row: { type: string }) => row.type === name).rows;

assert.equal(premium.health + premium.lifeAccidentAndHealth + premium.propertyAndCasualty + premium.title, premium.printedTotal);
assert.equal(premium.printedTotal, 52498738523);
assert.equal(premium.isCompanyCount, false);
assert.equal(snapshot.companies.domesticInsurers, 317);
assert.equal(snapshot.companies.domesticAndLicensedForeignInsurers, 2229);
assert.equal(snapshot.companies.licensedRank, 1);
assert.equal(snapshot.companies.domesticIsInsideTheLicensedTotal, true);
assert.equal(snapshot.companies.foreignOnlyCount, null);
assert.equal(snapshot.companies.captivesExcluded, true);
assert.equal(snapshot.captives.count, 230);
assert.equal(snapshot.captives.includedInLicensedInsurerCount, false);
assert.equal(snapshot.captives.directWrittenPremium, 1645704960);
assert.notEqual(snapshot.captives.directWrittenPremium, snapshot.captives.totalCaptivePremium);
assert.equal(snapshot.propertyCasualtyLines.printedTotal, 17000168577);
assert.notEqual(snapshot.propertyCasualtyLines.printedTotal, premium.propertyAndCasualty);
assert.equal(snapshot.department.complaints, 5324);
assert.equal(snapshot.department.inquiries, 9344);
assert.equal(snapshot.department.employment, 126);
assert.equal(snapshot.department.employmentIsLicensees, false);
assert.equal(snapshot.department.costYear2023, null);
assert.equal(snapshot.department.complaintRows, null);
assert.equal(typeRows('Property & Casualty'), 933);
assert.equal(typeRows('Eligible Surplus Lines Insurer'), 302);
assert.equal(typeRows('Property'), 7);
assert.equal(typeRows('Life'), 416);
assert.equal(snapshot.doiCompanyList.printedFileTotal, null);
assert.equal(snapshot.doiCompanyList.typesAreNotAdded, true);
assert.equal(snapshot.doiCompanyList.isTheNaicLicensedTotal, false);
assert.equal(snapshot.doiCompanyList.propertyTypeIsNotPropertyAndCasualty, true);
assert.equal(snapshot.rosters.producers, null);
assert.equal(snapshot.rosters.agencies, null);
assert.equal(snapshot.rosters.adjusters, null);
assert.equal(snapshot.rosters.appointments, null);
assert.equal(snapshot.rosters.surplusLinesBrokers, null);
assert.equal(snapshot.marketConduct.corpus, 'NOT_ACQUIRED');
assert.equal(snapshot.marketConduct.examIsEnforcement, false);
assert.equal(snapshot.enforcement.orders, 'NOT_ACQUIRED');
assert.equal(snapshot.enforcement.nameOnlyAdverseJoins, 0);
assert.equal(snapshot.enforcement.openRecordsRequest, 'NOT_FILED');
assert.equal(snapshot.graphWrites, 0);
assert.equal(snapshot.newCanonicalOrganizations, 0);
assert.equal(STATE_RESEARCH.SC, '/south-carolina');
assert.equal(normalizedPublishedStatePath('/South-Carolina'), '/south-carolina');
assert.equal(normalizedPublishedStatePath('/south-carolina'), null);
assert.equal(normalizedPublishedStatePath('/south-carolina/charleston'), null);
assert.equal(normalizedPublishedStatePath('/south-carolina/columbia'), null);
assert.equal(normalizedPublishedStatePath('/south-carolina/greenville'), null);
assert.equal((sitemap.match(/'\/south-carolina'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/south-carolina', import.meta.url)), ['page.tsx']);
assert.match(page, /path: '\/south-carolina'/);
assert.match(page, /NOT_ACQUIRED/);
assert.match(page, /does not publish one South Carolina insurer total/);
assert.match(page, /April 2026/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /2,509|2509|2,546|1,912/);
assert.doesNotMatch(page, /\/south-carolina\/(?:charleston|columbia|greenville)/);

for (const q of [
  'how many insurance companies in South Carolina',
  'how many South Carolina insurance producers',
  'South Carolina insurance agencies',
  'South Carolina insurance adjusters',
  'South Carolina surplus lines',
  'South Carolina captives',
  'South Carolina insurance complaints',
  'South Carolina market conduct examinations',
]) {
  const result = ask(q);
  assert.equal(result.query.mode, 'fail_closed', q);
  assert.equal(result.query.jurisdiction?.state, 'SC', q);
}
const many = ask('how many insurance companies in South Carolina').query.failReason ?? '';
assert.match(many, /2,229/);
assert.match(many, /inside/);
assert.match(many, /230/);
assert.doesNotMatch(many, /2,509|2,546|1,912/);
assert.match(ask('how many South Carolina insurance producers').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('South Carolina surplus lines').query.failReason ?? '', /302/);
assert.match(ask('South Carolina captives').query.failReason ?? '', /230/);
assert.match(ask('South Carolina insurance complaints').query.failReason ?? '', /5,324/);
assert.match(ask('South Carolina insurance complaints').query.failReason ?? '', /9,344/);
assert.match(ask('best insurance company in South Carolina').query.failReason ?? '', /does not rank/);
assert.match(ask('insurance company Charleston South Carolina').query.failReason ?? '', /geography only/);
assert.equal(ask('how many insurance companies in Kentucky').query.jurisdiction?.state, 'KY');
assert.equal(ask('how many insurance companies in Alabama').query.jurisdiction?.state, 'AL');
assert.notEqual(ask('insurance agency Charleston').query.jurisdiction?.state, 'SC');
assert.equal(ask('insurance in sc').query.jurisdiction?.state, 'SC');
assert.notEqual(ask('best sc insurance').query.jurisdiction?.state, 'SC');
console.log('SC-INS-001 PASS');
