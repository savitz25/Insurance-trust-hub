import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const snapshot = JSON.parse(read('lib/indiana-intelligence/accepted-snapshot.json'));
const page = read('app/indiana/page.tsx');
const sitemap = read('app/sitemap.ts');

assert.equal(snapshot.enforcement.rowCount, snapshot.enforcement.rows.length);
assert.ok(snapshot.enforcement.rows.every((row: { finalOrderDate: string; orderNumber: string; sourceDocument: string | null }) =>
  row.finalOrderDate >= '2022-01-01' && row.finalOrderDate <= '2026-09-29' && row.orderNumber && (!row.sourceDocument || row.sourceDocument.startsWith('https://www.in.gov/idoi/'))));
assert.equal(snapshot.financialExams.indexRows, snapshot.financialExams.rows.length);
assert.equal(snapshot.financialExams.recent2022to2026, snapshot.financialExams.rows.filter((row: { reportYear: number }) => row.reportYear >= 2022 && row.reportYear <= 2026).length);
assert.equal(snapshot.financialExams.distinctNaic, new Set(snapshot.financialExams.rows.map((row: { naic: string }) => row.naic)).size);
assert.equal(snapshot.companyRoster.companyCount, null);
assert.equal(snapshot.companyRoster.statewideRows, 'NOT_ACQUIRED');
assert.equal(snapshot.marketConduct.standaloneExamIndex, 'NOT_ACQUIRED');
assert.equal(snapshot.enforcement.exactAdverseAttachments, 0);
assert.equal(snapshot.enforcement.nameOnlyAdverseJoins, 0);
assert.deepEqual(snapshot.graph, { newCanonicalOrganizations: 0, graphWrites: 0, claimEligibilityChanges: 0 });
for (const q of ['insurance company Indiana','insurer Indiana','insurance agency Indiana','insurance producer Indiana','Indiana insurance license','Indiana Department of Insurance','insurance enforcement Indiana','market conduct Indiana','financial exam Indiana','insurance complaints Indiana','insurance agency Indianapolis','insurance agency Fort Wayne','insurance agency Evansville','insurance agency South Bend']) assert.equal(interpretInsuranceAskQuery(q).query.jurisdiction?.state,'IN',q);
for (const q of ['NAIC 10064 Indiana mover','NAIC 10064 Indiana contractor']) { const result = interpretInsuranceAskQuery(q).query; assert.deepEqual(result.identifier,{type:'naic_company_code',value:'10064'}); assert.equal(result.entityClass,'insurer'); }
for (const q of ['NPN 20000635 Indiana lender','NPN 20000635 Indiana mover']) assert.deepEqual(interpretInsuranceAskQuery(q).query.identifier,{type:'npn',value:'20000635'});
assert.equal(interpretInsuranceAskQuery('20000635 Indiana').query.identifier,undefined);
for (const term of ['best','safest','recommended','most trustworthy','most trusted','top-rated','highest-rated','#1','number one','Trust Score','AggregateRating','ratingValue','paid ranking','sponsored ranking']) assert.equal(interpretInsuranceAskQuery(`${term} Indiana insurance agency`).query.coverageState,'UNSUPPORTED',term);
assert.equal(normalizedPublishedStatePath('/Indiana'),'/indiana');
assert.equal((sitemap.match(/'\/indiana'/g) ?? []).length,1);
assert.match(page,/NOT_ACQUIRED/);
assert.doesNotMatch(page,/AggregateRating|ratingValue|Trust Score/);
for (const q of ['insurer Wisconsin','insurance agency Maryland','NAIC 10064 Connecticut','NPN 20000635 Michigan']) assert.notEqual(interpretInsuranceAskQuery(q).query.jurisdiction?.state,'IN',q);
console.log('IN-INS-001 IDOI grains, action and exam indexes, exact NAIC, routing, ranking, publication: PASS');
