import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260902180000_nj_ins_002_market_intelligence.sql', 'utf8');
const runner = readFileSync('scripts/nj-ins-002.py', 'utf8');
const exam = readFileSync('lib/national/legal-insurer-examination.ts', 'utf8');
const bail = readFileSync('lib/directory/bail-bond-publication.ts', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const pkg = readFileSync('package.json', 'utf8');

assert.match(runner, /NJ_IHC_ENROLLMENT/);
assert.match(runner, /NJ_SEH_ENROLLMENT/);
assert.match(runner, /NJ_GET_COVERED_PARTICIPATION/);
assert.match(runner, /PUBLIC_WITH_TERMS/);
assert.match(runner, /SOURCE_ACCESS_BLOCKED/);
assert.match(runner, /baseline_only/);
assert.match(runner, /internal_only/);
assert.doesNotMatch(runner, /fuzzy|levenshtein/i);
assert.match(exam, /NJ_DOBI_MARKET_CONDUCT_DATASET/);
assert.match(bail, /excludeFromConsumerDirectory/);
assert.match(migration, /force row level security/i);
assert.match(migration, /nj_crib_company_number/);
assert.doesNotMatch(migration, /create table nj_/i);
assert.doesNotMatch(migration, /grant\s+select.*(?:anon|authenticated)/i);
assert.equal(existsSync('app/new-jersey'), false);
assert.doesNotMatch(sitemap, /['"]\/new-jersey['"]/);
assert.equal(existsSync('.vercel/project.json'), false);
assert.match(pkg, /assert:nj-ins-002/);
console.log('NJ-INS-002 assertions: PASS');
