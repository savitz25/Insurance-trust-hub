import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const roster = JSON.parse(read('lib/connecticut-intelligence/company-roster.json'));
const market = JSON.parse(read('lib/connecticut-intelligence/market-conduct.json'));
const orders = JSON.parse(read('lib/connecticut-intelligence/consent-orders-2026.json'));
const financial = JSON.parse(read('lib/connecticut-intelligence/financial-exams.json'));
const page = read('app/connecticut/page.tsx');
const sitemap = read('app/sitemap.ts');

assert.equal(roster.asOf, '2026-06-30');
assert.equal(roster.rowCount, 1773);
assert.equal(roster.rows.length, 1773);
assert.equal(roster.rowsWithExactNaic, 1633);
assert.equal(roster.distinctNaicCount, 1611);
assert.equal(roster.companyTypeCounts['Property Casualty'], 857);
assert.equal(roster.companyTypeCounts['Life plus Accident and Health'], 385);
assert.equal(roster.companyTypeCounts['Excess and Surplus Lines'], 261);
assert.equal(roster.exactNaicRowsAlreadyInCanonicalIndex, 1611);
assert.equal(roster.distinctExactCanonicalNaics, 1593);
assert.equal(roster.unmatchedExactNaicRows, 22);
assert.ok(roster.rows.every((r: { naic: string | null; companyTypeAsPrinted: string }) => r.companyTypeAsPrinted && (!r.naic || /^\d{5}$/.test(r.naic))));
assert.equal(market.rowCount, 184);
assert.deepEqual(market.dispositionCounts, { Fined: 144, 'Review Completed': 40 });
assert.deepEqual(Object.fromEntries(['2022', '2023', '2024', '2025', '2026'].map(y => [y, market.rows.filter((r: { examClosedDate: string }) => r.examClosedDate.startsWith(y)).length])), { 2022: 48, 2023: 28, 2024: 44, 2025: 47, 2026: 17 });
assert.equal(orders.rowCount, 8);
assert.ok(orders.rows.every((r: { examClosedDate: string; orderForm: string; naicPrinted: string[]; npnPrinted: string[] }) => r.examClosedDate.startsWith('2026') && r.orderForm.includes('consent order') && !r.naicPrinted.length && !r.npnPrinted.length));
assert.equal(financial.rowCount, 54);
assert.ok(financial.rows.every((r: { reportDate: string; exactNaic: null }) => r.reportDate >= '2022-01-01' && r.exactNaic === null));

for (const q of [
  'insurance company Connecticut', 'insurer Connecticut', 'insurance agency Connecticut',
  'insurance producer Connecticut', 'insurance agent Connecticut', 'Connecticut insurance license',
  'Connecticut Insurance Department', 'insurance enforcement Connecticut', 'insurance discipline Connecticut',
  'insurance complaints Connecticut', 'market conduct Connecticut', 'insurance exam Connecticut',
  'insurance agency Hartford', 'insurance agency New Haven', 'insurance agency Stamford', 'insurance agency Bridgeport',
]) assert.equal(interpretInsuranceAskQuery(q).query.jurisdiction?.state, 'CT', q);

for (const q of ['NAIC 10064 Connecticut mover', 'NAIC 10064 Connecticut lender']) {
  const r = interpretInsuranceAskQuery(q).query;
  assert.deepEqual(r.identifier, { type: 'naic_company_code', value: '10064' });
  assert.equal(r.entityClass, 'insurer');
}
for (const q of ['NPN 20000635 Connecticut mover', 'NPN 20000635 Connecticut contractor']) {
  const r = interpretInsuranceAskQuery(q).query;
  assert.deepEqual(r.identifier, { type: 'npn', value: '20000635' });
  assert.notEqual(r.entityClass, 'insurer');
}
assert.equal(interpretInsuranceAskQuery('insurance agency NPN 20000635 Connecticut').query.entityClass, 'agency');
assert.equal(interpretInsuranceAskQuery('20000635 Connecticut').query.identifier, undefined);
for (const term of ['best', 'safest', 'recommended', 'most trustworthy', 'top-rated', 'highest-rated', '#1', 'number one', 'Trust Score', 'AggregateRating', 'ratingValue', 'paid ranking', 'sponsored ranking']) {
  assert.equal(interpretInsuranceAskQuery(`${term} Connecticut insurance agency`).query.coverageState, 'UNSUPPORTED', term);
}
assert.deepEqual(interpretInsuranceAskQuery('NAIC 10187 Michigan').query.identifier, { type: 'naic_company_code', value: '10187' });
assert.deepEqual(interpretInsuranceAskQuery('NPN 1234567 Michigan').query.identifier, { type: 'npn', value: '1234567' });
assert.equal(normalizedPublishedStatePath('/ConNecTicut'), '/connecticut');
assert.equal(normalizedPublishedStatePath('/connecticut'), null);
assert.equal(normalizedPublishedStatePath('/connecticut/hartford'), null);
assert.equal((sitemap.match(/'\/connecticut'/g) ?? []).length, 1);
assert.match(page, /NOT_ACQUIRED/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
assert.doesNotMatch(page, /best insurers|recommended insurers|top-rated insurers/i);
console.log('CT-INS-001 publication, grains, exact identifiers, enforcement, ranking, geography and MI regression: PASS');
