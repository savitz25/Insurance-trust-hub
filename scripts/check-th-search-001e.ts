import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { INSURANCE_SEARCH_GOLDEN_QUESTIONS } from '../lib/specialist-search/golden-questions';
import { INSURANCE_SEARCH_CAPABILITIES } from '../lib/specialist-search/capabilities';
import { SPECIALIST_SEARCH_ANALYTICS_EVENTS, SPECIALIST_SEARCH_VERSION } from '../lib/specialist-search/contract';

assert.equal(SPECIALIST_SEARCH_VERSION, 'trusthub-specialist-search-v1');
assert.equal(INSURANCE_SEARCH_GOLDEN_QUESTIONS.length, 100);
assert.equal(INSURANCE_SEARCH_GOLDEN_QUESTIONS.filter((q) => q.expected === 'FAIL').length, 0);
assert.deepEqual(SPECIALIST_SEARCH_ANALYTICS_EVENTS, ['specialist_search_submit','specialist_search_interpreted','specialist_search_results','specialist_search_zero_results','specialist_search_refine','specialist_search_trace_open','specialist_search_profile_open']);
assert.equal(INSURANCE_SEARCH_CAPABILITIES.find((c) => c.key === 'service_territory')?.supportState, 'UNSUPPORTED');
assert.equal(INSURANCE_SEARCH_CAPABILITIES.find((c) => c.key === 'tx_insurers')?.supportState, 'NOT_ACQUIRED');

const npn = interpretInsuranceAskQuery('NPN 10391484');
assert.equal(npn.query.identifier?.type, 'npn');
assert.equal(npn.query.entityClass, undefined, 'NPN digits must not guess person/agency class');
assert.equal(interpretInsuranceAskQuery('NAIC company code 12345').query.entityClass, 'insurer');
assert.equal(interpretInsuranceAskQuery('insurance agencies in ZIP 33441').query.mode, 'directory');
assert.equal(interpretInsuranceAskQuery('Does this agency serve Broward County?').query.coverageState, 'UNSUPPORTED');
assert.equal(interpretInsuranceAskQuery('best insurance company').query.mode, 'fail_closed');
assert.equal(interpretInsuranceAskQuery('agency with no complaints').query.mode, 'fail_closed');
assert.equal(interpretInsuranceAskQuery('licensed insurance companies in Texas').query.coverageState, 'NOT_ACQUIRED');
assert.ok(interpretInsuranceAskQuery('Florida agencies with Property and Casualty authority').query.linesOfAuthority?.length === 2);
assert.equal(interpretInsuranceAskQuery('Florida agencies with Property and Casualty authority').query.coverageState, 'PARTIAL');
assert.equal(interpretInsuranceAskQuery('What is an insurance appointment?').query.definitionId, 'appointment');

for (const question of INSURANCE_SEARCH_GOLDEN_QUESTIONS) {
  const parsed = interpretInsuranceAskQuery(question.query);
  assert.equal(parsed.raw, question.query, 'Preserve submitted text; do not truncate away conditions');
  if (question.query.length > 180) assert.equal(parsed.query.terminalState, 'INVALID_INPUT', 'Reject the full overlong request before execution');
  assert.ok(parsed.query.page >= 1 && parsed.query.page <= 200);
  assert.ok(parsed.interpretation.length > 0);
}

const root = process.cwd();
for (const file of ['docs/trusthub-specialist-search-v1.md','components/specialist-search/insurance-specialist-search-shell.tsx','components/ask-insurance-result.tsx','app/ask/page.tsx']) assert.ok(fs.existsSync(path.join(root, file)), `missing ${file}`);
const rendered = ['app/ask/page.tsx','components/ask-insurance-result.tsx','components/specialist-search/insurance-specialist-search-shell.tsx'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
assert.ok(fs.readFileSync(path.join(root, 'lib/insurance-ask/execute.ts'), 'utf8').includes("parsed.query.mode === 'fail_closed' ? 'UNSUPPORTED' : 'KNOWN'"), 'fail-closed results must not display KNOWN coverage');
for (const phrase of ['Research insurance','What do you want to find out?','Advanced filters','Why this matched','Trace this result']) assert.ok(rendered.includes(phrase), `missing shared anatomy: ${phrase}`);
assert.ok(!/track\([^\n]*queryText|rawQuery/.test(rendered), 'raw query must not enter analytics');

const counts = Object.fromEntries(['PASS','PARTIAL','UNSUPPORTED_SAFE','FAIL'].map((status) => [status, INSURANCE_SEARCH_GOLDEN_QUESTIONS.filter((q) => q.expected === status).length]));
console.log(JSON.stringify({ ticket: 'TH-SEARCH-001E', total: INSURANCE_SEARCH_GOLDEN_QUESTIONS.length, ...counts }, null, 2));
