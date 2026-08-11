/**
 * Phase 4 DFS pipeline guards (no network / no raw files required).
 *   npx tsx scripts/check-phase4-dfs.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { classifyLoa, classifyLoas, capabilitiesToInsuranceTypes } from '../lib/dfs/loa';
import { matchLaunchCounty, FL_LAUNCH_COUNTIES } from '../lib/dfs/launch-counties';
import { normalizeDfsRow } from '../lib/dfs/normalize';
import {
  assertNotSeedPromotion,
  evaluatePromotionEligibility,
  candidateToTrustProbe,
  type DfsProducerRow,
} from '../lib/dfs/promote';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '../lib/insurance/trust/provider-trust-state';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');

// Schema migration present
const mig = join(root, 'supabase/migrations/20260811120000_florida_dfs_inventory.sql');
assert(existsSync(mig), 'missing DFS migration');
const sql = readFileSync(mig, 'utf8');
assert(sql.includes('dfs_license_raw'), 'migration missing dfs_license_raw');
assert(sql.includes('dfs_producers'), 'migration missing dfs_producers');
assert(sql.includes('dfs_provider_promotions'), 'migration missing promotions');
assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'migration missing RLS');

// Launch counties
assert(FL_LAUNCH_COUNTIES.length === 5, 'expected 5 launch counties');
assert(matchLaunchCounty('Dade')?.id === 'miami_dade', 'Dade → miami_dade');
assert(matchLaunchCounty('DUVAL COUNTY')?.id === 'duval', 'Duval match');
assert(matchLaunchCounty('Hillsborough')?.id === 'hillsborough', 'Hillsborough match');

// LOA — never medicare
assert(classifyLoa('Health') === 'health', 'health loa');
assert(classifyLoa('Life') === 'life', 'life loa');
const caps = classifyLoas(['Health', 'Life', 'Property & Casualty']);
assert(caps.includes('health') && caps.includes('life'), 'loa multi');
const types = capabilitiesToInsuranceTypes(caps);
assert(!types.includes('medicare' as never), 'DFS must not invent medicare type');

// Normalize
const good = normalizeDfsRow(
  {
    'License Number': 'L1234567',
    'Business Name': 'Example Insurance Agency LLC',
    County: 'Duval',
    City: 'Jacksonville',
    Status: 'Active',
    'License Type': 'Health; Life',
    Phone: '9045551212',
  },
  'business'
);
assert(!good.skipReason, `unexpected skip: ${good.skipReason}`);
assert(good.launchCountyId === 'duval', 'launch county on normalize');
assert(good.phone?.includes('904'), 'phone normalized');

const badLic = normalizeDfsRow(
  {
    'License Number': 'FL-DFS Active ✅',
    'Business Name': 'Bad',
    County: 'Duval',
  },
  'business'
);
assert(badLic.skipReason === 'missing_recheckable_license_number', 'emoji license rejected');

// Promotion eligibility
const producer: DfsProducerRow = {
  id: '11111111-1111-1111-1111-111111111111',
  entity_type: 'business',
  license_number: 'A9876543',
  npn: null,
  legal_name: 'Verified FL Agency LLC',
  display_name: 'Verified FL Agency LLC',
  license_status: 'active',
  lines_of_authority: ['Health'],
  city: 'Jacksonville',
  county: 'Duval',
  county_normalized: 'DUVAL',
  state: 'FL',
  zip: '32202',
  phone: '(904) 555-0100',
  email: 'ops@example.com',
  source_checked_at: new Date().toISOString(),
};

const ok = evaluatePromotionEligibility(producer);
assert(ok.ok === true, `expected eligible promote: ${!ok.ok ? ok.reason : ''}`);
if (ok.ok) {
  assert(ok.providerInsert.verified === true, 'insert verified flag');
  assert(ok.providerInsert.license_info.licenses[0].source === 'Florida DFS', 'regulator name');
  assert(
    ok.providerInsert.license_info.licenses[0].identityMatchAccepted === true,
    'identity match'
  );
  // email may be stored on contact but product v1 does not require featuring it
  assert(ok.providerInsert.contact.phone, 'phone public candidate');
}

// Seed cannot promote
let seedBlocked = false;
try {
  assertNotSeedPromotion('fallback-seed-1');
} catch {
  seedBlocked = true;
}
assert(seedBlocked, 'seed promotion blocked');

const seedProbe = candidateToTrustProbe(
  { ...producer, id: 'fallback-x' },
  { checkedAt: new Date().toISOString(), identityMatchAccepted: true }
);
// id with fallback prefix
seedProbe.id = 'fallback-x';
assert(
  !canShowAsVerified(resolveProviderTrustState(seedProbe)),
  'fallback id never verified'
);

// Incomplete missing source fails
const incomplete = candidateToTrustProbe(producer, {
  checkedAt: '',
  identityMatchAccepted: false,
});
incomplete.license_source = null;
incomplete.license_checked_at = null;
incomplete.license_identity_match_accepted = false;
incomplete.is_verified = false;
assert(
  resolveProviderTrustState(incomplete) !== 'verified',
  'incomplete never verified'
);

if (errors.length) {
  console.error('Phase 4 DFS checks FAILED:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}
console.log('Phase 4 DFS pipeline checks passed');
console.log('  launch counties:', FL_LAUNCH_COUNTIES.map((c) => c.displayName).join(', '));
console.log('  promotion gates + LOA + normalize OK');
