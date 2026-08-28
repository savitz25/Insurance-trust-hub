/**
 * FL-INS-005 Florida market intelligence tests.
 *   npm run check:fl-ins-005
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { TRUST_REPORT_VERSION } from '../lib/national/agency-trust-report';
import {
  aggregateRequiresEntity,
  agencyAddressIsMarketGeography,
  autoEqualsProperty,
  countyAppointmentIsServiceTerritory,
  decideMarketInsurerIdentity,
  decideMarketNpnIdentity,
  marketIntelligenceChangesTrustScore,
  marketShareIsQuality,
  medigapEqualsMedicareAdvantage,
  nameOnlyMarketAttach,
  premiumIsQuote,
  rankingsAllowed,
  rateFilingIsApproval,
  sampleRateIsActualPrice,
  sourceClocksMayCombine,
} from '../lib/national/market-intelligence';
import {
  CHOICES_SAFE_COPY,
  NFIP_SAFE_COPY,
  choicesPremiumIsQuote,
  citizensCountMayOmitDate,
  citizensIsGeneralLicensure,
  dfsCountyAppointmentIngestedHere,
  floodMarketsMayAggregate,
  irfsFilingIsApproval,
  nfipRegistryIsCertification,
  surplusEligibilityIsAdmitted,
  takeoutOfferIsCompletedAssumption,
} from '../lib/national/fl-market-intelligence';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}

const docs = [
  'FL-INS-005-market-intelligence-contract.md',
  'FL-INS-005-denominator-dictionary.md',
  'FL-INS-005-source-audit.md',
  'FL-INS-005-choices-semantics.md',
  'FL-INS-005-irfs-semantics.md',
  'FL-INS-005-citizens-semantics.md',
  'FL-INS-005-surplus-lines-semantics.md',
  'FL-INS-005-nfip-semantics.md',
  'FL-INS-005-SQL-EDITOR.md',
];
for (const d of docs) assert(existsSync(join(root, 'docs/florida', d)), d);

assert(marketShareIsQuality() === false, '1 market share ≠ quality');
assert(choicesPremiumIsQuote() === false && premiumIsQuote() === false && sampleRateIsActualPrice() === false, '2 CHOICES ≠ quote');
assert(irfsFilingIsApproval() === false && rateFilingIsApproval() === false, '3 IRFS ≠ approval');
assert(CHOICES_SAFE_COPY.includes('Sample premium'), 'choices copy');
assert(citizensIsGeneralLicensure() === false, '5 Citizens ≠ licensure');
assert(citizensCountMayOmitDate() === false, '6 Citizens dated');
assert(surplusEligibilityIsAdmitted() === false, '7 surplus ≠ admitted');
assert(nfipRegistryIsCertification() === false, '8 NFIP listed ≠ certified');
assert(NFIP_SAFE_COPY.includes('Listed in FEMA/NFIP'), 'nfip copy');

const spine = new Set(['12345']);
const flMap = new Map([['03047', '12345']]);
const ok = decideMarketInsurerIdentity({
  naicCoCode: '12345',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
});
assert(ok.attach === true, '9 exact NAIC');
const fl = decideMarketInsurerIdentity({
  flCompanyCode: '03047',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
});
assert(fl.attach === true, '9b FL code');
const npn = decideMarketNpnIdentity({ npn: '1234567', entityKind: 'agency', officialNpns: new Set(['1234567']) });
assert(npn.attach === true, '10 exact NPN');
const name = decideMarketInsurerIdentity({
  nameOnly: 'ACME INSURANCE',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
});
assert(name.attach === false && nameOnlyMarketAttach() === false, '11 no name attach');
assert(countyAppointmentIsServiceTerritory() === false, '12 county appt');
assert(dfsCountyAppointmentIngestedHere() === false, '12b');
assert(agencyAddressIsMarketGeography() === false, '13 address');
assert(sourceClocksMayCombine() === false, '14 clocks');
assert(autoEqualsProperty() === false, '16 auto/property');
assert(medigapEqualsMedicareAdvantage() === false, 'medigap');
assert(aggregateRequiresEntity() === false, '17 aggregate no fake entity');
assert(rankingsAllowed() === false, '18 no rankings');
assert(marketIntelligenceChangesTrustScore() === false, '19 no Trust Score');
assert(TRUST_REPORT_VERSION === 'insurance-agency-trust-report-v1', '19b');
assert(takeoutOfferIsCompletedAssumption() === false, 'takeout');
assert(floodMarketsMayAggregate() === false, 'flood boundary');
assert(mayPublishEntityKind('legal_insurer') === false, 'no insurer pages');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people');

const pub = load('fl-ins-005-publication-regression.json');
const recon = load('fl-ins-005-market-reconciliation.json');
const idem = load('fl-ins-005-idempotency.json');
const verd = load('fl-ins-005-verdict.json');
const mir = load('fl-ins-005-mir-census.json');
const nfip = load('fl-ins-005-nfip-census.json');
const irfs = load('fl-ins-005-irfs-census.json');
assert(pub.pass === true, '48 regression');
const after = pub.after as Record<string, unknown>;
assert(after.providers === 170499, 'providers');
assert(after.agencies === 82071, 'agencies');
assert(after.persons === 1029860, 'persons');
assert(after.legal_insurers === 6185, 'legal');
assert(after.appointed_by === 2680, 'appointed_by');
assert(after.fl_oir_company_code === 1897, 'oir ids');
assert(after.appointer_resolves_to_fl === 0, 'resolves 0');
assert(after.bridges === 37515, 'bridges');
assert(pub.rankings === false && pub.trust_score_changed === false, 'no rank/score');
assert(recon.WRONG_TARGET === 0 && recon.DUPLICATE === 0, 'recon');
assert(idem.pass === true, '20 idempotency');
assert(idem.second_run_inserts === 0, '20 second execute 0');
assert((idem.first_run_inserted as number) > 0, '20 first insert');
assert(Number(after.market_obs) > 0, '21 production observations');
assert(String(verd.status).includes('COMPLETE'), 'complete');
assert(verd.started_006 === false, 'no 006');
assert(nfip.exact_npn_attaches === 0, 'nfip npn 0');
assert(irfs.search_cap === 2500, 'irfs cap');
assert((mir.distinct_naic as number) === 162, 'mir 162 naic');
assert(choicesPremiumIsQuote() === false, 'choices not quote');
const cit = load('fl-ins-005-citizens-census.json');
assert(cit.dated_policy_count_official_extract == null, 'no stale citizens pif');
assert(cit.ingested === 0, 'citizens not ingested');

if (errors.length) {
  console.error('FL-INS-005 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-005 PASS market intelligence tests=21');
