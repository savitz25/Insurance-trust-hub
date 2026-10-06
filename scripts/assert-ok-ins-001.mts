import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/oklahoma-intelligence/ok-ins-001.json'));
const page = read('app/oklahoma/page.tsx');
const sitemap = read('app/sitemap.ts');
const ask = (q: string) => interpretInsuranceAskQuery(q);
const lines = snapshot.complaints.byLine;

assert.equal(snapshot.companies.domesticInsurers, 88);
assert.equal(snapshot.companies.foreignInsurers, 1794);
assert.equal(snapshot.companies.domesticAddedToForeign, false);
assert.equal(snapshot.companies.combinedTotal, null);
assert.equal(snapshot.companies.namedRoster, 'NOT_ACQUIRED');
assert.equal(snapshot.premium.isCompanyCount, false);
assert.equal(snapshot.premium.exactDollars, null);
assert.equal(snapshot.licensees.residentProducers + snapshot.licensees.residentAdjusters === snapshot.licensees.totalLicenseesPrinted, false);
assert.equal(snapshot.licensees.remainderItemized, false);
assert.equal(snapshot.licensees.businessEntities, null);
assert.equal(snapshot.licensees.ceCoursesAreLicensees, false);
assert.equal(lines.lifeAndAnnuity + lines.commercial + lines.miscellaneous + lines.accidentAndHealth + lines.homeowners + lines.auto, snapshot.complaints.complaints);
assert.equal(snapshot.complaints.feedbackInquiries, snapshot.complaints.complaints);
assert.equal(snapshot.complaints.feedbackInquiriesAreTheSameRows, false);
assert.equal(snapshot.complaints.complaintsAreFindings, false);
assert.notEqual(snapshot.legal.fineDollarsFromThoseReferrals + snapshot.legal.antiFraudFineDollars, snapshot.legal.finesCollectedDollars);
assert.equal(snapshot.legal.finesCollectedIncludesTheReferralFines, 'NOT_STATED');
assert.equal(snapshot.legal.isLicenseeCensus, false);
assert.equal(snapshot.legal.orderRows, null);
assert.equal(snapshot.collections.surplusLinesTaxIsLicenseeCount, false);
assert.equal(snapshot.collections.surplusLinesLicenseeRoster, null);
assert.equal(snapshot.notAcquired.captiveCount, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.receivershipCount, 'NOT_ACQUIRED');
assert.equal(snapshot.exactCanonicalAttachments, 0);
assert.equal(snapshot.nameOnlyAdverseJoins, 0);
assert.equal(snapshot.graphWrites, 0);
assert.equal(snapshot.annualReport.sha256, '8e9d26e8465d6fdc9ec442459d8014ea56d41cbadebc5317ec95a2934245d591');
assert.equal(STATE_RESEARCH.OK, '/oklahoma');
assert.equal(normalizedPublishedStatePath('/Oklahoma'), '/oklahoma');
assert.equal(normalizedPublishedStatePath('/oklahoma'), null);
assert.equal(normalizedPublishedStatePath('/oklahoma/tulsa'), null);
assert.equal((sitemap.match(/'\/oklahoma'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/oklahoma', import.meta.url)), ['page.tsx']);
assert.match(page, /path: '\/oklahoma'/);
assert.match(page, /NOT_ACQUIRED/);
assert.match(page, /does not print a combined total/);
assert.match(page, /does not rank/);
assert.match(page, /342,456/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /1,882|1882/);
assert.doesNotMatch(page, /\/oklahoma\/(?:tulsa|oklahoma-city|norman)/);

for (const q of [
  'how many insurance companies in Oklahoma',
  'how many Oklahoma insurance producers',
  'Oklahoma insurance adjusters',
  'Oklahoma insurance agencies',
  'Oklahoma surplus lines',
  'Oklahoma insurance complaints',
  'insurance in ok',
  'insurance agency Tulsa',
]) {
  const result = ask(q);
  assert.equal(result.query.mode, 'fail_closed', q);
  assert.equal(result.query.jurisdiction?.state, 'OK', q);
}
assert.match(ask('how many insurance companies in Oklahoma').query.failReason ?? '', /88/);
assert.match(ask('how many insurance companies in Oklahoma').query.failReason ?? '', /1,794/);
assert.match(ask('how many insurance companies in Oklahoma').query.failReason ?? '', /not added/);
assert.match(ask('how many Oklahoma insurance producers').query.failReason ?? '', /23,166/);
assert.match(ask('how many Oklahoma insurance producers').query.failReason ?? '', /342,456/);
assert.match(ask('Oklahoma insurance adjusters').query.failReason ?? '', /3,627/);
assert.match(ask('Oklahoma insurance agencies').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('Oklahoma surplus lines').query.failReason ?? '', /not a licensee count/);
assert.match(ask('Oklahoma insurance complaints').query.failReason ?? '', /3,379/);
assert.match(ask('Oklahoma insurance complaints').query.failReason ?? '', /not say/);
assert.match(ask('best insurance company in Oklahoma').query.failReason ?? '', /does not rank/);
assert.match(ask('insurance agency Tulsa').query.failReason ?? '', /geography only/);
assert.equal(ask('how many insurance companies in Arkansas').query.jurisdiction?.state, 'AR');
assert.equal(ask('how many insurance companies in Mississippi').query.jurisdiction?.state, 'MS');
assert.notEqual(ask('insurance in Missouri').query.jurisdiction?.state, 'OK');
assert.notEqual(ask('insurance in Utah').query.jurisdiction?.state, 'OK');
console.log('OK-INS-001 PASS');
