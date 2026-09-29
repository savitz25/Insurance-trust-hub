import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const market = JSON.parse(read('lib/wisconsin-intelligence/market-conduct.json'));
const financial = JSON.parse(read('lib/wisconsin-intelligence/financial-exams.json'));
const page = read('app/wisconsin/page.tsx');
const sitemap = read('app/sitemap.ts');

for (const index of [market, financial]) {
  assert.equal(index.rowCount, index.rows.length);
  assert.equal(index.recent2022to2026, index.rows.filter((r: {asOfAsPrinted:string}) => /202[2-6]/.test(r.asOfAsPrinted)).length);
  assert.ok(index.rows.every((r: {company:string; asOfAsPrinted:string; sourceDocument:string|null; naic:null}) => r.company && r.asOfAsPrinted && r.naic === null && (!r.sourceDocument || r.sourceDocument.startsWith('https://oci.wi.gov/'))));
}
assert.equal(market.rowCount, 103);
assert.equal(financial.rowCount, 171);
assert.equal(market.recent2022to2026, 1);
assert.equal(financial.recent2022to2026, 115);
assert.equal([434,36,21,4,1003,4,21,3,25].reduce((a,b)=>a+b,0), 1551);
for (const q of ['insurance company Wisconsin','insurer Wisconsin','insurance agency Wisconsin','insurance producer Wisconsin','insurance agent Wisconsin','Wisconsin insurance license','Wisconsin OCI','insurance enforcement Wisconsin','insurance order Wisconsin','market conduct Wisconsin','financial exam Wisconsin','insurance complaints Wisconsin','insurance agency Milwaukee','insurance agency Madison','insurance agency Green Bay','insurance agency Kenosha']) assert.equal(interpretInsuranceAskQuery(q).query.jurisdiction?.state,'WI',q);
for (const q of ['NAIC 10064 Wisconsin mover','NAIC 10064 Wisconsin contractor']) { const r = interpretInsuranceAskQuery(q).query; assert.deepEqual(r.identifier,{type:'naic_company_code',value:'10064'}); assert.equal(r.entityClass,'insurer'); }
for (const q of ['NPN 20000635 Wisconsin lender','NPN 20000635 Wisconsin mover']) assert.deepEqual(interpretInsuranceAskQuery(q).query.identifier,{type:'npn',value:'20000635'});
assert.equal(interpretInsuranceAskQuery('20000635 Wisconsin').query.identifier,undefined);
for (const term of ['best','safest','recommended','most trustworthy','most trusted','top-rated','highest-rated','#1','number one','Trust Score','AggregateRating','ratingValue','paid ranking','sponsored ranking']) assert.equal(interpretInsuranceAskQuery(`${term} Wisconsin insurance agency`).query.coverageState,'UNSUPPORTED',term);
assert.equal(normalizedPublishedStatePath('/Wisconsin'),'/wisconsin');
assert.equal((sitemap.match(/'\/wisconsin'/g) ?? []).length,1);
assert.match(page,/NOT_ACQUIRED/);
assert.match(page,/Graph writes: 0/);
assert.doesNotMatch(page,/AggregateRating|ratingValue|Trust Score/);
console.log('WI-INS-001 regulator grains, exam indexes, routing, identifiers, ranking, publication: PASS');
