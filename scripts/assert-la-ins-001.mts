import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { recoveryFor, STATE_RESEARCH } from '../lib/insurance-ask/recovery';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const table = JSON.parse(read('lib/louisiana-intelligence/fy2025-table-17.json'));
const page = read('app/louisiana/page.tsx');
const sitemap = read('app/sitemap.ts');

const sum = (rows: { count: number }[]) => rows.reduce((total, row) => total + row.count, 0);
assert.equal(sum(table.riskBearing.domestic), table.riskBearing.domesticSubtotal);
assert.equal(sum(table.riskBearing.nonDomiciliary), table.riskBearing.nonDomiciliarySubtotal);
assert.equal(sum(table.riskBearing.other), table.riskBearing.otherSubtotal);
assert.equal(
  table.riskBearing.domesticSubtotal + table.riskBearing.nonDomiciliarySubtotal + table.riskBearing.otherSubtotal,
  table.riskBearing.total,
);
assert.equal(sum(table.nonRiskBearing), table.nonRiskBearingSubtotal);
assert.equal(table.riskBearing.total + table.nonRiskBearingSubtotal, table.printedGrandTotal);
assert.equal(table.printedGrandTotalIsNotACensus, true);
assert.equal(table.categoryEntriesAreNotDistinctCompanies, true);
assert.equal(table.asOf, '2025-06-30');
assert.equal(table.licenseeRoster.status, 'NOT_ACQUIRED');
assert.equal(table.licenseeRoster.publication, 'OPEN_SEARCH_ONLY');
assert.equal(table.licenseeRoster.individualCount, null);
assert.equal(table.licenseeRoster.agencyCount, null);
assert.equal(table.licenseeRoster.adjusterCount, null);
assert.equal(table.licenseeRoster.appointmentCount, null);
assert.equal(table.graph.graphWrites, 0);
assert.equal(table.riskBearing.nonDomiciliary.find((row: { name: string }) => /surplus lines/i.test(row.name)).estimated, true);

for (const q of [
  'insurance company Louisiana',
  'insurer Louisiana',
  'insurance agency Louisiana',
  'insurance producer Louisiana',
  'insurance agent Louisiana',
  'insurance adjuster Louisiana',
  'Louisiana insurance license',
  'Louisiana LDI',
  'insurance enforcement Louisiana',
  'insurance order Louisiana',
  'market conduct Louisiana',
  'financial exam Louisiana',
  'insurance complaints Louisiana',
  'insurance agency New Orleans',
  'insurance agency Baton Rouge',
  'insurance agency Shreveport',
  'insurance agency Lafayette',
]) assert.equal(interpretInsuranceAskQuery(q).query.jurisdiction?.state, 'LA', q);

assert.equal(interpretInsuranceAskQuery('insurance agency Lafayette Indiana').query.jurisdiction?.state, 'IN');
assert.equal(interpretInsuranceAskQuery('insurance adjuster Louisiana').query.entityClass, undefined);
assert.notEqual(interpretInsuranceAskQuery('insurance agent Louisiana').query.entityClass, interpretInsuranceAskQuery('insurance adjuster Louisiana').query.entityClass);

for (const q of ['NAIC 10064 Louisiana mover', 'NAIC 10064 Louisiana contractor']) {
  const r = interpretInsuranceAskQuery(q).query;
  assert.deepEqual(r.identifier, { type: 'naic_company_code', value: '10064' });
  assert.equal(r.entityClass, 'insurer');
}
for (const q of ['NPN 20000635 Louisiana lender', 'NPN 20000635 Louisiana mover']) {
  assert.deepEqual(interpretInsuranceAskQuery(q).query.identifier, { type: 'npn', value: '20000635' });
}
assert.equal(interpretInsuranceAskQuery('20000635 Louisiana').query.identifier, undefined);

for (const term of ['best', 'safest', 'recommended', 'most trustworthy', 'most trusted', 'top-rated', 'highest-rated', '#1', 'number one', 'Trust Score', 'AggregateRating', 'ratingValue', 'paid ranking', 'sponsored ranking']) {
  assert.equal(interpretInsuranceAskQuery(`${term} Louisiana insurance agency`).query.coverageState, 'UNSUPPORTED', term);
}

for (const q of [
  'homeowners insurance agencies Louisiana',
  'auto insurance agencies Louisiana',
  'how many homeowners insurance agencies in Louisiana',
  'home insurance New Orleans',
]) {
  const parsed = interpretInsuranceAskQuery(q);
  assert.equal(parsed.query.mode, 'fail_closed', q);
  assert.equal(parsed.query.coverageState, 'UNSUPPORTED', q);
  assert.ok(parsed.query.requestedProduct?.length, q);
  assert.equal(parsed.query.conditions?.some((c) => c.meaning === 'requested insurance product' && c.outcome === 'UNSUPPORTED'), true, q);
  assert.doesNotMatch(parsed.query.failReason ?? '', /\b(?:1,926|1926|2,788|2788|507,380|602,607)\b/, q);
  assert.ok(!recoveryFor(parsed.query).some((action) => /without a product filter/i.test(action.label)), q);
}

const combined = interpretInsuranceAskQuery('how many insurance companies and agents and adjusters in Louisiana');
assert.equal(combined.query.mode, 'fail_closed');
assert.equal(combined.query.coverageState, 'NOT_ACQUIRED');
assert.equal(combined.query.entityClass, undefined);
assert.match(combined.query.failReason ?? '', /separate grains/i);
assert.doesNotMatch(combined.query.failReason ?? '', /\b(?:1,926|1926|2,788|2788)\b/);

assert.equal(STATE_RESEARCH.LA, '/louisiana');
assert.equal(normalizedPublishedStatePath('/Louisiana'), '/louisiana');
assert.equal((sitemap.match(/'\/louisiana'/g) ?? []).length, 1);
assert.deepEqual(readdirSync(new URL('../app/louisiana', import.meta.url)), ['page.tsx']);
assert.match(page, /NOT_ACQUIRED/);
assert.match(page, /OPEN_SEARCH_ONLY/);
assert.match(page, /Graph writes: 0/);
assert.match(page, /null/);
assert.match(page, /not distinct companies/i);
assert.match(page, /No parish pages/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /oci\.wi\.gov|1,551|602,607|507,380/);
assert.doesNotMatch(page, /wisconsin-intelligence/);
console.log('LA-INS-001 regulator grains, category table, null licensee counts, routing, product intent, publication: PASS');
