/**
 * Phase 8 Texas TDI guards.
 *   npm run check:phase8-tdi
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

must('supabase/migrations/20260812200000_texas_tdi_inventory.sql');
must('lib/tdi/launch-markets.ts');
must('lib/tdi/normalize.ts');
must('lib/tdi/promote.ts');
must('lib/tdi/qualifications.ts');
must('scripts/tdi/import-agencies.ts');
must('scripts/tdi/promote-launch-markets.ts');
must('scripts/tdi/fixtures/tdi-agencies-sample.csv');
must('docs/TEXAS-TDI-INVENTORY.md');

const sql = read('supabase/migrations/20260812200000_texas_tdi_inventory.sql');
if (!/tdi_producers/.test(sql)) errors.push('migration missing tdi_producers');
if (!/tdi_provider_promotions/.test(sql)) errors.push('migration missing promotions');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');

const imp = read('scripts/tdi/import-agencies.ts');
if (!/launch-markets-only/.test(imp)) errors.push('import must support launch-markets-only');
if (!/dry-run|dryRun/.test(imp)) errors.push('import must support dry-run');

const prom = read('scripts/tdi/promote-launch-markets.ts');
if (!/--market|marketArg/.test(prom)) errors.push('promote must support --market');
if (!/entity_type.*business|business/.test(prom)) {
  // soft
}

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isTxLaunchHub|getTxHubInventory/.test(hub)) {
  errors.push('hub inventory must support Texas launch hubs');
}

const pkg = read('package.json');
if (!/tdi:import/.test(pkg) || !/tdi:promote/.test(pkg)) {
  errors.push('package.json missing tdi npm scripts');
}

if (errors.length) {
  console.error('Phase 8 TDI checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 8 TDI checks passed');
