/**
 * FL-INS-006 Florida state intelligence tests.
 *   npm run check:fl-ins-006
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { TRUST_REPORT_VERSION } from '../lib/national/agency-trust-report';
import {
  APPOINTER_LIMITATION,
  CHOICES_SAFE_COPY,
  CITIZENS_MODULE_STATE,
  FL_STATE_INTEL_VERSION,
  NFIP_SAFE_COPY,
  appointmentIsInsurerIdentity,
  authorizedInCountyFromAppointment,
  cmsIsStateLicense,
  countyInferredFromAddress,
  credentialIsAppointment,
  licensedThroughoutFloridaFromLocation,
  liquidationIsMisconduct,
  mirPifIsQuality,
  missingRegulatoryIsClean,
  nameMatchingAllowed,
  premiumIsConsumerPrice,
  sourceRankIsTrusthubRank,
} from '../lib/national/fl-state-intel';
import {
  choicesPremiumIsQuote,
  citizensCountMayOmitDate,
  irfsFilingIsApproval,
  nfipRegistryIsCertification,
  surplusEligibilityIsAdmitted,
} from '../lib/national/fl-market-intelligence';
import { marketShareIsQuality, rankingsAllowed, marketIntelligenceChangesTrustScore } from '../lib/national/market-intelligence';
import { reviewRequiredCreatesCanonicalBridge } from '../lib/national/fl-appointer-bridge';

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
  'FL-INS-006-state-intelligence-contract.md',
  'FL-INS-006-denominator-dictionary.md',
  'FL-INS-006-profile-enrichment-contract.md',
  'FL-INS-006-methodology.md',
  'FL-INS-006-publication-safety.md',
];
for (const d of docs) assert(existsSync(join(root, 'docs/florida', d)), d);

assert(credentialIsAppointment() === false, '1 credential ≠ appointment');
assert(appointmentIsInsurerIdentity() === false, '2 appointment ≠ insurer');
assert(cmsIsStateLicense() === false, '3 CMS ≠ state license');
assert(mirPifIsQuality() === false && marketShareIsQuality() === false, '4 MIR ≠ quality');
assert(premiumIsConsumerPrice() === false, '5 premium ≠ price');
assert(sourceRankIsTrusthubRank() === false, '6 source rank');
assert(surplusEligibilityIsAdmitted() === false, '7 surplus ≠ admitted');
assert(choicesPremiumIsQuote() === false, '8 CHOICES ≠ quote');
assert(irfsFilingIsApproval() === false, '9 IRFS ≠ quality');
assert(citizensCountMayOmitDate() === false, '10 citizens dated');
assert(nfipRegistryIsCertification() === false, '11 NFIP ≠ certified');
assert(liquidationIsMisconduct() === false, '12 liquidation ≠ misconduct');
assert(missingRegulatoryIsClean() === false, '13 missing ≠ clean');
assert(reviewRequiredCreatesCanonicalBridge() === false, '14 appointer unresolved');
assert(countyInferredFromAddress() === false && authorizedInCountyFromAppointment() === false, '15 no county');
assert(nameMatchingAllowed() === false, '16 no name match');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, '17 people 0');
assert(mayPublishEntityKind('legal_insurer') === false, '18 legal 0');
assert(rankingsAllowed() === false && marketIntelligenceChangesTrustScore() === false, '19 no rank/score');
assert(TRUST_REPORT_VERSION === 'insurance-agency-trust-report-v1', '19b');
assert(licensedThroughoutFloridaFromLocation() === false, 'location');
assert(FL_STATE_INTEL_VERSION === 'insurance-fl-state-intel-v1', 'version');
assert(CITIZENS_MODULE_STATE === 'DATA_PENDING_CURRENT_OFFICIAL_SOURCE', 'citizens fail closed');
assert(CHOICES_SAFE_COPY.includes('sample premium'), 'choices copy');
assert(NFIP_SAFE_COPY.includes('Listed in FEMA/NFIP'), 'nfip copy');
assert(APPOINTER_LIMITATION.includes('do not currently provide a deterministic crosswalk'), 'limitation');

const snap = load('fl-ins-006-state-snapshot.json');
const pub = load('fl-ins-006-publication-regression.json');
const det = load('fl-ins-006-determinism.json');
const verd = load('fl-ins-006-verdict.json');
const mkt = load('fl-ins-006-market-census.json');
const apt = load('fl-ins-006-appointment-census.json');
const ins = load('fl-ins-006-insurer-census.json');
assert(snap.version === 'insurance-fl-state-intel-v1', 'snapshot version');
assert(snap.noCountyWork === true && snap.floridaRoutePublished === false, 'no county/route');
assert(pub.pass === true, '36 regression');
assert(pub.providers === 170499 && pub.agencies === 82071, 'locked counts');
assert(pub.persons === 1029860 && pub.legal_insurers === 6185, 'locked people/legal');
assert(pub.appointed_by === 2680 && pub.appointer_resolves_to_fl === 0, 'appointments');
assert(pub.bridges === 37515 && pub.market_observations === 1409, 'bridges/market');
assert(pub.public_people === 0 && pub.public_legal_insurers === 0, 'public 0');
assert(mkt.market_share_invented === false, 'no invented share');
assert(mkt.source_rank_is_not_trusthub_rank === true, 'rank');
assert(apt.FL_APPOINTER_RESOLVES_TO === 0, 'resolves 0');
assert(ins.public_legal_insurers === 0, 'insurer pages 0');
assert(ins.do_not_sum_overlapping_populations === true, '21 denom');
assert(det.pass === true, '20 snapshot deterministic');
assert(det.db_writes === 0, 'no writes');
assert(String(verd.status).includes('COMPLETE'), 'complete');
assert(verd.started_007 === false, 'no 007');

function sumVals(o: unknown): number {
  if (!o || typeof o !== 'object') return NaN;
  return Object.values(o as Record<string, unknown>).reduce((a, b) => a + Number(b), 0);
}
const agency = load('fl-ins-006-agency-census.json');
const person = load('fl-ins-006-person-census.json');
const cms = load('fl-ins-006-cms-census.json');
const sur = load('fl-ins-006-surplus-census.json');
const ready = load('fl-ins-006-profile-readiness.json');
const clocks = load('fl-ins-006-source-clocks.json');
const recon = snap.reconciliation as Record<string, unknown>;
assert(recon.pass === true, '21 denom recon');
assert(sumVals(agency.namespace) === agency.fl_credential_rows, 'agency ns sum');
assert(sumVals(person.namespace) === person.fl_credential_rows, 'person ns sum');
assert(Number(mkt.observations) + Number(sur.eligible_observations) === 1409, 'mir+fslso');
assert(
  Number(cms.attached) + Number(cms.unattached) + Number(cms.kind_conflict) === Number(cms.national_observations),
  'cms sum',
);
assert(Number(sur.exact_naic_attached) + Number(sur.unresolved) === Number(sur.eligible_observations), 'fslso sum');
assert(ready.READY_FOR_FL_CREDENTIAL_MODULE === 14834, 'cred ready');
assert(ready.READY_FOR_FL_APPOINTMENT_MODULE === 613, 'apt ready');
assert(ready.READY_FOR_CMS_MODULE === 0, 'cms ready 0');
assert(ready.READY_FOR_FL_MARKET_MODULE === 0, 'market ready 0');
assert(ready.READY_FOR_SURPLUS_MODULE === 0, 'surplus ready 0');
assert(ready.READY_FOR_FL_REGULATORY_MODULE === 0, 'reg ready 0');
assert(ready.NFIP_deterministic === 0, 'nfip ready 0');
assert(clocks.dfs_agency_credentials === 'source_observed_at_absent', 'agency clock absent');
assert(clocks.citizens === 'DATA_PENDING_CURRENT_OFFICIAL_SOURCE', 'citizens clock');
assert(snap.citizens && (snap.citizens as { stale_count_inserted: boolean }).stale_count_inserted === false, 'no stale citizens');

if (errors.length) {
  console.error('FL-INS-006 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-006 PASS state intelligence tests=21');
