/**
 * INS-INSURER-005 — exact exam ingest + public-safe gate. Wave 1 routes = 0.
 *   npm run check:ins-insurer-005
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { TDI_COMPLAINT_INDEX_DATASET, INS_INSURER_002_DECISION } from '../lib/national/legal-insurer-regulatory-gate';
import {
  EXAMINATION_FAMILY,
  examinationExistenceIsMisconduct,
  financialExaminationIsEnforcementAction,
  marketConductIsEnforcementAction,
} from '../lib/national/legal-insurer-examination';
import { emptyLegalInsurerProfile } from '../lib/national/legal-insurer-profile';
import {
  EXAM_ATTACHMENT_CLASS,
  INS_INSURER_004_IDENTITY_WRITES,
  mayAttachExamClass as mayAttach004,
} from '../lib/national/legal-insurer-pdf-cocode';
import {
  EXAM_DATASETS,
  FARMERS_DOCUMENT_HASH,
  FARMERS_EXACT_COCODES,
  INS_INSURER_005B_COHORT_FINGERPRINT,
  INS_INSURER_005_DECISION,
  INS_INSURER_005_IDENTITY_WRITES,
  INS_INSURER_005_PUBLISHED_URLS,
  INS_INSURER_005_SITEMAP_DELTA,
  INS_INSURER_005_WAVE1_SIZE,
  NON_CANONICAL_FIVE_DIGIT,
  PUBLIC_EXAM_COPY,
  absenceMeansNeverExamined,
  assertPublicSafeEquations,
  attachmentMethodForClass,
  classifyExamRelationshipPublicSafe,
  cocodeMentionIsExamSubject,
  complaintIndexIsScore,
  enforcementScoreExists,
  examIsViolation,
  financialExamIsMarketConduct,
  fiveDigit32399CannotAttach,
  floridaCoverCocodeRequiresExplicitSubject,
  marketConductIsEnforcement,
  mayAttachExamClass,
  mayAttachFiveDigit,
  nameOnlyPdfAttaches,
  nameValidatesNeverJoins,
  mentionOnlyPdfAttaches,
  recommendationExists,
  tdiComplaintRemainsInternal,
  trustScoreExists,
} from '../lib/national/legal-insurer-exam-ingest';

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
const home = buildInsuranceHomeIntelV1();
assert(home.fingerprint === HOME_FP && home.fingerprint === fingerprintHomeIntel(home), '27 homepage fingerprint unchanged');
assert(home.publicAvailability.publicPeople === 0, '30 public people 0');
assert(home.publicAvailability.publicGraphAgencies === 0, '31 public agencies 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal insurer unpublished');
assert(INS_INSURER_002_DECISION === 'ZERO_PUBLICATION', '16 TDI complaint remains internal');
assert(tdiComplaintRemainsInternal(TDI_COMPLAINT_INDEX_DATASET), '16 TDI dataset firewall');
assert(cocodeMentionIsExamSubject() === false, '1 CoCode mention ≠ exam subject');
assert(floridaCoverCocodeRequiresExplicitSubject() === true, '2 Florida cover CoCode requires explicit subject scope');
assert(fiveDigit32399CannotAttach() === true && !mayAttachFiveDigit(NON_CANONICAL_FIVE_DIGIT), '3 32399 cannot attach');
assert(nameValidatesNeverJoins() === true, '6 name validates but never joins');
assert(nameOnlyPdfAttaches() === false && !mayAttachExamClass('NAME_ONLY'), '34 no NAME_ONLY attachment');
assert(mentionOnlyPdfAttaches() === false && !mayAttachExamClass('COCODE_MENTION_ONLY'), '35 no COCODE_MENTION_ONLY attachment');
assert(financialExamIsMarketConduct() === false, '11 CA financial ≠ market conduct');
assert(marketConductIsEnforcement() === false && marketConductIsEnforcementAction() === false, '12 market conduct ≠ enforcement');
assert(financialExaminationIsEnforcementAction() === false, 'financial exam ≠ enforcement');
assert(examIsViolation() === false, '13 exam ≠ violation');
assert(examinationExistenceIsMisconduct() === false && absenceMeansNeverExamined() === false, '15 absence ≠ never examined');
assert(complaintIndexIsScore() === false, '17 no complaint score');
assert(enforcementScoreExists() === false, '18 no enforcement score');
assert(trustScoreExists() === false, '19 no Trust Score');
assert(recommendationExists() === false, '20 no recommendation');
assert(INS_INSURER_005_DECISION === 'ZERO_PUBLICATION', 'routes unpublished');
assert(INS_INSURER_005_WAVE1_SIZE === 0 && INS_INSURER_005_PUBLISHED_URLS === 0, '32 /insurers absent');
assert(INS_INSURER_005_SITEMAP_DELTA === 0, '33 sitemap delta 0');
assert(INS_INSURER_005_IDENTITY_WRITES === 0 && INS_INSURER_004_IDENTITY_WRITES === 0, '24 identity writes = 0');
assert(!existsSync(join(root, 'app/insurers')), '32 no /insurers routes');
assert(!src('app/sitemap.ts').includes('/insurers'), '33 sitemap has no /insurers');
assert(src('app/sitemap.ts').includes('/carriers'), '29 /carriers unchanged');
assert(!src('lib/national/home-intel.ts').includes('INS-INSURER-005'), 'homepage untouched');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-INSURER-005'), 'florida intel untouched');

const extract = JSON.parse(src('data/reports/ins-insurer-004-exam-cocode-extraction.json'));
const farmers = extract.documents.find((d: { document_hash?: string }) => d.document_hash === FARMERS_DOCUMENT_HASH);
assert(farmers && farmers.classification === 'CONSOLIDATED_EXAM_EXPLICIT', '7 consolidated exam supports multiple subjects only explicitly');
const farmerCodes = (farmers.examined_entities || []).map((e: { naic_cocode: string }) => e.naic_cocode);
assert(farmerCodes.length === 7 && FARMERS_EXACT_COCODES.every((c) => farmerCodes.includes(c)), '8 Farmers 7 preserved exactly');
assert((farmers.mentioned_only || []).length >= 40, '9 Farmers affiliates excluded');
assert(farmers.listing_names.length === 8 && farmers.document_hash.length === 64, '10 shared PDFs deduped');
assert(new Set(farmerCodes).size === 7, '5 exact CoCode resolves uniquely');
assert(
  farmerCodes.every((c: string) => c !== NON_CANONICAL_FIVE_DIGIT),
  '4 exact CoCode exists in legal-insurer spine (Farmers codes, not 32399)'
);

const shared21 = extract.documents.find((d: { listing_names?: string[] }) =>
  (d.listing_names || []).some((n: string) => /21st Century/.test(n))
);
assert(shared21 && shared21.classification === 'COCODE_MENTION_ONLY', '1 shared PDF CoCodes are mentions');

const sample = JSON.parse(src('data/reports/ins-insurer-005-fl-sample.json'));
assert(sample.n === 10, 'FL sample n=10');
assert(
  sample.rows.every((r: { classification: string }) => r.classification === 'EXAMINED_ENTITY_EXACT'),
  '2 FL sample exact-subject scope'
);
assert(
  sample.rows.every((r: { subject_cocode: string }) => r.subject_cocode && r.subject_cocode !== NON_CANONICAL_FIVE_DIGIT),
  '4 FL subject CoCode on spine, not 32399'
);
assert(
  sample.rows.some((r: { non_canonical_five_digit?: string[] }) =>
    (r.non_canonical_five_digit || []).includes(NON_CANONICAL_FIVE_DIGIT)
  ),
  '3 32399 observed as non-canonical and never attached'
);
assert(
  sample.rows.every((r: { subject_cocode: string }) => r.subject_cocode !== NON_CANONICAL_FIVE_DIGIT),
  '3 32399 is not a subject CoCode'
);

const safeFarmers = classifyExamRelationshipPublicSafe({
  classification: EXAM_ATTACHMENT_CLASS.CONSOLIDATED_EXAM_EXPLICIT,
  naicCocode: '21652',
  spineHasUnique: true,
  officialSourceUrl: farmers.document_url,
  documentHash: farmers.document_hash,
  examType: EXAMINATION_FAMILY.FINANCIAL_EXAMINATION,
  reportDate: '2021-12-31',
  retrievedAt: farmers.retrieved_at,
  confidentialRequired: false,
  consumerSafeDescription: PUBLIC_EXAM_COPY.caFinancial,
});
assert(safeFarmers === 'PUBLIC_SAFE', '21-23 Farmers public-safe gate');
assert(attachmentMethodForClass('CONSOLIDATED_EXAM_EXPLICIT')?.includes('PDF_NATIVE_COCODE'), 'explicit attachment method');
assert(mayAttach004('NAME_ONLY') === false, '004 name-only still forbidden');

const profile = emptyLegalInsurerProfile({
  entityId: 'x',
  legalName: 'TEST',
  naicCode: '21652',
  retrievedAt: '2026-08-29T00:00:00.000Z',
});
assert(profile.examinationReports.length === 0, 'profile prepared, not mounted');
assert(profile.score === null && profile.recommendation === null && profile.trustRating === null, 'no scores');
assert(/misconduct/.test(PUBLIC_EXAM_COPY.notMisconduct), 'exam copy contract');
assert(/never been examined/.test(PUBLIC_EXAM_COPY.absence), 'absence copy');

const ingest = JSON.parse(src('data/reports/ins-insurer-005-ingest.json'));
assert(ingest.predicted.identityWrites === 0, '24 identity writes documented');
assert(ingest.writes.inserted === 26, '25 first-run inserts 26 relationships');
assert(ingest.after.legalInsurer === 6185 && ingest.after.tdi === ingest.baseline.tdi, 'TDI and identity unchanged');
const second = JSON.parse(src('data/reports/ins-insurer-005-ingest-second.json'));
assert(second.writes.inserted === 0 && second.writes.skipped === 26, '26 second run inserts 0');
assert(ingest.fingerprint === second.fingerprint, 'deterministic source fingerprint');
const censusPath = join(root, 'data/reports/ins-insurer-005-census.json');
if (existsSync(censusPath)) {
  const census = JSON.parse(src('data/reports/ins-insurer-005-census.json'));
  assert(assertPublicSafeEquations(census.denominators).length === 0, 'PS equations');
  assert(census.denominators.PS8 === 7, 'PS8 CA financial PUBLIC_SAFE = 7');
  assert(census.tdi.family === 'INTERNAL_ONLY', 'TDI firewall');
  assert(census.publicationReadinessV4.PUBLIC_READY === census.denominators.PS10, 'V4 PUBLIC_READY = PS10');
  assert(census.identityWrites === 0, '24 census identity writes 0');
}
assert(!/2021-12-31/.test('2026-08-29T20:40:00Z') || farmers.retrieved_at !== '2021-12-31', '14 report date ≠ retrieval date');
assert(farmers.retrieved_at !== '2021-12-31', '14 Farmers as-of ≠ retrieved');

const datasets = src('lib/national/legal-insurer-exam-ingest.ts');
assert(datasets.includes(EXAM_DATASETS.CA_FINANCIAL) && datasets.includes(EXAM_DATASETS.FL_MARKET_CONDUCT), 'exam datasets');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT && view.fingerprint === FL_FP, '28 Florida fingerprint unchanged');

const cohort = JSON.parse(src('data/reports/ins-insurer-005b-public-ready-cohort.json'));
assert(cohort.locked === true && cohort.cohort_size === 26 && cohort.insurers.length === 26, '005B cohort locked at 26');
assert(cohort.fingerprint === INS_INSURER_005B_COHORT_FINGERPRINT, '005B cohort fingerprint');
assert(cohort.non_canonical_five_digit.attached === 0, '32399 never attaches');
assert(cohort.tdi_complaint_indexes.family === 'INTERNAL_ONLY' && cohort.tdi_complaint_indexes.excluded_from_cohort === true, 'TDI excluded from cohort');
assert(cohort.publicationReadinessV4.PUBLIC_READY === 26, 'V4 PUBLIC_READY 26');
assert(cohort.production.legal_insurers === 6185 && cohort.production.regulatory_evidence === 6004, 'Production totals locked');
const codes = cohort.insurers.map((r: { naic_cocode: string }) => r.naic_cocode);
assert(new Set(codes).size === 26, '26 unique CoCodes');
assert(!codes.includes(NON_CANONICAL_FIVE_DIGIT), '32399 not in cohort CoCodes');
assert(
  FARMERS_EXACT_COCODES.every((c) => codes.includes(c)),
  'Farmers 7 inside locked cohort'
);
assert(
  cohort.insurers.every((r: { public_safe_status: string }) => r.public_safe_status === 'PUBLIC_SAFE'),
  'cohort rows PUBLIC_SAFE only'
);
assert(!JSON.stringify(cohort.insurers).toLowerCase().includes('complaint'), 'no TDI complaint values in cohort payload');
assert(!JSON.stringify(cohort.insurers).toLowerCase().includes('score'), 'no scores in cohort');
assert(Array.isArray(profile.examinationReports), 'profile can consume examinationReports[]');

if (errors.length) {
  console.error(`INS-INSURER-005 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-INSURER-005 PASS');
console.log('decision', INS_INSURER_005_DECISION);
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
