/**
 * Phase 1 trust-state regression guards.
 *   npx tsx scripts/check-phase1-trust-state.ts
 *   npm run check:phase1-trust
 */

import type { Provider } from '../types/provider';
import type { HubAgent } from '../types/agent';
import {
  VERIFIED_REQUIREMENTS,
  canShowAsVerified,
  countVerified,
  filterVerifiedProviders,
  resolveHubAgentTrustState,
  resolveProviderTrustState,
  trustStateFromListingClass,
} from '../lib/insurance/trust/provider-trust-state';

const errors: string[] = [];

function assert(cond: unknown, msg: string) {
  if (!cond) errors.push(msg);
}

// --- Fixtures ---

const seedProvider = {
  id: 'fallback-demo-1',
  slug: 'seed-agency',
  name: 'Seed Agency',
  city: 'Miami',
  state: 'FL',
  insurance_types: ['health'],
  specialties: [],
  rating: 0,
  review_count: 0,
  is_verified: true,
  license_number: '123456',
} as Provider;

const incompleteProvider = {
  id: 'real-agency-1',
  slug: 'incomplete-agency',
  name: 'Incomplete Agency',
  city: 'Tampa',
  state: 'FL',
  insurance_types: ['health'],
  specialties: [],
  rating: 0,
  review_count: 0,
  is_verified: false,
  license_number: 'A12345',
  license_state: 'FL',
} as Provider;

const verifiedProvider = {
  id: 'real-agency-verified',
  slug: 'verified-agency',
  name: 'Verified Agency LLC',
  city: 'Jacksonville',
  state: 'FL',
  insurance_types: ['health'],
  specialties: [],
  rating: 0,
  review_count: 0,
  is_verified: true,
  license_number: 'L987654',
  license_state: 'FL',
  license_source: 'Florida DFS',
  license_source_url: 'https://example.com/dfs',
  license_checked_at: new Date().toISOString(),
  license_identity_match_accepted: true,
} as Provider;

const emojiLicenseProvider = {
  ...verifiedProvider,
  id: 'emoji-license',
  slug: 'emoji-license',
  license_number: 'GA-OCI Active ✅',
} as Provider;

const hubSeedAgent = {
  id: 'jacksonville-agent-0',
  slug: 'generated-seed-jax',
  name: 'Generated Seed',
  city: 'Jacksonville',
  state: 'FL',
  agentType: 'independent_agency',
  insuranceTypes: ['health'],
  healthFocus: [],
  specialties: [],
  rating: 0,
  reviewCount: 0,
  shortDescription: 'seed',
  licenseNumber: '',
  trustScore: 0,
  localMarketExperience: 0,
  avgResponseHours: 0,
  bbbRating: '',
  isVerified: true,
  isHealthFeatured: true,
  isMedicareFeatured: false,
  isDiversePopulations: false,
  yearsInBusiness: 0,
} as HubAgent;

const hubPendingAgent = {
  id: 'siegel-insurance-atlanta',
  slug: 'siegel-insurance-inc-atlanta',
  name: 'Siegel Insurance Inc.',
  city: 'Atlanta',
  state: 'GA',
  agentType: 'independent_agency',
  insuranceTypes: ['auto'],
  healthFocus: [],
  specialties: [],
  rating: 4.9,
  reviewCount: 10,
  shortDescription: 'curated incomplete',
  licenseNumber: 'GA-OCI Active ✅',
  trustScore: 95,
  localMarketExperience: 90,
  avgResponseHours: 3,
  bbbRating: 'A+',
  isVerified: true,
  isHealthFeatured: false,
  isMedicareFeatured: false,
  isDiversePopulations: false,
  yearsInBusiness: 60,
} as HubAgent;

// --- Assertions ---

assert(VERIFIED_REQUIREMENTS.length >= 7, 'VERIFIED_REQUIREMENTS must document all gates');

assert(
  resolveProviderTrustState(seedProvider) === 'unavailable',
  'seed provider id must be unavailable (never verified)'
);
assert(
  !canShowAsVerified(resolveProviderTrustState(seedProvider)),
  'seed cannot show as verified'
);

assert(
  resolveProviderTrustState(incompleteProvider) === 'pending_verification',
  'incomplete real provider should be pending_verification'
);
assert(
  !canShowAsVerified(resolveProviderTrustState(incompleteProvider)),
  'incomplete cannot show as verified'
);

assert(
  resolveProviderTrustState(verifiedProvider) === 'verified',
  'full-gate provider must be verified'
);
assert(
  canShowAsVerified(resolveProviderTrustState(verifiedProvider)),
  'full-gate provider can show as verified'
);

assert(
  resolveProviderTrustState(emojiLicenseProvider) !== 'verified',
  'emoji/status license strings must never verify'
);

assert(
  resolveHubAgentTrustState(hubSeedAgent) === 'unavailable',
  'generated hub agent ids must be unavailable'
);
assert(
  resolveHubAgentTrustState(hubPendingAgent) !== 'verified',
  'curated hub agents without full provenance must never verify'
);

assert(
  countVerified([seedProvider, incompleteProvider, verifiedProvider, emojiLicenseProvider]) ===
    1,
  'countVerified must count only verified rows'
);
assert(
  filterVerifiedProviders([seedProvider, incompleteProvider, verifiedProvider]).length === 1,
  'filterVerifiedProviders must drop non-verified'
);

assert(
  countVerified([hubSeedAgent, hubPendingAgent] as HubAgent[]) === 0,
  'hub seed/pending must not increase verified count'
);

assert(
  trustStateFromListingClass('seed') === 'unavailable',
  'listing class seed maps to unavailable'
);
assert(
  trustStateFromListingClass('indexable_research') === 'verified',
  'listing class indexable_research maps to verified'
);
assert(
  trustStateFromListingClass('pending_verification') === 'pending_verification',
  'listing class pending maps to pending_verification'
);

assert(
  resolveProviderTrustState(null) === 'unavailable',
  'null record is unavailable'
);

if (errors.length) {
  console.error('Phase 1 trust-state checks FAILED:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}

console.log('Phase 1 trust-state checks passed');
console.log(`  verified requirements: ${VERIFIED_REQUIREMENTS.length}`);
console.log('  seed/illustrative cannot resolve to verified');
console.log('  countVerified ignores non-verified records');
