/**
 * ASK-SEARCH-INSURANCE-002 focused Ask handoff tests.
 * Run: npx tsx scripts/test-ask-handoff.ts
 */

import { evaluateDiscoveryLegitimacy } from '../lib/network-discovery/legitimacy';
import { fixtureLicense, fixtureProvider } from '../lib/network-discovery/fixtures';
import {
  parseInsuranceAskSearchContext,
  resolveAskHandoffDestination,
  serializeAskSearchContext,
  buildAskDirectoryHref,
  buildAskBackLabel,
  physicalCityMatches,
  isAgencyLikeAskEntity,
} from '../lib/ask-handoff';

const failures: string[] = [];
function assert(cond: unknown, msg: string): void {
  if (!cond) failures.push(msg);
  else console.log('PASS:', msg);
}

// --- parsing allowlist ---
assert(parseInsuranceAskSearchContext({}) === null, 'missing src=ask → null');
assert(parseInsuranceAskSearchContext({ src: 'move' }) === null, 'src≠ask → null');

const ok = parseInsuranceAskSearchContext({
  src: 'ask',
  entity: 'insurance_brokerage',
  category: 'auto',
  state: 'TX',
  city: 'Dallas',
  zip: '75201',
  journey: 'directory',
  sid: 'abc123',
  query: 'SHOULD_IGNORE',
  email: 'x@y.com',
  next: 'https://evil.com',
  redirect: '//evil.com',
});
assert(ok?.source === 'ask', 'src=ask accepted');
assert(ok?.entityType === 'insurance_brokerage', 'entity brokerage');
assert(ok?.category === 'auto', 'category auto');
assert(ok?.state === 'TX', 'state TX');
assert(ok?.city === 'dallas', 'city slugified');
assert(ok?.zip === '75201', 'zip ok');
assert(!(ok as { query?: string })?.query, 'forbidden query ignored');
assert(!serializeAskSearchContext(ok!).includes('evil'), 'no redirect leakage');
assert(!serializeAskSearchContext(ok!).includes('email'), 'no email leakage');

assert(
  parseInsuranceAskSearchContext({ src: 'ask', state: 'XX' })?.state === undefined,
  'invalid state dropped'
);
assert(
  parseInsuranceAskSearchContext({ src: 'ask', zip: 'abc' })?.zip === undefined,
  'invalid zip dropped'
);
assert(
  parseInsuranceAskSearchContext({ src: 'ask', entity: '<script>alert(1)</script>' })
    ?.unsupported === 'ambiguous_entity',
  'script entity → ambiguous unsupported'
);
assert(
  parseInsuranceAskSearchContext({ src: 'ask', city: '../../etc' })?.city === undefined,
  'path traversal city rejected'
);
assert(
  parseInsuranceAskSearchContext({ src: 'ask', category: 'medicare' })?.unsupported ===
    'medicare_agent',
  'medicare category unsupported'
);
assert(
  parseInsuranceAskSearchContext({ src: 'ask', entity: 'medicare_agent' })?.unsupported ===
    'medicare_agent',
  'medicare_agent unsupported'
);

// --- destination routing ---
const autoTx = resolveAskHandoffDestination(
  parseInsuranceAskSearchContext({
    src: 'ask',
    entity: 'insurance_brokerage',
    category: 'auto',
    state: 'TX',
  })!
);
assert(autoTx.kind === 'directory', 'auto TX → directory');
assert(autoTx.href.includes('/directory'), 'directory path');
assert(autoTx.href.includes('state=TX'), 'state preloaded');
assert(autoTx.href.includes('type=auto'), 'category→type');
assert(!autoTx.href.includes('q='), 'no free-text q');

const carriersFl = resolveAskHandoffDestination(
  parseInsuranceAskSearchContext({
    src: 'ask',
    entity: 'insurance_carrier',
    state: 'FL',
  })!
);
assert(carriersFl.kind === 'carriers', 'carrier → carriers hub');
assert(carriersFl.href.includes('/carriers'), 'carriers path');

const med = resolveAskHandoffDestination(
  parseInsuranceAskSearchContext({ src: 'ask', entity: 'medicare_agent', state: 'IN' })!
);
assert(med.kind === 'unsupported', 'medicare → unsupported');
assert(med.href.includes('medicare_agent'), 'medicare reason');

const ambiguous = resolveAskHandoffDestination(
  parseInsuranceAskSearchContext({ src: 'ask', entity: 'insurance_company' })!
);
assert(ambiguous.kind === 'unsupported', 'insurance_company not defaulted');

assert(isAgencyLikeAskEntity('insurance_agency'), 'agency-like agency');
assert(isAgencyLikeAskEntity('insurance_brokerage'), 'agency-like brokerage');
assert(!isAgencyLikeAskEntity('insurance_carrier'), 'carrier not agency-like');

// --- back label ---
const label = buildAskBackLabel({
  source: 'ask',
  entityType: 'insurance_brokerage',
  category: 'auto',
  state: 'TX',
});
assert(/auto insurance agencies/i.test(label), 'back label category+entity');
assert(/Texas/i.test(label), 'back label state');

const dallasLabel = buildAskBackLabel({
  source: 'ask',
  entityType: 'insurance_agency',
  state: 'TX',
  city: 'dallas',
});
assert(/Dallas/i.test(dallasLabel) && /Texas/i.test(dallasLabel), 'dallas back label');

// --- geography precision ---
assert(physicalCityMatches('Dallas', 'dallas'), 'city slug match');
assert(physicalCityMatches('MIAMI', 'miami'), 'city case match');
assert(!physicalCityMatches('Houston', 'dallas'), 'no false city');
assert(!physicalCityMatches('', 'dallas'), 'empty city fails');

// --- legitimacy regression (AutoNation) ---
const autoNation = fixtureProvider({
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000006',
  slug: 'abraham-chevrolet-miami-inc-dba-autonation-chevrolet-coral-g-a000425',
  name: 'ABRAHAM CHEVROLET - MIAMI INC DBA AUTONATION CHEVROLET CORAL GABLES',
  provider_type: 'brokerage',
  categories: ['auto', 'homeowners'],
  specialties: ['Agency', 'Independent Agency', 'Personal Lines'],
  license_info: {
    licenses: [
      {
        ...fixtureLicense('FL', 'A000425').licenses![0]!,
        type: 'AUTOMOBILE WARRANTY',
      },
    ],
  },
});
assert(
  !evaluateDiscoveryLegitimacy(autoNation).ok,
  'AutoNation remains legitimacy-excluded'
);

const legitAgency = fixtureProvider({
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001',
  slug: 'coastal-miami-agency',
  name: 'Coastal Miami Agency',
  provider_type: 'brokerage',
});
assert(evaluateDiscoveryLegitimacy(legitAgency).ok, 'legitimate agency still passes');

// --- directory href ---
const href = buildAskDirectoryHref({
  source: 'ask',
  entityType: 'insurance_brokerage',
  category: 'homeowners',
  state: 'FL',
  city: 'miami',
});
assert(href.startsWith('/directory?'), 'directory href');
assert(href.includes('type=homeowners'), 'homeowners type');
assert(href.includes('city=miami'), 'city param');
assert(!href.includes('type=medicare'), 'no medicare type widen');

if (failures.length) {
  console.error('ASK-SEARCH-INSURANCE-002 FAILED:\n' + failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
console.log('ASK-SEARCH-INSURANCE-002 Ask handoff assertions passed.');
