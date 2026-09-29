import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const companies = JSON.parse(read('lib/maryland-intelligence/companies.json'));
const index = JSON.parse(read('lib/maryland-intelligence/order-exam-index.json'));
const enforcement = JSON.parse(read('lib/maryland-intelligence/producer-enforcement.json'));
const page = read('app/maryland/page.tsx');
const sitemap = read('app/sitemap.ts');

assert.equal(companies.rowCount, companies.rows.length);
assert.equal(companies.rowCount, 1295);
assert.equal(companies.otherLicensedEntityCount, companies.otherLicensedEntities.length);
assert.equal(companies.otherLicensedEntityCount, 114);
assert.equal(companies.rowsWithNaic, companies.rows.filter((r: { naic: string | null }) => r.naic).length);
assert.equal(companies.distinctNaic, new Set(companies.rows.map((r: { naic: string | null }) => r.naic).filter(Boolean)).size);
assert.equal(companies.exactCanonicalNaicRows + companies.unmatchedNaicRows, companies.rowsWithNaic);
assert.equal(companies.statusCounts['Active Company - No Regulatory Action'], 958);
assert.ok(companies.rows.every((r: { name: string; naic: string | null; status: string }) => r.name && r.status && (!r.naic || /^\d{5}$/.test(r.naic))));
assert.equal(index.rowCount, index.rows.length);
assert.deepEqual(index.sources.map((s: { grain: string; year: number }) => `${s.grain}:${s.year}`), ['company:2022','company:2023','company:2024','company:2025','company:2026','producer firm/agency:2022','producer firm/agency:2023','producer firm/agency:2024','producer firm/agency:2025','producer firm/agency:2026']);
assert.equal(index.rows.filter((r: { category: string }) => r.category === 'Market Conduct Exams').length, 20);
assert.equal(index.rows.filter((r: { category: string }) => r.category === 'Financial Exams').length, 40);
assert.ok(index.rows.every((r: { signedDate: string; respondentGrain: string; displayedStatus: string; category: string }) => /^202[2-6]-\d\d-\d\d$/.test(r.signedDate) && ['company','producer firm/agency'].includes(r.respondentGrain) && r.displayedStatus && r.category));
assert.equal(enforcement.rowCount, enforcement.rows.length);
assert.equal(enforcement.rowCount, 105);
assert.deepEqual(enforcement.sources.map((s: { year: number }) => s.year), [2022,2023,2024,2025,2026]);
assert.ok(enforcement.rows.every((r: { actionDate: string; respondentGrain: string; orderNumber: string }) => /^202[2-6]-\d\d-\d\d$/.test(r.actionDate) && ['agency','unresolved producer/agency'].includes(r.respondentGrain) && r.orderNumber));

for (const q of ['insurance company Maryland','insurer Maryland','insurance agency Maryland','insurance producer Maryland','Maryland insurance license','Maryland Insurance Administration','insurance order Maryland','insurance enforcement Maryland','market conduct Maryland','insurance financial exam Maryland','insurance complaints Maryland','insurance agency Baltimore','insurance agency Annapolis','insurance agency Frederick','insurance agency Rockville']) assert.equal(interpretInsuranceAskQuery(q).query.jurisdiction?.state, 'MD', q);
for (const q of ['NAIC 12345 Maryland mover','NAIC 12345 Maryland lender']) { const r = interpretInsuranceAskQuery(q).query; assert.deepEqual(r.identifier, { type: 'naic_company_code', value: '12345' }); assert.equal(r.entityClass,'insurer'); }
for (const q of ['NPN 12345678 Maryland mover','NPN 12345678 Maryland contractor']) assert.deepEqual(interpretInsuranceAskQuery(q).query.identifier, { type: 'npn', value: '12345678' });
assert.equal(interpretInsuranceAskQuery('12345678 Maryland').query.identifier, undefined);
for (const term of ['best','safest','recommended','most trustworthy','top-rated','highest-rated','#1','number one','Trust Score','AggregateRating','ratingValue','paid ranking','sponsored ranking']) assert.equal(interpretInsuranceAskQuery(`${term} Maryland insurance agency`).query.coverageState,'UNSUPPORTED',term);
assert.equal(normalizedPublishedStatePath('/Maryland'),'/maryland');
assert.equal((sitemap.match(/'\/maryland'/g) ?? []).length,1);
assert.match(page,/NOT_ACQUIRED/);
assert.doesNotMatch(page,/AggregateRating|ratingValue|Trust Score/);
console.log('MD-INS-001 company, NAIC, class, enforcement, exam, routing, ranking, and publication checks: PASS');
