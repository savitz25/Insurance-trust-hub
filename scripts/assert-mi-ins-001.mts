import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
type Decision = { date: string; systemId: string | null; decisionIssuedDate?: string | null; caseNumber: string; sourceDocument: string; identifierSourcePage?: number | null };
type Exam = { reportDate: string };
const decisions = JSON.parse(read('lib/michigan-intelligence/final-decisions.json')) as { rows: Decision[] };
const exams = JSON.parse(read('lib/michigan-intelligence/market-exams.json')) as { rows: Exam[] };
const audit = JSON.parse(read('lib/michigan-intelligence/linkage-audit.json'));
const page = read('app/michigan/page.tsx');
const sitemap = read('app/sitemap.ts');

assert.equal(decisions.rows.length, 321);
assert.deepEqual(Object.fromEntries(['2022', '2023', '2024', '2025', '2026'].map((y) => [y, decisions.rows.filter((r) => r.date.startsWith(y)).length])), { 2022: 35, 2023: 78, 2024: 38, 2025: 72, 2026: 98 });
assert.equal(decisions.rows.filter((r) => r.systemId).length, 293);
assert.equal(decisions.rows.filter((r) => r.decisionIssuedDate).length, 318);
for (const row of decisions.rows) {
  assert.match(row.caseNumber, /^\d{2}-\d{3,6}(?:-[A-Z]+)?$/);
  assert.match(row.date, /^20\d\d-\d\d-\d\d$/);
  assert.ok(row.date >= '2022-01-01' && row.date <= '2026-09-28');
  assert.match(row.sourceDocument, /^https:\/\/www\.michigan\.gov\/difs\//);
  if (row.systemId) {
    assert.match(row.systemId, /^\d{6,9}$/);
    assert.equal(row.identifierSourcePage, 1);
  }
}
assert.equal(exams.rows.length, 41);
assert.ok(exams.rows.every((r) => r.reportDate < '2022-01-01'));
assert.equal(audit.marketExamRowsWithExactNaicIdentity, 40);
assert.equal(audit.distinctExistingNaicIdentities, 37);
for (const key of ['canonicalCompanyEvidenceAttachments', 'agencyEvidenceAttachments', 'producerEvidenceAttachments', 'nameOnlyAttachments', 'netNewCanonicalOrganizations', 'graphWrites']) assert.equal(audit[key], 0);

for (const query of [
  'insurance company Michigan', 'insurer Michigan', 'insurance agency Michigan', 'insurance producer Michigan',
  'insurance agent Michigan', 'NAIC 10187 Michigan', 'NPN 1234567 Michigan', 'System ID 0108067 Michigan',
  'Michigan insurance enforcement', 'DIFS insurance order', 'insurance market conduct Michigan',
  'insurance examination Michigan', 'insurance complaints Michigan', 'Detroit insurance agency',
  'Grand Rapids insurance agency', 'Lansing insurance agency', 'Ann Arbor insurance agency',
]) {
  assert.equal(interpretInsuranceAskQuery(query).query.jurisdiction?.state, 'MI', query);
}
assert.deepEqual(interpretInsuranceAskQuery('NAIC 10187 Michigan').query.identifier, { type: 'naic_company_code', value: '10187' });
assert.deepEqual(interpretInsuranceAskQuery('NPN 1234567 Michigan').query.identifier, { type: 'npn', value: '1234567' });
assert.equal(interpretInsuranceAskQuery('NPN 1234567 Michigan').query.entityClass, undefined);
assert.equal(interpretInsuranceAskQuery('insurance agency NPN 1234567 Michigan').query.entityClass, 'agency');
assert.deepEqual(interpretInsuranceAskQuery('System ID 0108067 Michigan').query.identifier, { type: 'state_license', value: '0108067' });
for (const query of ['best insurer Michigan', 'safest agency Michigan', 'recommended insurance agent Michigan', 'top-rated insurer Michigan', 'highest-rated insurer Michigan', '#1 insurer Michigan', 'Trust Score insurance Michigan']) {
  assert.equal(interpretInsuranceAskQuery(query).query.coverageState, 'UNSUPPORTED', query);
}
assert.equal(normalizedPublishedStatePath('/MiChIgAn'), '/michigan');
assert.equal(normalizedPublishedStatePath('/michigan'), null);
assert.equal(normalizedPublishedStatePath('/michigan/detroit'), null);
assert.equal((sitemap.match(/'\/michigan'/g) ?? []).length, 1);
assert.match(page, /NOT_ACQUIRED/);
assert.doesNotMatch(page, /AggregateRating|ratingValue|Trust Score/);
console.log('MI-INS-001 publication, grains, decisions, identifiers, ranking, paths and graph safety: PASS');
