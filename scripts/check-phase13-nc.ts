/**
 * Phase 13 North Carolina DOI guards.
 *   npm run check:phase13-nc
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { normalizeNcAgencyRow, mergeNcProducers } from '../lib/nc/normalize';
import { matchNcLaunchMarket } from '../lib/nc/launch-markets';
import { evaluateNcPromotionEligibility } from '../lib/nc/promote';
import { looksLikeIndividualEntity } from '../lib/nc/qualifications';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

must('supabase/migrations/20260815120000_north_carolina_doi_inventory.sql');
must('lib/nc/launch-markets.ts');
must('lib/nc/normalize.ts');
must('lib/nc/promote.ts');
must('lib/nc/qualifications.ts');
must('scripts/nc/import-agencies.ts');
must('scripts/nc/promote-launch-markets.ts');
must('scripts/nc/fixtures/nc-agencies-sample.csv');
must('docs/NORTH-CAROLINA-DOI-INVENTORY.md');

const sql = read('supabase/migrations/20260815120000_north_carolina_doi_inventory.sql');
if (!/nc_producers/.test(sql)) errors.push('migration missing nc_producers');
if (!/nc_provider_promotions/.test(sql)) errors.push('migration missing promotions');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');
if (!/entity_type = 'business'/.test(sql)) errors.push('producers must constrain business only');

const imp = read('scripts/nc/import-agencies.ts');
if (!/launch-markets-only/.test(imp)) errors.push('import must support launch-markets-only');
if (!/dry-run|dryRun/.test(imp)) errors.push('import must support dry-run');

const prom = read('scripts/nc/promote-launch-markets.ts');
if (!/--market|marketArg/.test(prom)) errors.push('promote must support --market');

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isNcLaunchHub|getNcHubInventory/.test(hub)) {
  errors.push('hub inventory must support North Carolina launch hubs');
}

const dir = read('app/directory/page.tsx');
if (!/ncTotal > 0/.test(dir) || !/state=NC&verified=true/.test(dir)) {
  errors.push('directory must gate NC chip on live verified count');
}

const pkg = read('package.json');
if (!/nc:import/.test(pkg) || !/nc:promote/.test(pkg)) {
  errors.push('package.json missing nc npm scripts');
}

if (looksLikeIndividualEntity('Individual')) {
  /* ok */
} else {
  errors.push('individual entity filter failed');
}

const charlotte = matchNcLaunchMarket({ city: 'Charlotte', zip: '28202' });
if (charlotte?.id !== 'charlotte') errors.push('charlotte city match failed');
const triangle = matchNcLaunchMarket({ county: 'Wake' });
if (triangle?.id !== 'triangle') errors.push('wake county match failed');
const durham = matchNcLaunchMarket({ county: 'Durham' });
if (durham?.id !== 'triangle') errors.push('durham county match failed');
const orange = matchNcLaunchMarket({ county: 'Orange' });
if (orange?.id !== 'triangle') errors.push('orange county match failed');
const gso = matchNcLaunchMarket({ city: 'Greensboro' });
if (gso?.id !== 'greensboro') errors.push('greensboro city match failed');
const ilm = matchNcLaunchMarket({ zip: '28401' });
if (ilm?.id !== 'wilmington') errors.push('wilmington zip match failed');

const fixtureRow = normalizeNcAgencyRow({
  'License Number': 'NC100001',
  NPN: '50000001',
  'Business Name': 'CHARLOTTE RESEARCH AGENCY LLC',
  'Entity Type': 'Business Entity',
  'License Type': 'Agency',
  'Line of Authority': 'Health',
  Status: 'Active',
  City: 'CHARLOTTE',
  County: 'MECKLENBURG',
  State: 'NC',
  Zip: '28202',
});
if (fixtureRow.skipReason) errors.push(`fixture normalize skipped: ${fixtureRow.skipReason}`);
if (fixtureRow.launchMarketId !== 'charlotte') {
  errors.push(`expected charlotte market, got ${fixtureRow.launchMarketId}`);
}

const individual = normalizeNcAgencyRow({
  'License Number': 'NC199999',
  'Business Name': 'SKIP ME',
  'Entity Type': 'Individual',
  State: 'NC',
  City: 'CHARLOTTE',
});
if (individual.skipReason !== 'individual_excluded') {
  errors.push('individual rows must be skipped');
}

const merged = mergeNcProducers([
  fixtureRow,
  normalizeNcAgencyRow({
    'License Number': 'NC100001',
    'Business Name': 'CHARLOTTE RESEARCH AGENCY LLC',
    'Entity Type': 'Business Entity',
    'Line of Authority': 'Life',
    City: 'CHARLOTTE',
    State: 'NC',
    Zip: '28202',
  }),
]);
if (!merged?.qualifications.includes('Health') || !merged.qualifications.includes('Life')) {
  errors.push('LOA merge failed');
}

const elig = evaluateNcPromotionEligibility({
  id: 'nc-test-1',
  entity_type: 'business',
  license_number: 'NC100001',
  npn: '50000001',
  legal_name: 'CHARLOTTE RESEARCH AGENCY LLC',
  display_name: 'CHARLOTTE RESEARCH AGENCY LLC',
  org_type: 'LLC',
  license_types: ['Agency'],
  qualifications: ['Health', 'Life'],
  license_status: 'active',
  issue_date: '2016-03-01',
  expiration_date: '2028-03-01',
  city: 'CHARLOTTE',
  county: 'MECKLENBURG',
  county_normalized: 'MECKLENBURG',
  state: 'NC',
  zip: '28202',
  launch_market_id: 'charlotte',
  source_checked_at: new Date().toISOString(),
});
if (!elig.ok) errors.push(`promote eligibility failed: ${'reason' in elig ? elig.reason : ''}`);
if (elig.ok && !elig.providerInsert.specialties.includes('Health')) {
  errors.push('promoted specialties missing Health');
}
if (elig.ok && elig.providerInsert.specialties.some((s) => /medicare/i.test(s))) {
  errors.push('must not invent Medicare specialty');
}

if (errors.length) {
  console.error('Phase 13 NC DOI checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 13 NC DOI checks passed');
