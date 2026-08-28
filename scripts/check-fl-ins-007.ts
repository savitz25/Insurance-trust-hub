/**
 * FL-INS-007 Florida state intelligence page + publication gate.
 *   npm run check:fl-ins-007
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { TRUST_REPORT_VERSION } from '../lib/national/agency-trust-report';
import type { InsuranceAgencyTrustReportV1 } from '../lib/national/agency-trust-report';
import {
  APPOINTER_SAFE_COPY,
  CANONICAL_SNAPSHOT_FINGERPRINT,
  CITIZENS_MODULE_STATE,
  FL_STATE_INTEL_VERSION,
  FLORIDA_INDEXABLE,
  FLORIDA_PAGE_DESCRIPTION,
  FLORIDA_PAGE_TITLE,
  FLORIDA_ROUTE,
  FORBIDDEN_STATE_COPY,
  PROFILE_GATE,
  appointmentIsEmployment,
  appointmentIsInsurerIdentity,
  appointmentIsQuality,
  authorizedInCountyFromAppointment,
  cmsIsStateLicense,
  countyInferredFromAddress,
  credentialIsAppointment,
  displayModelContainsRankAsPif,
  formatUsd,
  liquidationIsMisconduct,
  mirPifIsQuality,
  mirRankFieldIsPif,
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
import {
  marketIntelligenceChangesTrustScore,
  rankingsAllowed,
} from '../lib/national/market-intelligence';
import { reviewRequiredCreatesCanonicalBridge } from '../lib/national/fl-appointer-bridge';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import {
  classifyFloridaProfileModules,
  isUnknownCredentialStatus,
  moduleRendersAppointment,
  moduleRendersCredential,
} from '../lib/national/fl-profile-modules';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}
const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const docs = [
  'FL-INS-007-final-publication-gate.md',
  'FL-INS-007-ui-contract.md',
  'FL-INS-007-profile-module-contract.md',
  'FL-INS-007-seo.md',
  'FL-INS-007-production-qa.md',
];
for (const d of docs) assert(existsSync(join(root, 'docs/florida', d)), d);

assert(existsSync(join(root, 'app/florida/page.tsx')), '/florida route');
assert(src('app/florida/page.tsx').includes('loadFloridaStateView'), 'consumes snapshot loader');
assert(!src('components/florida/florida-state-page.tsx').includes('56939'), 'no hardcoded 56939');
assert(!src('components/florida/florida-state-page.tsx').includes('13104'), 'no 13104 in page');
assert(!src('components/florida/florida-state-page.tsx').includes('unusedRankField'), 'rank field not rendered');

assert(credentialIsAppointment() === false, '1 credential ≠ appointment');
assert(appointmentIsEmployment() === false, '2 appointment ≠ employment');
assert(appointmentIsInsurerIdentity() === false, '3 appointment ≠ insurer');
assert(reviewRequiredCreatesCanonicalBridge() === false, '4 appointer 0');
assert(isUnknownCredentialStatus('unknown') === true, '5 unknown');
assert(isUnknownCredentialStatus('ACTIVE') === false, '5b');
assert(cmsIsStateLicense() === false, '6 CMS ≠ license');
assert(mirPifIsQuality() === false, '7 PIF ≠ quality');
assert(mirRankFieldIsPif() === false, '8 rank ≠ PIF');
assert(sourceRankIsTrusthubRank() === false, '9 source rank');
assert(premiumIsConsumerPrice() === false, '10 premium ≠ price');
assert(surplusEligibilityIsAdmitted() === false, '11 surplus ≠ admitted');
assert(choicesPremiumIsQuote() === false, '12 CHOICES ≠ quote');
assert(irfsFilingIsApproval() === false, '13 IRFS ≠ quality');
assert(citizensCountMayOmitDate() === false, '14 citizens dated');
assert(nfipRegistryIsCertification() === false, '15 NFIP ≠ cert');
assert(liquidationIsMisconduct() === false, '17 liquidation');
assert(missingRegulatoryIsClean() === false, '18 missing ≠ clean');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, '20 people 0');
assert(mayPublishEntityKind('person') === false, '20b');
assert(mayPublishEntityKind('legal_insurer') === false, '21 legal 0');
assert(countyInferredFromAddress() === false && authorizedInCountyFromAppointment() === false, '22 county');
assert(rankingsAllowed() === false && marketIntelligenceChangesTrustScore() === false, '23 ranks');
assert(appointmentIsQuality() === false, 'apt quality');
assert(TRUST_REPORT_VERSION === 'insurance-agency-trust-report-v1', 'trust report version');
assert(FLORIDA_ROUTE === '/florida', 'route');
assert(FLORIDA_INDEXABLE === true, 'indexable after gate');
assert(!/Best|Top |Safest|Most Trusted/i.test(FLORIDA_PAGE_TITLE), 'title');
assert(/licensing/i.test(FLORIDA_PAGE_DESCRIPTION) && /not rankings/i.test(FLORIDA_PAGE_DESCRIPTION), 'meta');

const snap = load('fl-ins-006-state-snapshot.json');
const ready = load('fl-ins-006-profile-readiness.json');
const pub006 = load('fl-ins-006-publication-regression.json');
const det = load('fl-ins-006-determinism.json');
const view = buildFloridaStateView(snap, ready);

assert(view.version === FL_STATE_INTEL_VERSION, 'snapshot version');
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT, '24 fingerprint lock');
assert(String(det.canonical_sha256) === CANONICAL_SNAPSHOT_FINGERPRINT, '24b det sha');
assert(det.pass === true, '24c det pass');

assert(view.agency.distinct === '56,939', '49 agencies');
assert(view.person.distinct === '691,126', '49 persons');
assert(view.oir.active === '3,972', '49 oir');
assert(view.oir.withNaic === '1,965', '49 naic');
assert(view.mir.insurers === '162', '49 mir');
assert(view.mir.pifPersonal === '7,606,205', '49 pif p');
assert(view.mir.pifCommercial === '29,073', '49 pif c');
assert(view.mir.pifTotal === '7,635,278', '49 pif t');
assert(view.mir.premiumTotal === '22,818,050,792.33', '45/49 premium');
assert(view.surplus.eligible === '275', '49 surplus');
assert(view.nfip.cards === '1,474', '49 nfip');
assert(view.regulatory.stored === '12', '49 liq');
assert(view.regulatory.marketConduct === '1,007', '49 mc');
assert(view.regulatory.financialExam === '1,060', '49 fe');
assert(view.regulatory.orders === '1,386', '49 orders');
assert(view.citizens.renderedCount === null, '14 no citizens count');
assert(view.citizens.state === CITIZENS_MODULE_STATE, 'citizens fail closed');
assert(view.appointment.resolvesTo === '0', 'appointer 0 display');
assert(view.appointment.limitation === APPOINTER_SAFE_COPY, 'appointer copy');
assert(view.regulatory.heading === 'Regulatory & Enforcement History', 'heading');

assert(
  displayModelContainsRankAsPif(view.mir.pifTotalNumeric, view.mir.unusedRankField) === false,
  '8 rank not PIF total',
);
assert(view.mir.pifTotal !== '13,104', '8 display');
assert(formatUsd(22818050792.32999) === '22,818,050,792.33', '45 ieee');
assert(formatUsd(22818050792.33) === '22,818,050,792.33', '45 cents');
assert(!view.mir.premiumTotal.includes('32999'), '45 no artifact');

const displayBlob = JSON.stringify({
  cards: view.cards,
  agency: view.agency,
  person: view.person,
  appointment: view.appointment,
  oir: view.oir,
  mir: {
    insurers: view.mir.insurers,
    pifPersonal: view.mir.pifPersonal,
    pifCommercial: view.mir.pifCommercial,
    pifTotal: view.mir.pifTotal,
    premiumTotal: view.mir.premiumTotal,
    premiumPersonal: view.mir.premiumPersonal,
    premiumCommercial: view.mir.premiumCommercial,
    exposure: view.mir.exposure,
  },
  surplus: view.surplus,
  cms: view.cms,
  nfip: view.nfip,
  regulatory: view.regulatory,
  clocks: view.clocks,
});
assert(!displayBlob.includes('13,104'), '8 rank absent from display blob');
for (const phrase of FORBIDDEN_STATE_COPY) {
  assert(!displayBlob.toLowerCase().includes(phrase.toLowerCase()), `forbidden ${phrase}`);
}

assert(pub006.providers === 170499 && pub006.agencies === 82071, '47 providers/agencies');
assert(pub006.persons === 1029860 && pub006.legal_insurers === 6185, '47 people/legal');
assert(pub006.appointed_by === 2680 && pub006.appointer_resolves_to_fl === 0, '47 apt');
assert(pub006.bridges === 37515 && pub006.market_observations === 1409, '47 market');
assert(pub006.public_people === 0 && pub006.public_legal_insurers === 0, '47 public 0');
assert(pub006.fl_oir_company_code === 1897, '47 oir ids');

const sitemap = src('app/sitemap.ts');
assert(sitemap.includes("'/florida'"), '51 sitemap florida');
assert(!sitemap.includes('691126'), '51 no person sitemap');
assert(!sitemap.includes('6185'), '51 no insurer sitemap');

const pageSrc = src('app/florida/page.tsx') + src('components/florida/florida-state-page.tsx');
assert(pageSrc.includes('WebPage') && pageSrc.includes('BreadcrumbList'), '43 schema');
assert(!/AggregateRating|Review\b/.test(src('app/florida/page.tsx')), '43 no review schema');
assert(!/Appointed by \$\{/.test(pageSrc), 'no named insurer template');

function fakeReport(partial: Partial<InsuranceAgencyTrustReportV1>): InsuranceAgencyTrustReportV1 {
  return {
    version: TRUST_REPORT_VERSION,
    entity: {
      id: 'e1',
      kind: 'agency',
      npn: '123',
      legalName: 'Test Agency',
      displayName: 'Test Agency',
      identityConfidence: 'CONFIRMED',
    },
    credentials: [],
    loas: [],
    appointments: [],
    appointmentCoverageNote: '',
    cms: [],
    contacts: [],
    regulatoryEvidence: [],
    regulatoryNote: '',
    jurisdictions: [],
    footprintCopy: '',
    sources: [],
    limitations: [],
    readiness: 'READY',
    ...partial,
  };
}

const credOnly = classifyFloridaProfileModules(
  fakeReport({
    credentials: [
      {
        jurisdiction: 'FL',
        licenseNumber: 'L1',
        licenseClass: 'AGENCY LICENSE',
        regulatoryStatus: 'unknown',
        issueDate: null,
        expirationDate: null,
        sourceDataset: 'florida_dfs',
        sourceObservedAt: null,
      },
    ],
  })
);
assert(moduleRendersCredential(credOnly) === true, '48 cred only');
assert(moduleRendersAppointment(credOnly) === false, '48 cred no apt');
assert(credOnly.credentials[0].regulatoryStatus === null, '5 unknown not shown');

const credApt = classifyFloridaProfileModules(
  fakeReport({
    credentials: [
      {
        jurisdiction: 'FL',
        licenseNumber: 'L2',
        licenseClass: 'AGENCY LICENSE',
        regulatoryStatus: 'ACTIVE',
        issueDate: null,
        expirationDate: null,
        sourceDataset: 'florida_dfs',
        sourceObservedAt: null,
      },
    ],
    appointments: [
      {
        toEntityId: 'should-never-render-as-insurer',
        relationshipType: 'appointed_by',
        status: 'CURRENT',
        sourceDataset: 'florida_dfs_appointments',
        limitation: 'x',
      },
    ],
  })
);
assert(moduleRendersCredential(credApt) && moduleRendersAppointment(credApt), '48 both');
assert(!JSON.stringify(credApt.appointments).includes('should-never-render-as-insurer'), '19 no insurer id');

const none = classifyFloridaProfileModules(fakeReport({}));
assert(!moduleRendersCredential(none) && !moduleRendersAppointment(none), '48 none');
assert(none.withheld.includes(PROFILE_GATE.CMS_NOT_READY), 'cms withheld');
assert(none.withheld.includes(PROFILE_GATE.NFIP_NOT_DETERMINISTICALLY_LINKED), '16 nfip withheld');
assert(none.withheld.includes(PROFILE_GATE.MIR_NOT_ENTITY_COMPATIBLE), '19 mir withheld');
assert(none.withheld.includes(PROFILE_GATE.FL_REGULATORY_NOT_DETERMINISTICALLY_LINKED), '18 reg withheld');

assert(ready.READY_FOR_FL_CREDENTIAL_MODULE === 14834, 'enrich cred');
assert(ready.READY_FOR_FL_APPOINTMENT_MODULE === 613, 'enrich apt');
assert(ready.READY_FOR_CMS_MODULE === 0, 'enrich cms 0');
assert(ready.READY_FOR_FL_MARKET_MODULE === 0, 'enrich mir 0');
assert(ready.READY_FOR_SURPLUS_MODULE === 0, 'enrich surplus 0');
assert(ready.READY_FOR_FL_REGULATORY_MODULE === 0, 'enrich reg 0');
assert(ready.NFIP_deterministic === 0, '16 nfip 0');

const rendered = {
  agencies: view.agency.distinct,
  persons: view.person.distinct,
  oir_active: view.oir.active,
  oir_with_naic: view.oir.withNaic,
  mir_insurers: view.mir.insurers,
  pif_personal: view.mir.pifPersonal,
  pif_commercial: view.mir.pifCommercial,
  pif_total: view.mir.pifTotal,
  premium_total: view.mir.premiumTotal,
  surplus_eligible: view.surplus.eligible,
  nfip_cards: view.nfip.cards,
  liquidations: view.regulatory.stored,
  market_conduct: view.regulatory.marketConduct,
  financial_exams: view.regulatory.financialExam,
  orders: view.regulatory.orders,
  rank_field_rendered_as_pif: false,
  fingerprint: view.fingerprint,
};

mkdirSync(reports, { recursive: true });
writeFileSync(join(reports, 'fl-ins-007-rendered-counts.json'), JSON.stringify(rendered, null, 2));

if (errors.length) {
  console.error('FL-INS-007 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-007 PASS state page tests=25');
