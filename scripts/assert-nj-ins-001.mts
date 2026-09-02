import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260902140000_nj_ins_001_regulatory_ledger.sql', 'utf8');
const runner = readFileSync('scripts/nj-ins-001.py', 'utf8');
const exam = readFileSync('lib/national/legal-insurer-examination.ts', 'utf8');
const bail = readFileSync('lib/directory/bail-bond-publication.ts', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const pkg = readFileSync('package.json', 'utf8');

assert.match(runner, /NJ_DOBI_DOI_ENFORCEMENT/);
assert.match(runner, /NJ_DOBI_FINANCIAL_EXAMINATION/);
assert.match(runner, /NJ_DOBI_MARKET_CONDUCT_EXAMINATION/);
assert.match(runner, /copied_to_legal_entities/);
assert.match(runner, /internal_only/);
assert.doesNotMatch(runner, /fuzzy|levenshtein/i);
assert.match(exam, /NJ_DOBI_MARKET_CONDUCT_DATASET/);
assert.match(exam, /NJ_DOBI_FINANCIAL_DATASET/);
assert.match(exam, /EXAMINATION_NOT_ENFORCEMENT/);
assert.match(bail, /excludeFromConsumerDirectory/);
assert.match(migration, /force row level security/i);
assert.doesNotMatch(migration, /nj_dobi_orders|nj_insurers/);
assert.doesNotMatch(migration, /grant\s+select.*(?:anon|authenticated)/i);
assert.equal(existsSync('app/new-jersey'), false);
assert.doesNotMatch(sitemap, /['"]\/new-jersey['"]/);
assert.equal(existsSync('.vercel/project.json'), false);
assert.match(pkg, /assert:nj-ins-001/);
console.log('NJ-INS-001 assertions: PASS');
