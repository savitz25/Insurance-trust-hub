/**
 * Phase 9 New Jersey DOBI guards.
 *   npm run check:phase9-nj
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260813120000_new_jersey_dobi_inventory.sql');
must('lib/nj/launch-regions.ts');
must('lib/nj/normalize.ts');
must('lib/nj/promote.ts');
must('scripts/nj/import-agencies.ts');
must('scripts/nj/promote-launch-regions.ts');
must('scripts/nj/fixtures/nj-agencies-sample.csv');
must('docs/NEW-JERSEY-DOBI-INVENTORY.md');

const sql = read('supabase/migrations/20260813120000_new_jersey_dobi_inventory.sql');
if (!/nj_producers/.test(sql)) errors.push('migration missing nj_producers');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('RLS missing');

const regions = read('lib/nj/launch-regions.ts');
if (!/south_jersey|central_jersey|north_jersey/.test(regions)) {
  errors.push('launch regions incomplete');
}

const reg = read('lib/hubs/registry.ts');
if (!/south-new-jersey|central-new-jersey|north-new-jersey/.test(reg)) {
  errors.push('hub registry missing NJ regional hubs');
}

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isNjLaunchHub|getNjHubInventory/.test(hub)) {
  errors.push('hub inventory missing NJ path');
}

const pkg = read('package.json');
if (!/nj:import/.test(pkg) || !/nj:promote/.test(pkg)) {
  errors.push('package.json missing nj scripts');
}

if (errors.length) {
  console.error('Phase 9 NJ checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 9 NJ checks passed');
