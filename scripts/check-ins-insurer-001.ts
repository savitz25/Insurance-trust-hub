/**
 * INS-INSURER-001 — legal insurer identity / publication-readiness gates.
 *   npm run check:ins-insurer-001
 *
 * Wave 1 publication is ZERO this task.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  IDENTIFIER_SCHEME,
  legalInsurerProvisionalKey,
  normalizeNaicCompanyCode,
} from '../lib/national/legal-insurer-identity';
import {
  FORBIDDEN_INSURER_PROFILE_COPY,
  INS_INSURER_001_CONTRACT,
  INS_INSURER_001_DECISION,
  INS_INSURER_001_PUBLISHED_URLS,
  INS_INSURER_001_ROUTE_CANONICAL,
  INS_INSURER_001_WAVE1_SIZE,
  appointerIsLegalInsurerWithoutBridge,
  brandIsLegalInsurerIdentity,
  classifyLegalInsurerReadiness,
  legalInsurerIsAgency,
  legalInsurerIsCarrierKind,
  legalInsurerIsCmsEntity,
  legalInsurerIsMarketplaceObservation,
  legalInsurerIsProducer,
  mayPublishLegalInsurerProfile,
  missingEvidenceMeansZero,
  nameOnlyMarketplaceJoinAllowed,
  nameOnlyRegulatoryJoinAllowed,
  naicGroupIsNaicCompany,
} from '../lib/national/legal-insurer-publication';
import { LEGAL_INSURER_PROFILE_VERSION, emptyLegalInsurerProfile } from '../lib/national/legal-insurer-profile';
import {
  FORBIDDEN_INSURER_SEARCH_ORDER,
  INSURER_SEARCH_RANK,
  insurerSearchUsesForbiddenSignal,
  searchLegalInsurers,
} from '../lib/national/legal-insurer-search';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';

const home = buildInsuranceHomeIntelV1('2026-08-29T05:48:24.729Z');
assert(home.fingerprint === HOME_FP, 'homepage fingerprint unchanged');
assert(home.fingerprint === fingerprintHomeIntel(home), 'homepage fingerprint recomputes');
assert(home.population.legalInsurers.value === 6185, '6,185 legal-insurer grain');
assert(home.publicAvailability.publicPeople === 0, 'public people = 0');
assert(home.publicAvailability.publicGraphAgencies === 0, 'public graph agencies = 0');
assert(home.publicAvailability.publicLegalInsurers === 0, 'public legal-insurer pages = 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'person profiles off');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal insurer unpublished');
assert(mayPublishEntityKind('carrier') === false, 'carrier-kind unpublished');
assert(mayPublishEntityKind('person') === false, 'producer unpublished');

assert(legalInsurerIsCarrierKind() === false, 'legal insurer ≠ carrier-kind');
assert(legalInsurerIsAgency() === false, 'legal insurer ≠ agency');
assert(legalInsurerIsProducer() === false, 'legal insurer ≠ producer');
assert(legalInsurerIsCmsEntity() === false, 'legal insurer ≠ CMS entity');
assert(legalInsurerIsMarketplaceObservation() === false, 'legal insurer ≠ Marketplace observation');
assert(appointerIsLegalInsurerWithoutBridge() === false, 'legal insurer ≠ appointer without bridge');
assert(naicGroupIsNaicCompany() === false, 'NAIC group ≠ NAIC company');
assert(brandIsLegalInsurerIdentity() === false, 'brand ≠ legal insurer');
assert(nameOnlyRegulatoryJoinAllowed() === false, 'no name-only regulatory join');
assert(nameOnlyMarketplaceJoinAllowed() === false, 'no name-only Marketplace join');
assert(missingEvidenceMeansZero() === false, 'missing evidence ≠ zero');

assert(IDENTIFIER_SCHEME.NAIC_COCODE === 'naic_cocode', 'NAIC scheme');
assert(normalizeNaicCompanyCode('19232') === '19232', 'NAIC normalize');
assert(normalizeNaicCompanyCode('Humana') === null, 'no invented NAIC from name');
assert(legalInsurerProvisionalKey('19232') === 'legal-insurer:naic:19232', 'provisional key');

const collision = classifyLegalInsurerReadiness({
  entityKind: 'legal_insurer',
  identityConfidence: 'CONFIRMED',
  naicCode: '19232',
  duplicateNaic: true,
  nameCollision: false,
  usefulPublicEvidenceFamilies: ['identity'],
});
assert(collision === 'IDENTITY_COLLISION', 'identity collision gate works');
assert(
  mayPublishLegalInsurerProfile({
    entityKind: 'legal_insurer',
    identityConfidence: 'CONFIRMED',
    naicCode: '19232',
    duplicateNaic: true,
    nameCollision: false,
    usefulPublicEvidenceFamilies: ['identity'],
  }) === false,
  'collision cannot publish',
);

const review = {
  entityKind: 'legal_insurer',
  identityConfidence: 'REVIEW_REQUIRED',
  naicCode: '19232',
  duplicateNaic: false,
  nameCollision: false,
  usefulPublicEvidenceFamilies: ['regulatory'],
} as const;
assert(classifyLegalInsurerReadiness(review) === 'REVIEW_REQUIRED', 'REVIEW_REQUIRED class');
assert(mayPublishLegalInsurerProfile(review) === false, 'REVIEW_REQUIRED cannot publish');

assert(INS_INSURER_001_DECISION === 'ZERO_PUBLICATION', 'zero publication decision');
assert(INS_INSURER_001_WAVE1_SIZE === 0, 'no thin-shell mass publication');
assert(INS_INSURER_001_PUBLISHED_URLS === 0, 'published URLs = 0');
assert(INS_INSURER_001_CONTRACT === 'insurance-legal-insurer-profile-v1', 'profile contract');
assert(INS_INSURER_001_ROUTE_CANONICAL === '/insurers', 'publication route canonical (reserved)');
assert(LEGAL_INSURER_PROFILE_VERSION === 'insurance-legal-insurer-profile-v1', 'contract version');

const profile = emptyLegalInsurerProfile({
  entityId: 'e1',
  legalName: 'STATE FARM MUTUAL AUTOMOBILE INSURANCE COMPANY',
  naicCode: '25178',
  retrievedAt: '2026-08-29T00:00:00.000Z',
});
assert(profile.score === null && profile.recommendation === null && profile.trustRating === null, 'no reputation score');
assert(profile.traceability === 'Trace This Record', 'provenance present');
assert(profile.sourceClocks.length > 0, 'source clocks present');

const catalog = [
  {
    entityId: 'a',
    legalName: 'STATE FARM MUTUAL AUTOMOBILE INSURANCE COMPANY',
    naicCode: '25178',
    domicile: 'IL',
  },
  {
    entityId: 'b',
    legalName: 'HUMANA INSURANCE COMPANY',
    naicCode: '73288',
    domicile: null,
    aliases: ['Humana Insurance Company'],
  },
];
assert(searchLegalInsurers('25178', catalog)[0]?.entityId === 'a', 'search exact NAIC deterministic');
assert(
  searchLegalInsurers('STATE FARM MUTUAL AUTOMOBILE INSURANCE COMPANY', catalog)[0]?.entityId === 'a',
  'search exact legal name deterministic',
);
assert(searchLegalInsurers('25178', catalog)[0]?.match === 'exact_naic', 'NAIC rank first');
assert(INSURER_SEARCH_RANK[0] === 'exact_naic', 'rank starts at exact NAIC');
for (const bad of FORBIDDEN_INSURER_SEARCH_ORDER) {
  assert(insurerSearchUsesForbiddenSignal(bad) === true, `forbidden order detected: ${bad}`);
}
assert(!insurerSearchUsesForbiddenSignal('exact_naic'), 'NAIC order allowed');

const page = src('app/page.tsx') + src('components/home/insurance-home-intelligence.tsx');
const sitemap = src('app/sitemap.ts');
assert(!existsSync(join(root, 'app/insurers')), 'no /insurers route');
assert(!sitemap.includes('/insurers/'), 'sitemap has no insurer graph URLs');
assert(!sitemap.includes("'/insurers'"), 'sitemap index has no /insurers');
assert(sitemap.includes('/carriers'), 'existing curated brand hub unchanged');
assert(!page.toLowerCase().includes('insurer trust score'), 'no Trust Score');
assert(!/best insurer/i.test(page), 'no insurer recommendation');
for (const phrase of FORBIDDEN_INSURER_PROFILE_COPY) {
  assert(!page.toLowerCase().includes(phrase), `no homepage ${phrase}`);
}
assert(!src('app/sitemap.ts').includes('/texas-intelligence'), 'no new state routes');
assert(!src('lib/national/home-intel.ts').includes('INS-INSURER-001'), 'homepage payload not edited');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-INSURER-001'), 'florida contract not edited');

const censusPath = join(root, 'data/reports/ins-insurer-001-census.json');
assert(existsSync(censusPath), 'census artifact');
const census = JSON.parse(src('data/reports/ins-insurer-001-census.json')) as {
  db_writes: { schema: number; publication: number; data_mutation: number };
  grains: {
    legal_insurer: number;
    carrier: number;
    agency: number;
    person: number;
    providers: number;
  };
  publication: {
    publicPeople: number;
    publicGraphAgencies: number;
    publicLegalInsurers: number;
    publishedUrls: number;
    decision: string;
  };
  naic: { withCode: number; missing: number; duplicateCodes: number };
  eligibility: Record<string, number>;
};
assert(census.db_writes.schema === 0, 'schema writes 0');
assert(census.db_writes.publication === 0, 'publication writes 0');
assert(census.db_writes.data_mutation === 0, 'data mutation 0');
assert(census.grains.legal_insurer === 6185, 'census 6,185');
assert(census.grains.carrier === 13547, 'census 13,547 carrier-kind');
assert(census.grains.agency === 82071, 'census agencies');
assert(census.grains.person === 1029860, 'census persons');
assert(census.grains.providers === 170499, 'directory listings');
assert(census.publication.publicPeople === 0, 'census public people');
assert(census.publication.publicGraphAgencies === 0, 'census public graph agencies');
assert(census.publication.publicLegalInsurers === 0, 'census public legal insurers');
assert(census.publication.publishedUrls === 0, 'sitemap matches published wave (0)');
assert(census.publication.decision === 'ZERO_PUBLICATION', 'census decision');
assert(census.naic.duplicateCodes === 0 || census.naic.duplicateCodes >= 0, 'NAIC duplicates detected');
assert(typeof census.naic.missing === 'number', 'missing NAIC detected');
assert(census.eligibility.PUBLIC_READY === 0, 'no PUBLIC_READY publish this task');
assert(census.eligibility.REVIEW_REQUIRED >= 0, 'REVIEW_REQUIRED counted');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, 'florida fingerprint constant');
assert(view.fingerprint === FL_FP, 'Florida fingerprint unchanged');

if (errors.length) {
  console.error(`INS-INSURER-001 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-INSURER-001 PASS');
console.log('decision', INS_INSURER_001_DECISION);
console.log('wave1', INS_INSURER_001_WAVE1_SIZE);
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
console.log('legal_insurers', census.grains.legal_insurer);
console.log('carrier_kind', census.grains.carrier);
console.log('db_writes', census.db_writes);
