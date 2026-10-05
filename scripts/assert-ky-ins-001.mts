import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/kentucky-intelligence/ky-ins-001.json'));
const page = read('app/kentucky/page.tsx');
const sitemap = read('app/sitemap.ts');
const premium = snapshot.premiumByStatement;
const ask = (q: string) => interpretInsuranceAskQuery(q);

assert.equal(premium.health + premium.lifeAccidentAndHealth + premium.propertyAndCasualty + premium.title, premium.printedTotal);
assert.equal(premium.printedTotal, 45210958367);
assert.equal(premium.isCompanyCount, false);
assert.equal(snapshot.companies.domesticInsurers, 81);
assert.equal(snapshot.companies.domesticAndLicensedForeignInsurers, 1734);
assert.equal(snapshot.companies.domesticIsInsideTheLicensedTotal, true);
assert.equal(snapshot.companies.captivesExcluded, true);
assert.equal(snapshot.companies.companyRows, null);
assert.notEqual(snapshot.companies.domesticInsurers + snapshot.companies.domesticAndLicensedForeignInsurers, snapshot.companies.domesticAndLicensedForeignInsurers);
assert.equal(snapshot.captives.count, 32);
assert.equal(snapshot.captives.includedInLicensedInsurerCount, false);
assert.notEqual(snapshot.captives.count + snapshot.companies.domesticAndLicensedForeignInsurers, snapshot.companies.domesticAndLicensedForeignInsurers);
assert.equal(snapshot.department.complaints, 2521);
assert.equal(snapshot.department.inquiries, 1255);
assert.notEqual(snapshot.department.complaints, snapshot.department.inquiries);
assert.equal(snapshot.department.complaintRows, null);
assert.equal(snapshot.department.complaintOutcomes, null);
assert.equal(snapshot.department.employmentIsLicensees, false);
assert.equal(snapshot.rosters.producers, null);
assert.equal(snapshot.rosters.agencies, null);
assert.equal(snapshot.rosters.adjusters, null);
assert.equal(snapshot.rosters.surplusLines, null);
assert.equal(snapshot.marketConduct.corpus, 'NOT_ACQUIRED');
assert.equal(snapshot.marketConduct.examIsEnforcement, false);
assert.equal(snapshot.enforcement.orders, 'NOT_ACQUIRED');
assert.equal(snapshot.enforcement.rehabilitationLiquidation, 'NOT_ACQUIRED');
assert.equal(snapshot.enforcement.openRecordsRequest, 'NOT_FILED');
assert.equal(snapshot.naicKeyFacts.publicationYearIsNotTheDataYear, true);
assert.equal(snapshot.naicKeyFacts.dataYear, 2024);
assert.equal(snapshot.naicKeyFacts.sha256, '2264968fd7d545d80b0fdffb838deb4ffaa81f64ca0f138d8da600633ee2b8ee');
assert.equal(snapshot.graphWrites, 0);
assert.equal(snapshot.newCanonicalOrganizations, 0);
assert.equal(STATE_RESEARCH.KY, '/kentucky');
assert.equal(normalizedPublishedStatePath('/Kentucky'), '/kentucky');
assert.equal(normalizedPublishedStatePath('/kentucky'), null);
assert.equal(normalizedPublishedStatePath('/kentucky/louisville'), null);
assert.equal(normalizedPublishedStatePath('/kentucky/lexington'), null);
assert.equal((sitemap.match(/'\/kentucky'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/kentucky', import.meta.url)), ['page.tsx']);
assert.match(page, /path: '\/kentucky'/);
assert.match(page, /NOT_ACQUIRED/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /\/kentucky\/(?:louisville|lexington)/);

for (const q of [
  'how many insurance companies in Kentucky',
  'how many Kentucky insurance producers',
  'Kentucky insurance agencies',
  'Kentucky insurance adjusters',
  'Kentucky surplus lines',
  'Kentucky captives',
  'Kentucky insurance complaints',
  'Kentucky market conduct examinations',
  'insurance agency Louisville',
  'insurance agent Lexington',
]) {
  const result = ask(q);
  assert.equal(result.query.mode, 'fail_closed', q);
  assert.equal(result.query.jurisdiction?.state, 'KY', q);
}
assert.match(ask('how many insurance companies in Kentucky').query.failReason ?? '', /1,734/);
assert.match(ask('how many insurance companies in Kentucky').query.failReason ?? '', /inside the 1,734/);
assert.match(ask('how many Kentucky insurance producers').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('how many Kentucky insurance producers').query.failReason ?? '', /not producers/);
assert.match(ask('Kentucky captives').query.failReason ?? '', /32/);
assert.match(ask('Kentucky insurance complaints').query.failReason ?? '', /2,521/);
assert.match(ask('Kentucky insurance complaints').query.failReason ?? '', /1,255/);
assert.match(ask('best insurance company in Kentucky').query.failReason ?? '', /does not rank/);
assert.match(ask('NAIC 12345 Kentucky').query.failReason ?? '', /NAIC 12345/);
assert.equal(ask('how many insurance companies in Alabama').query.jurisdiction?.state, 'AL');
assert.equal(ask('how many insurance companies in Louisiana').query.jurisdiction?.state, 'LA');
assert.notEqual(ask('insurance agency Louisville Alabama').query.jurisdiction?.state, 'KY');
console.log('KY-INS-001 PASS');
