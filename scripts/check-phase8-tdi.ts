/**
 * Phase 8 / TX-2 Texas TDI guards.
 *   npm run check:phase8-tdi
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { matchTxLaunchMarket } from '../lib/tdi/launch-markets';
import {
  inferTxResidency,
  mergeTdiProducers,
  normalizeTdiAgencyRow,
} from '../lib/tdi/normalize';
import { evaluateTdiPromotionEligibility, type TdiProducerRow } from '../lib/tdi/promote';

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
must('docs/TX-2-DIRECTORY.md');

const sql = read('supabase/migrations/20260812200000_texas_tdi_inventory.sql');
if (!/tdi_producers/.test(sql)) errors.push('migration missing tdi_producers');
if (!/tdi_provider_promotions/.test(sql)) errors.push('migration missing promotions');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) errors.push('migration should enable RLS');

const imp = read('scripts/tdi/import-agencies.ts');
if (!/launch-markets-only/.test(imp)) errors.push('import must support launch-markets-only');
if (!/dry-run|dryRun/.test(imp)) errors.push('import must support dry-run');
if (!/confirm/.test(imp)) errors.push('import must require --confirm for writes');
if (/n\.state\s*!==\s*['"]TX['"]/.test(imp)) {
  errors.push('import must not skip non-TX HQ (TX-2 directory parity)');
}
if (!/tx2-statewide/.test(imp)) errors.push('import should tag statewide batches');

const prom = read('scripts/tdi/promote-launch-markets.ts');
if (!/--market|marketArg/.test(prom)) errors.push('promote must support --market');
if (!/directory-statewide/.test(prom)) errors.push('promote must support --scope directory-statewide');
if (!/Refusing to write without/.test(prom)) {
  errors.push('promote must refuse writes without --dry-run or --confirm');
}
if (!/entity_type.*business|business/.test(prom)) {
  // soft
}

const libPromote = read('lib/tdi/promote.ts');
if (/reason:\s*'not_texas'/.test(libPromote)) {
  errors.push('eligibility must not reject solely because HQ ≠ TX');
}

const hub = read('lib/dfs/providers-by-county.ts');
if (!/isTxLaunchHub|getTxHubInventory/.test(hub)) {
  errors.push('hub inventory must support Texas launch hubs');
}

const pkg = read('package.json');
if (!/tdi:import/.test(pkg) || !/tdi:promote/.test(pkg)) {
  errors.push('package.json missing tdi npm scripts');
}

const houston = matchTxLaunchMarket({ city: 'Houston', hqState: 'TX', zip: '77002' });
if (houston?.id !== 'houston') errors.push('Houston TX must map to houston');
const houstonCa = matchTxLaunchMarket({ city: 'Houston', hqState: 'CA', zip: '90744' });
if (houstonCa) errors.push('Houston CA must not receive a Texas hub');
const blankHq = matchTxLaunchMarket({ city: 'Dallas', zip: '75201' });
if (blankHq?.id !== 'dallas') {
  // omitted hqState still matches by city (callers must gate blank as not TX-address)
}

if (inferTxResidency('TX') !== 'resident') errors.push('TX HQ is resident');
if (inferTxResidency('NY') !== 'non_resident') errors.push('NY HQ is non-resident');
if (inferTxResidency('') !== null) errors.push('blank HQ is unknown, not non-resident');

const txRow = normalizeTdiAgencyRow({
  'License number': '2230547',
  Name: 'SECURRANTY, INC.',
  City: 'HOUSTON',
  State: 'TX',
  'Postal code': '77002',
  'License type': 'General Lines Agency',
  Qualification: 'Property and Casualty',
  'Expiration date': '2028-01-01',
});
if (txRow.skipReason) errors.push(`TX HQ skipped: ${txRow.skipReason}`);
if (txRow.state !== 'TX' || txRow.launchMarketId !== 'houston') {
  errors.push('TX Houston must persist TX + houston market');
}
if (txRow.residency !== 'resident') errors.push('TX HQ residency');

const nyRow = normalizeTdiAgencyRow({
  'License number': '2282655',
  Name: 'CHELSEA MORGAN SECURITIES INC',
  City: 'STATEN ISLAND',
  State: 'NY',
  'Postal code': '10307',
  'License type': 'Life Agency',
  Qualification: 'Life Agent/Agency',
  'Expiration date': '2028-01-01',
});
if (nyRow.skipReason) errors.push(`NY HQ skipped: ${nyRow.skipReason}`);
if (nyRow.state !== 'NY') errors.push('NY HQ state must persist');
if (nyRow.launchMarketId) errors.push('NY HQ must not receive a launch market');
if (nyRow.residency !== 'non_resident' || nyRow.homeAddressState !== 'NY') {
  errors.push('NY HQ must store non-resident + home office NY');
}

const caHouston = normalizeTdiAgencyRow({
  'License number': '8000002',
  Name: 'HOUSTON CA BROKER INC',
  City: 'HOUSTON',
  State: 'CA',
  'Postal code': '90744',
  'License type': 'General Lines Agency',
  Qualification: 'Property and Casualty',
  'Expiration date': '2028-01-01',
});
if (caHouston.skipReason) errors.push(`CA Houston skipped: ${caHouston.skipReason}`);
if (caHouston.launchMarketId) errors.push('Houston CA must not map to houston hub');
if (caHouston.state !== 'CA') errors.push('CA HQ state must persist');

const blank = normalizeTdiAgencyRow({
  'License number': '8000003',
  Name: 'BLANK STATE AGENCY LLC',
  City: 'DALLAS',
  State: '',
  'Postal code': '75201',
  'License type': 'Life Agency',
  'Expiration date': '2028-01-01',
});
if (blank.skipReason) errors.push(`blank HQ skipped: ${blank.skipReason}`);
if (blank.state !== '') errors.push('blank HQ must stay blank (not default TX)');
if (blank.residency !== null) errors.push('blank HQ is not non-resident proof');
if (blank.launchMarketId) {
  errors.push('blank HQ must not get a launch market (not TX-address proof)');
}

const merged = mergeTdiProducers([nyRow, { ...nyRow, qualifications: ['Annuity'] }]);
if (!merged || merged.state !== 'NY' || merged.launchMarketId) {
  errors.push('merge must keep NY HQ and no hub');
}

const baseProducer: TdiProducerRow = {
  id: '11111111-1111-1111-1111-111111111111',
  entity_type: 'business',
  license_number: '2230547',
  npn: null,
  legal_name: 'SECURRANTY, INC.',
  display_name: 'SECURRANTY, INC.',
  org_type: 'Corporation',
  license_types: ['General Lines Agency'],
  qualifications: ['Property and Casualty'],
  license_status: 'active',
  issue_date: '2015-01-01',
  expiration_date: '2028-01-01',
  city: 'HOUSTON',
  county: 'Harris',
  county_normalized: 'HARRIS',
  state: 'TX',
  zip: '77002',
  launch_market_id: 'houston',
  source_checked_at: new Date().toISOString(),
};

const txOk = evaluateTdiPromotionEligibility(baseProducer);
if (!txOk.ok) errors.push(`TX Houston promote failed: ${'reason' in txOk ? txOk.reason : ''}`);
if (txOk.ok) {
  if (txOk.marketId !== 'houston') errors.push('TX Houston marketId');
  if (txOk.providerInsert.states_licensed.join() !== 'TX') errors.push('TX license jurisdiction');
  if (txOk.providerInsert.contact.launch_market_id !== 'houston') {
    errors.push('hub promote must attach houston');
  }
}

const nrProducer: TdiProducerRow = {
  ...baseProducer,
  id: '22222222-2222-2222-2222-222222222222',
  license_number: '2282655',
  legal_name: 'CHELSEA MORGAN SECURITIES INC',
  display_name: 'CHELSEA MORGAN SECURITIES INC',
  city: 'STATEN ISLAND',
  county: null,
  county_normalized: null,
  state: 'NY',
  zip: '10307',
  launch_market_id: null,
};

const nrHub = evaluateTdiPromotionEligibility(nrProducer, { requireLaunchMarket: true });
if (nrHub.ok) errors.push('non-TX HQ must not be hub-eligible');
if (!nrHub.ok && nrHub.reason !== 'not_launch_market') {
  errors.push(`non-TX HQ hub reject should be not_launch_market, got ${nrHub.reason}`);
}

const nrDir = evaluateTdiPromotionEligibility(nrProducer, { requireLaunchMarket: false });
if (!nrDir.ok) {
  errors.push(`non-resident must promote to TX directory: ${'reason' in nrDir ? nrDir.reason : ''}`);
}
if (nrDir.ok) {
  if (nrDir.marketId !== 'statewide') errors.push('non-resident market is statewide');
  if (nrDir.providerInsert.states_licensed.join() !== 'TX') {
    errors.push('non-resident licensed only in TX');
  }
  if (nrDir.providerInsert.license_info.licenses.some((l) => l.state !== 'TX')) {
    errors.push('must not invent a home-state license row');
  }
  if (nrDir.providerInsert.contact.address?.state !== 'NY') {
    errors.push('public address.state must be HQ NY, not hardcoded TX');
  }
  if (nrDir.providerInsert.contact.residency !== 'non_resident') {
    errors.push('contact residency non_resident');
  }
  if (nrDir.providerInsert.contact.home_address_state !== 'NY') {
    errors.push('home office NY metadata');
  }
  if (nrDir.providerInsert.contact.launch_market_id) {
    errors.push('non-resident must not attach to a hub');
  }
  if (!/non-resident/i.test(nrDir.providerInsert.short_description || '')) {
    errors.push('short description should say TX-licensed (non-resident)');
  }
}

const blankProducer: TdiProducerRow = {
  ...baseProducer,
  id: '33333333-3333-3333-3333-333333333333',
  license_number: '8000003',
  legal_name: 'BLANK STATE AGENCY LLC',
  display_name: 'BLANK STATE AGENCY LLC',
  city: 'DALLAS',
  state: '',
  launch_market_id: null,
};
const blankDir = evaluateTdiPromotionEligibility(blankProducer, {
  requireLaunchMarket: false,
});
if (!blankDir.ok) {
  errors.push(`blank HQ should still directory-promote: ${'reason' in blankDir ? blankDir.reason : ''}`);
}
if (blankDir.ok) {
  if (blankDir.providerInsert.contact.residency === 'non_resident') {
    errors.push('blank HQ must not be labeled non-resident');
  }
  if (blankDir.providerInsert.contact.launch_market_id) {
    errors.push('blank HQ must not attach to a hub');
  }
}

const inactive = evaluateTdiPromotionEligibility(
  { ...nrProducer, license_status: 'inactive' },
  { requireLaunchMarket: false }
);
if (inactive.ok) errors.push('inactive license must fail closed');

const missingLic = evaluateTdiPromotionEligibility(
  { ...nrProducer, license_number: '' },
  { requireLaunchMarket: false }
);
if (missingLic.ok) errors.push('missing license must fail closed');

if (errors.length) {
  console.error('Phase 8 TDI checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 8 TDI checks passed');
