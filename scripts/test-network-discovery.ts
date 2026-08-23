/**
 * Focused ASK-SEARCH-INSURANCE-001 discovery tests.
 * Run: npx tsx scripts/test-network-discovery.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CARRIER_REGISTRY } from '../lib/carriers/registry';
import { evaluateProviderEligibility } from '../lib/network-discovery/eligibility';
import { mapProviderEntityType } from '../lib/network-discovery/entity-type';
import {
  compareStability,
  fingerprintEntities,
} from '../lib/network-discovery/fingerprint';
import { fixtureLicense, fixtureProvider } from '../lib/network-discovery/fixtures';
import {
  extractLicensedStates,
  extractPhysicalLocation,
} from '../lib/network-discovery/geography';
import { buildCarrierIdentity, buildProviderIdentity } from '../lib/network-discovery/identity';
import { publishFromSnapshot, snapshotFromProviderRows } from '../lib/network-discovery/publish';
import {
  AMBIGUOUS_QUERY_POLICY,
  matchReasons,
  runQueryReadiness,
} from '../lib/network-discovery/query-readiness';
import { selectPilotCohort } from '../lib/network-discovery/select-pilot';
import {
  ASK_NETWORK_DISCOVERY_SCHEMA,
  FORBIDDEN_EXPORT_KEYS,
  MEDICARE_ENTITY_READINESS,
  PILOT_BANNER,
  type DiscoveryFeed,
} from '../lib/network-discovery/types';
import {
  validateCanonicalProfileUrl,
  providerProfileUrl,
} from '../lib/network-discovery/urls';
import { validateDiscoveryFeed } from '../lib/network-discovery/validate';

const failures: string[] = [];
function assert(cond: unknown, msg: string): void {
  if (!cond) failures.push(msg);
}

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, '0');
  return `aaaaaaaa-bbbb-4ccc-8ddd-${hex}`;
}

const miamiAgency = fixtureProvider({
  id: uuid(1),
  slug: 'coastal-miami-agency',
  name: 'Coastal Miami Agency',
  provider_type: 'brokerage',
  categories: ['homeowners', 'auto'],
  states_licensed: ['FL'],
  cities: ['Miami'],
  license_info: fixtureLicense('FL', 'L100001'),
  contact: {
    address: { street: '1 Biscayne', city: 'Miami', state: 'FL', zip: '33131' },
    county: 'Miami-Dade',
  },
});

const dallasAgency = fixtureProvider({
  id: uuid(2),
  slug: 'dallas-plain-agency',
  name: 'Dallas Plain Agency',
  provider_type: 'brokerage',
  categories: ['homeowners', 'auto'],
  states_licensed: ['TX'],
  cities: ['Dallas'],
  license_info: fixtureLicense('TX', 'T200002'),
  contact: {
    address: { street: '100 Main', city: 'Dallas', state: 'TX', zip: '75201' },
    county: 'Dallas',
  },
});

const txLicensedFlOffice = fixtureProvider({
  id: uuid(3),
  slug: 'houston-licensed-only-in-name',
  name: 'Statewide TX License Fl Office',
  provider_type: 'brokerage',
  categories: ['auto'],
  states_licensed: ['TX'],
  cities: ['Miami'],
  license_info: fixtureLicense('TX', 'T300003'),
  contact: {
    address: { street: '9 Ocean', city: 'Miami', state: 'FL', zip: '33101' },
    county: 'Miami-Dade',
  },
});

const indianaAgent = fixtureProvider({
  id: uuid(4),
  slug: 'indy-health-agent',
  name: 'Indy Health Agent',
  provider_type: 'independent_agent',
  categories: ['health', 'medicare'],
  states_licensed: ['IN'],
  cities: ['Indianapolis'],
  license_info: fixtureLicense('IN', 'I400004'),
  contact: {
    address: { street: '5 Meridian', city: 'Indianapolis', state: 'IN', zip: '46204' },
  },
});

const floodMiami = fixtureProvider({
  id: uuid(5),
  slug: 'miami-flood-shop',
  name: 'Miami Flood Shop',
  provider_type: 'specialist',
  categories: ['flood', 'homeowners'],
  states_licensed: ['FL'],
  cities: ['Miami'],
  license_info: fixtureLicense('FL', 'L500005'),
  contact: {
    address: { street: '2 Brickell', city: 'Miami', state: 'FL', zip: '33131' },
  },
});

const EXTRA_STATES = ['FL', 'TX', 'IN', 'OH', 'NC', 'NV', 'MA', 'VT', 'MS', 'NJ'] as const;
const extraProviders = Array.from({ length: 120 }, (_, idx) => {
  const i = idx + 10;
  const st = EXTRA_STATES[i % EXTRA_STATES.length];
  const dallas = st === 'TX' && i % 11 === 0;
  return fixtureProvider({
    id: uuid(i),
    slug: `agency-${st.toLowerCase()}-${i}`,
    name: `Agency ${st} ${i}`,
    provider_type: i % 7 === 0 ? 'independent_agent' : 'brokerage',
    categories: i % 5 === 0 ? ['auto'] : ['homeowners', 'auto'],
    states_licensed: [st],
    cities: [dallas ? 'Dallas' : 'Town'],
    license_info: fixtureLicense(st, `N${100000 + i}`),
    contact: {
      address: {
        street: '1 Main',
        city: dallas ? 'Dallas' : 'Town',
        state: st,
        zip: '00000',
      },
    },
  });
});

const seedRow = fixtureProvider({
  id: 'fallback-seed-1',
  slug: 'seed-agency',
  name: 'Seed Agency',
  provider_type: 'brokerage',
});

const unverified = fixtureProvider({
  id: uuid(9),
  slug: 'pending-agency',
  name: 'Pending Agency',
  provider_type: 'brokerage',
  verified: false,
});

// --- identity ---
const doi = buildProviderIdentity({
  id: uuid(1),
  licenseNumber: 'L100001',
  licenseState: 'FL',
});
assert(doi?.network_id === 'insurance:doi:FL:L100001', 'stable DOI identity');
assert(doi?.identity_kind === 'doi_license', 'DOI identity kind');

const npn = buildProviderIdentity({
  id: uuid(1),
  licenseNumber: 'L100001',
  licenseState: 'FL',
  npn: '1234567',
});
assert(npn?.network_id === 'insurance:npn:1234567', 'NPN preferred over DOI');

const named = buildProviderIdentity({
  id: 'not-a-uuid',
  licenseNumber: null,
  licenseState: null,
});
assert(named === null, 'no name-only identity');

assert(
  buildCarrierIdentity('florida-blue').network_id === 'insurance:carrier:florida-blue',
  'carrier slug identity'
);

// --- entity types ---
assert(mapProviderEntityType('brokerage') === 'insurance_brokerage', 'brokerage mapping');
assert(mapProviderEntityType('independent_agent') === 'insurance_agent', 'agent mapping');
assert(mapProviderEntityType('specialist') === 'insurance_agency', 'specialist mapping');
assert(MEDICARE_ENTITY_READINESS === 'UNSUPPORTED', 'medicare entity class unsupported');

const agentElig = evaluateProviderEligibility(indianaAgent);
assert(agentElig.entity?.entity_type === 'insurance_agent', 'agent entity type preserved');
assert(agentElig.entity?.medicare_entity_class === false, 'medicare category is not entity class');
assert(agentElig.entity?.medicare_category === true, 'medicare category flag from categories[]');

const brokerageElig = evaluateProviderEligibility(miamiAgency);
assert(brokerageElig.entity?.entity_type === 'insurance_brokerage', 'brokerage distinction');

// --- geography ---
const phys = extractPhysicalLocation({
  addressCity: 'Dallas',
  addressState: 'TX',
  addressZip: '75201',
  cities: ['Austin'],
});
assert(phys.city === 'Dallas', 'physical city from address');
assert(phys.state === 'TX', 'physical state from address');

const licensedOnly = extractPhysicalLocation({
  addressCity: undefined,
  addressState: undefined,
  cities: ['Florida'],
});
assert(licensedOnly.city === null, 'state-name city rejected');
assert(licensedOnly.state === null, 'licensed state not copied into physical');

const licensed = extractLicensedStates({
  statesLicensed: ['TX', 'tx', 'ZZ'],
  licenseState: 'TX',
});
assert(licensed.states.join(',') === 'TX', 'licensed states normalized');

const dallasHit = matchReasons(evaluateProviderEligibility(dallasAgency).entity!, {
  entityTypes: ['agency_like'],
  physicalCity: 'Dallas',
  physicalState: 'TX',
  requirePhysicalCity: true,
});
assert(dallasHit?.includes('physical_city'), 'Dallas physical city match');

const notDallas = matchReasons(evaluateProviderEligibility(txLicensedFlOffice).entity!, {
  entityTypes: ['agency_like'],
  physicalCity: 'Dallas',
  physicalState: 'TX',
  requirePhysicalCity: true,
});
assert(notDallas === null, 'TX license is not a Dallas office');

const txAuto = matchReasons(evaluateProviderEligibility(txLicensedFlOffice).entity!, {
  entityTypes: ['agency_like'],
  category: 'auto',
  licensedState: 'TX',
});
assert(txAuto?.includes('licensed_service_state'), 'TX licensed service state');
assert(!txAuto?.includes('physical_state'), 'physical FL office not claimed as TX');

// --- categories ---
const flood = evaluateProviderEligibility(floodMiami).entity!;
assert(flood.categories.includes('flood'), 'explicit flood category');
const homeownersOnly = evaluateProviderEligibility(miamiAgency).entity!;
assert(!homeownersOnly.categories.includes('flood'), 'flood not inferred from homeowners');

// --- medicare readiness ---
const medicareQuery = runQueryReadiness([
  evaluateProviderEligibility(indianaAgent).entity!,
]);
const med = medicareQuery.find((q) => q.query === 'Medicare agents Indiana');
assert(med?.match_count === 0, 'no fabricated medicare_agent matches');

// --- canonical URLs ---
const okUrl = validateCanonicalProfileUrl(providerProfileUrl('coastal-miami-agency'), 'provider');
assert(okUrl.ok, 'canonical provider URL accepted');
assert(!validateCanonicalProfileUrl('http://www.insurancetrusthub.com/providers/x').ok, 'HTTP rejected');
assert(!validateCanonicalProfileUrl('https://localhost:3000/providers/x').ok, 'localhost rejected');
assert(!validateCanonicalProfileUrl('https://foo.vercel.app/providers/x').ok, 'Vercel host rejected');
assert(!validateCanonicalProfileUrl('https://www.movetrusthub.com/providers/x').ok, 'wrong hub rejected');
assert(!validateCanonicalProfileUrl('https://www.insurancetrusthub.com/providers/').ok, 'malformed path rejected');
assert(!validateCanonicalProfileUrl('https://www.insurancetrusthub.com/directory/x').ok, 'non-profile path rejected');

// --- eligibility fail-closed ---
assert(!evaluateProviderEligibility(seedRow).eligible, 'seed ineligible');
assert(!evaluateProviderEligibility(unverified).eligible, 'unverified ineligible');
assert(evaluateProviderEligibility(miamiAgency).eligible, 'verified Miami agency eligible');

// --- forbidden fields ---
const snapshot = snapshotFromProviderRows([
  miamiAgency,
  dallasAgency,
  txLicensedFlOffice,
  indianaAgent,
  floodMiami,
  ...extraProviders,
]);
const published = publishFromSnapshot(snapshot, {
  generatedAt: '2026-08-22T00:00:00.000Z',
  sourceVersion: 'test',
  target: 180,
});
const blob = JSON.stringify(published.feed);
for (const key of FORBIDDEN_EXPORT_KEYS) {
  const re = new RegExp(`"${key}"\\s*:`, 'i');
  assert(!re.test(blob), `forbidden field ${key} absent from feed`);
}
assert(!blob.toLowerCase().includes('trust_score'), 'no trust score');
assert(!blob.toLowerCase().includes('paid_boost'), 'no ranking boost');

// --- deterministic cohort + fingerprint ---
const again = publishFromSnapshot(snapshot, {
  generatedAt: '2026-08-22T12:00:00.000Z',
  sourceVersion: 'test',
  target: 180,
});
const stability = compareStability(published.feed, again.feed);
assert(stability.membership_drift === 0, 'membership drift 0');
assert(stability.identity_drift === 0, 'identity drift 0');
assert(stability.content_fingerprint_drift === 0, 'content fingerprint drift 0');
assert(
  published.feed.fingerprint === fingerprintEntities(published.feed.entities),
  'fingerprint matches canonical entities'
);

const cohortA = selectPilotCohort(published.feed.entities, 10).map((e) => e.network_id).join('|');
const cohortB = selectPilotCohort(published.feed.entities, 10).map((e) => e.network_id).join('|');
assert(cohortA === cohortB, 'deterministic cohort');

assert(published.feed.schema_version === ASK_NETWORK_DISCOVERY_SCHEMA, 'schema version');
assert(published.feed.hub === 'insurance', 'hub insurance');
assert(published.feed.banner === PILOT_BANNER, 'pilot banner');
assert(published.medicare_readiness === 'UNSUPPORTED', 'medicare readiness');
assert(validateDiscoveryFeed(published.feed).length === 0, 'fixture feed validates');

// --- query readiness on fixture cohort ---
const queries = runQueryReadiness(published.feed.entities);
const byQ = Object.fromEntries(queries.map((q) => [q.query, q]));
assert(byQ['Medicare agents Indiana'].match_count === 0, 'Medicare agents Indiana: 0');
assert(byQ['homeowners insurance agencies Miami FL'].match_count >= 1, 'Miami homeowners actual match');
assert(
  byQ['homeowners insurance agencies Miami FL'].matches[0].reasons.includes('physical_city'),
  'Miami match cites physical_city'
);
assert(byQ['auto insurance agencies Texas'].match_count >= 1, 'auto TX actual match');
assert(byQ['insurance agencies Dallas TX'].match_count >= 1, 'Dallas TX actual match');
assert(byQ['insurance agencies Dallas TX'].matches.every((m) => m.reasons.includes('physical_city')), 'Dallas is physical');
assert(byQ['insurance carriers Florida'].match_count === 0, 'no fabricated FL carrier geo');
assert(byQ['flood insurance agencies Miami'].match_count >= 1, 'flood Miami actual match');
assert(AMBIGUOUS_QUERY_POLICY.includes('insurance company near me'), 'ambiguity rule documented');

// Carriers in fixture publish come from registry; none have FL physical/licensed geo.
assert(
  published.feed.entities.some((e) => e.entity_type === 'insurance_carrier'),
  'carriers included from registry'
);
assert(
  published.feed.entities.every((e) => e.entity_type !== 'medicare_agent'),
  'no medicare_agent rows'
);

// --- committed artifact (if present) ---
const feedPath = resolve(process.cwd(), 'data/network-discovery/insurance-discovery-pilot.v1.json');
if (existsSync(feedPath)) {
  const feed = JSON.parse(readFileSync(feedPath, 'utf8')) as DiscoveryFeed;
  const issues = validateDiscoveryFeed(feed);
  assert(issues.length === 0, `committed feed validates: ${issues[0]?.message ?? ''}`);
  assert(feed.hub === 'insurance', 'committed hub');
  assert(feed.banner === PILOT_BANNER, 'committed banner');
  assert(feed.entity_count === feed.entities.length, 'committed count');
  assert(feed.fingerprint === fingerprintEntities(feed.entities), 'committed fingerprint');
  const hosts = feed.entities.map((e) => new URL(e.profile_url).host);
  assert(hosts.every((h) => h === 'www.insurancetrusthub.com'), 'committed canonical host');
}

if (failures.length) {
  console.error('network-discovery tests failed:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log(
  `network-discovery tests passed (${CARRIER_REGISTRY.length} curated carriers in registry).`
);
