import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/arkansas-intelligence/ar-ins-001.json'));
const page = read('app/arkansas/page.tsx');
const sitemap = read('app/sitemap.ts');
const premium = snapshot.premiumByStatement;
const ask = (q: string) => interpretInsuranceAskQuery(q);

assert.equal(premium.health + premium.lifeAccidentAndHealth + premium.propertyAndCasualty + premium.title, premium.printedTotal);
assert.equal(premium.printedTotal, 25836173780);
assert.equal(premium.isCompanyCount, false);
assert.equal(premium.propertyCasualtyLineOfBusinessPrintedTotal, 8920646494);
assert.notEqual(premium.propertyAndCasualty, premium.propertyCasualtyLineOfBusinessPrintedTotal);
assert.equal(premium.lineOfBusinessTotalReplacesStatementType, false);
assert.equal(snapshot.companies.domesticInsurers, 69);
assert.equal(snapshot.companies.domesticAndLicensedForeignInsurers, 1642);
assert.equal(snapshot.companies.domesticIsInsideTheLicensedTotal, true);
assert.equal(snapshot.companies.captivesExcluded, true);
assert.equal(snapshot.companies.companyRows, null);
assert.equal(snapshot.companies.namedRoster, 'NOT_ACQUIRED');
assert.notEqual(snapshot.companies.domesticInsurers + snapshot.companies.domesticAndLicensedForeignInsurers, snapshot.companies.domesticAndLicensedForeignInsurers);
assert.equal(snapshot.captives.count, 16);
assert.equal(snapshot.captives.includedInLicensedInsurerCount, false);
assert.equal(snapshot.captives.rows, null);
assert.notEqual(snapshot.captives.count + snapshot.companies.domesticAndLicensedForeignInsurers, snapshot.companies.domesticAndLicensedForeignInsurers);
assert.equal(snapshot.department.complaints, 2240);
assert.equal(snapshot.department.inquiries, 159);
assert.notEqual(snapshot.department.complaints, snapshot.department.inquiries);
assert.equal(snapshot.department.complaintRows, null);
assert.equal(snapshot.department.complaintsAreFindings, false);
assert.equal(snapshot.department.employment, 215);
assert.equal(snapshot.department.employmentIsLicensees, false);
assert.equal(snapshot.rosters.producers, null);
assert.equal(snapshot.rosters.agencies, null);
assert.equal(snapshot.rosters.adjusters, null);
assert.equal(snapshot.rosters.titleAgents, null);
assert.equal(snapshot.rosters.surplusLines, null);
assert.equal(snapshot.rosters.appointments, null);
assert.equal(snapshot.enforcement.orders, 'NOT_ACQUIRED');
assert.equal(snapshot.enforcement.exactCanonicalAttachments, 0);
assert.equal(snapshot.enforcement.nameOnlyAdverseJoins, 0);
assert.equal(snapshot.naicKeyFacts.publicationYearIsNotTheDataYear, true);
assert.equal(snapshot.naicKeyFacts.dataYear, 2024);
assert.equal(snapshot.naicKeyFacts.sha256, '1e5c04d70d1d7422c580526c1aef54cb2196932f49eae5838f2d5921b2beb361');
assert.equal(snapshot.graphWrites, 0);
assert.equal(snapshot.newCanonicalOrganizations, 0);
assert.equal(STATE_RESEARCH.AR, '/arkansas');
assert.equal(normalizedPublishedStatePath('/Arkansas'), '/arkansas');
assert.equal(normalizedPublishedStatePath('/arkansas'), null);
assert.equal(normalizedPublishedStatePath('/arkansas/little-rock'), null);
assert.equal(normalizedPublishedStatePath('/arkansas/fayetteville'), null);
assert.equal(normalizedPublishedStatePath('/arkansas/fort-smith'), null);
assert.equal((sitemap.match(/'\/arkansas'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/arkansas', import.meta.url)), ['page.tsx']);
assert.match(page, /path: '\/arkansas'/);
assert.match(page, /NOT_ACQUIRED/);
assert.match(page, /domesticAndLicensedForeignInsurers/);
assert.match(page, /does not replace the statement-type row/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /1,658|206,044/);
assert.doesNotMatch(page, /\/arkansas\/(?:little-rock|fayetteville|fort-smith)/);

for (const q of [
  'how many insurance companies in Arkansas',
  'how many Arkansas insurance producers',
  'Arkansas insurance agencies',
  'Arkansas insurance adjusters',
  'Arkansas title agents',
  'Arkansas surplus lines',
  'Arkansas captives',
  'Arkansas insurance complaints',
  'Arkansas insurance appointments',
  'insurance agency Little Rock',
  'insurance in ar',
]) {
  const result = ask(q);
  assert.equal(result.query.mode, 'fail_closed', q);
  assert.equal(result.query.jurisdiction?.state, 'AR', q);
}
assert.match(ask('how many insurance companies in Arkansas').query.failReason ?? '', /1,642/);
assert.match(ask('how many insurance companies in Arkansas').query.failReason ?? '', /inside the 1,642/);
assert.match(ask('how many Arkansas insurance producers').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('how many Arkansas insurance producers').query.failReason ?? '', /not producers/);
assert.match(ask('Arkansas title agents').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('Arkansas title agents').query.failReason ?? '', /not title agents/);
assert.match(ask('Arkansas insurance appointments').query.failReason ?? '', /not a license/);
assert.match(ask('Arkansas captives').query.failReason ?? '', /16/);
assert.match(ask('Arkansas insurance complaints').query.failReason ?? '', /2,240/);
assert.match(ask('Arkansas insurance complaints').query.failReason ?? '', /159/);
assert.match(ask('best insurance company in Arkansas').query.failReason ?? '', /does not rank/);
assert.match(ask('NAIC 12345 Arkansas').query.failReason ?? '', /NAIC 12345/);
assert.equal(ask('how many insurance companies in Mississippi').query.jurisdiction?.state, 'MS');
assert.notEqual(ask('how many insurance companies in Arizona').query.jurisdiction?.state, 'AR');
assert.notEqual(ask('insurance in arizona').query.jurisdiction?.state, 'AR');
assert.notEqual(ask('insurance in Missouri').query.jurisdiction?.state, 'AR');
console.log('AR-INS-001 PASS');
