import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/new-mexico-intelligence/nm-ins-001.json'));
const page = read('app/new-mexico/page.tsx');
const sitemap = read('app/sitemap.ts');
const ask = (q: string) => interpretInsuranceAskQuery(q);
const sentence = 'The Title Insurance Bureau currently regulates (68) licensed title insurance agents and (24) underwriters in New Mexico.';

assert.equal(snapshot.regulator, 'New Mexico Office of Superintendent of Insurance');
assert.equal(snapshot.source, 'https://osi.state.nm.us/en/about-us/divisions/');
assert.equal(snapshot.retrievedAt, '2026-10-06');
assert.match(snapshot.sourceClock, /present-tense statement/);
assert.match(snapshot.sourceClock, /did not print a separate as-of date/);
assert.equal(snapshot.titleBureau.sentence, sentence);
assert.equal(snapshot.titleBureau.licensedTitleInsuranceAgents, 68);
assert.equal(snapshot.titleBureau.underwriters, 24);
assert.equal(snapshot.titleBureau.agentsAddedToUnderwriters, false);
assert.equal(snapshot.titleBureau.combinedTotal, null);
assert.notEqual(snapshot.titleBureau.licensedTitleInsuranceAgents + snapshot.titleBureau.underwriters, snapshot.titleBureau.combinedTotal);
assert.equal(snapshot.statisticalReports.grain, 'filing');
assert.equal(snapshot.statisticalReports.isTitleAgentCensus, false);
assert.equal(snapshot.statisticalReports.isUnderwriterCensus, false);
assert.equal(snapshot.statisticalReports.pdfLinksCountedAsLicenseeCensus, false);
assert.equal(snapshot.statisticalReports.countedReportFiles, null);
assert.equal(snapshot.statisticalReports.index, 'https://www.osi.state.nm.us/en/insurance-professionals/title-insurance-forms/statistical-reports/');
assert.equal(snapshot.notAcquired.insurers, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.insurersDomesticForeignSplit, false);
assert.equal(snapshot.notAcquired.businessEntitiesBeyondTitleBureauSentence, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.individualProducers, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.adjusters, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.surplusLinesBrokers, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.thirdPartyAdministrators, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.appointments, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.examinations, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.enforcementOrders, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.receivership, 'NOT_ACQUIRED');
assert.equal(snapshot.notAcquired.complaints, 'NOT_ACQUIRED');
assert.equal(snapshot.tpaAnnualReportFormIsCensus, false);
assert.equal(snapshot.oneExaminationOrderIsExamCensus, false);
assert.equal(snapshot.namedExamPopulation, null);
assert.equal(snapshot.licenseVerification.isBulkCensus, false);
assert.equal(snapshot.licenseVerification.url, 'https://osi.state.nm.us/en/insurance-professionals/license-status-verification/');
assert.equal(snapshot.complaintsAreFindings, false);
assert.equal(snapshot.albuquerqueMarketingIsStatewidePopulation, false);
assert.equal(snapshot.nameOnlyAdverseJoins, 0);
assert.equal(snapshot.netNewEntities, 0);
assert.equal(snapshot.graphWrites, 0);
assert.equal(snapshot.aggregateRating, null);
assert.equal(snapshot.trustScore, null);
assert.equal(snapshot.combinedInsurancePopulation, null);
assert.equal(STATE_RESEARCH.NM, '/new-mexico');
assert.equal(normalizedPublishedStatePath('/New-Mexico'), '/new-mexico');
assert.equal(normalizedPublishedStatePath('/new-mexico'), null);
assert.equal(normalizedPublishedStatePath('/new-mexico/albuquerque'), null);
assert.equal(normalizedPublishedStatePath('/new-mexico/santa-fe'), null);
assert.equal((sitemap.match(/'\/new-mexico'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/new-mexico', import.meta.url)), ['page.tsx']);
assert.match(page, /path: '\/new-mexico'/);
assert.match(page, new RegExp(sentence.replace(/[()]/g, '\\$&')));
assert.match(page, /present-tense statement/);
assert.match(page, /2026-10-06/);
assert.match(page, /did not print a separate as-of date/);
assert.match(page, /filing grain/);
assert.match(page, /NOT_ACQUIRED/);
assert.match(page, /does not rank/);
assert.match(page, /not added/);
assert.match(page, /blank TPA annual-report form is not a census/);
assert.match(page, /One examination order is not an exam census/);
assert.match(page, /not a finding/);
assert.match(page, /search, not a bulk census/);
assert.match(page, /geography only/);
assert.match(page, /are not split/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /\b92\b|\b192\b/);
assert.doesNotMatch(page, /\/new-mexico\/(?:albuquerque|santa-fe)/);
assert.doesNotMatch(page, /janix|beWellnm|Eddie Davis|Linton Associates/i);
assert.doesNotMatch(JSON.stringify(snapshot), /\b92\b|\b192\b/);

for (const q of [
  'how many insurance companies in New Mexico',
  'how many New Mexico insurance producers',
  'New Mexico insurance adjusters',
  'New Mexico insurance agencies',
  'New Mexico surplus lines',
  'New Mexico insurance complaints',
  'New Mexico title agents',
  'New Mexico third-party administrators',
  'New Mexico insurance examinations',
  'insurance in nm',
  'insurance in NM',
  'insurance agency Albuquerque',
  'insurance agency Santa Fe',
  'best insurance company in New Mexico',
]) {
  const result = ask(q);
  assert.equal(result.query.mode, 'fail_closed', q);
  assert.equal(result.query.jurisdiction?.state, 'NM', q);
  assert.doesNotMatch(result.query.failReason ?? '', /\b92\b|\b192\b/, q);
}

assert.match(ask('how many insurance companies in New Mexico').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('how many insurance companies in New Mexico').query.failReason ?? '', /not split/);
assert.match(ask('how many insurance companies in New Mexico').query.failReason ?? '', /not added/);
assert.match(ask('how many insurance companies in New Mexico').query.failReason ?? '', /68/);
assert.match(ask('how many insurance companies in New Mexico').query.failReason ?? '', /24/);
assert.match(ask('how many New Mexico insurance producers').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('how many New Mexico insurance producers').query.failReason ?? '', /not an individual-producer census/);
assert.match(ask('New Mexico insurance adjusters').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('New Mexico insurance agencies').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('New Mexico insurance agencies').query.failReason ?? '', /beyond the title-bureau sentence/);
assert.match(ask('New Mexico surplus lines').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('New Mexico insurance complaints').query.failReason ?? '', /NOT_ACQUIRED/);
assert.match(ask('New Mexico insurance complaints').query.failReason ?? '', /not a finding/);
assert.match(ask('New Mexico title agents').query.failReason ?? '', /68/);
assert.match(ask('New Mexico title agents').query.failReason ?? '', /24/);
assert.match(ask('New Mexico title agents').query.failReason ?? '', /not added/);
assert.match(ask('New Mexico title agents').query.failReason ?? '', /filing grain/);
assert.match(ask('New Mexico third-party administrators').query.failReason ?? '', /blank TPA annual-report form is not a census/);
assert.match(ask('New Mexico insurance examinations').query.failReason ?? '', /not an exam census/);
assert.match(ask('New Mexico insurance examinations').query.failReason ?? '', /does not name a single insurer/);
assert.match(ask('best insurance company in New Mexico').query.failReason ?? '', /does not rank/);
assert.match(ask('insurance agency Albuquerque').query.failReason ?? '', /geography only/);
assert.match(ask('insurance agency Santa Fe').query.failReason ?? '', /geography only/);
assert.equal(ask('insurance in nm').query.jurisdiction?.state, 'NM');
assert.notEqual(ask('nm').query.jurisdiction?.state, 'NM');
assert.notEqual(ask('NM').query.jurisdiction?.state, 'NM');
assert.notEqual(ask('insurance nm').query.jurisdiction?.state, 'NM');
assert.equal(ask('how many insurance companies in Arkansas').query.jurisdiction?.state, 'AR');
assert.equal(ask('how many insurance companies in Mississippi').query.jurisdiction?.state, 'MS');
assert.equal(ask('insurance in Oklahoma').query.jurisdiction?.state, 'OK');
assert.equal(ask('insurance in ok').query.jurisdiction?.state, 'OK');
assert.notEqual(ask('insurance in Missouri').query.jurisdiction?.state, 'NM');
assert.notEqual(ask('insurance in Utah').query.jurisdiction?.state, 'NM');
console.log('NM-INS-001 PASS');
