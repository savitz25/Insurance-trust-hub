/**
 * INS-INSURER-003 — examination evidence spine gates. Wave 1 = 0.
 *   npm run check:ins-insurer-003
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED, EVIDENCE_FAMILY } from '../lib/national/regulatory-evidence';
import { TDI_COMPLAINT_INDEX_DATASET, INS_INSURER_002_DECISION } from '../lib/national/legal-insurer-regulatory-gate';
import {
  EXAMINATION_FAMILY,
  EXAMINATION_NOT_ENFORCEMENT,
  EXAMINATION_NOT_MISCONDUCT,
  EXAMINATION_ABSENCE,
  INS_INSURER_003_DECISION,
  INS_INSURER_003_PUBLIC_SOURCE_ALLOWLIST,
  INS_INSURER_003_PUBLISHED_URLS,
  INS_INSURER_003_WAVE1_SIZE,
  assertExamEquations,
  decideExaminationIdentity,
  examinationDedupeKey,
  examinationExistenceIsMisconduct,
  examinationIsViolation,
  examinationPublicSafe,
  financialExaminationIsEnforcementAction,
  marketConductIsEnforcementAction,
  nameOnlyExamAttachAllowed,
  naicGroupIsCompanyForExam,
  reportDateEqualsRetrievedDate,
  tdiComplaintIsExamination,
  tdiDatasetMustStayInternal,
} from '../lib/national/legal-insurer-examination';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}
const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '7474172a3996c574e26058be24b6af5149765f801660ddedba9d5508ef332fc1';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';
const home = buildInsuranceHomeIntelV1();
assert(home.fingerprint === HOME_FP && home.fingerprint === fingerprintHomeIntel(home), 'homepage fingerprint unchanged');
assert(home.publicAvailability.publicPeople === 0, 'public people 0');
assert(home.publicAvailability.publicGraphAgencies === 0, 'public graph agencies 0');
assert(home.publicAvailability.publicLegalInsurers === 0, 'no identity-only shells');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal insurer unpublished');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'global regulatory flag off');
assert(INS_INSURER_002_DECISION === 'ZERO_PUBLICATION', '002 complaint hold intact');
assert(tdiDatasetMustStayInternal(TDI_COMPLAINT_INDEX_DATASET), 'TDI complaint rows remain internal');
assert(tdiComplaintIsExamination() === false, 'TDI complaint is not an examination');
assert(EVIDENCE_FAMILY.COMPLAINT !== EXAMINATION_FAMILY.MARKET_CONDUCT_EXAMINATION, 'complaint ≠ market conduct');
assert(EXAMINATION_FAMILY.MARKET_CONDUCT_EXAMINATION !== EXAMINATION_FAMILY.FINANCIAL_EXAMINATION, 'MC ≠ financial');
assert(marketConductIsEnforcementAction() === false, 'market-conduct ≠ enforcement action');
assert(financialExaminationIsEnforcementAction() === false, 'financial examination ≠ enforcement action');
assert(examinationExistenceIsMisconduct() === false, 'exam existence ≠ misconduct');
assert(examinationIsViolation() === false, 'exam ≠ violation');
assert(nameOnlyExamAttachAllowed() === false, 'no name-only joins');
assert(naicGroupIsCompanyForExam() === false, 'no NAIC-group-as-company inference');
assert(reportDateEqualsRetrievedDate() === false, 'report date ≠ retrieved date');
assert(/does not by itself mean misconduct/.test(EXAMINATION_NOT_MISCONDUCT), 'copy');
assert(/not an enforcement action/.test(EXAMINATION_NOT_ENFORCEMENT), 'exam semantics');
assert(/does not mean the insurer has never been examined/.test(EXAMINATION_ABSENCE), 'absence ≠ clean');

const spine = new Set(['25178', '19232']);
assert(decideExaminationIdentity({ listingNameOnly: true, officialCoCodes: spine }).attach === false, 'name-only rejected');
assert(decideExaminationIdentity({ naicGroupCode: '8', officialCoCodes: spine }).method === 'group_only', 'group-only held');
assert(decideExaminationIdentity({ naicCompanyCode: '25178', officialCoCodes: spine }).attach === true, 'exact CoCode attaches');
assert(
  decideExaminationIdentity({ naicCompanyCode: '25178', multipleLegalEntities: true, officialCoCodes: spine }).attach ===
    false,
  'multi-entity held',
);
assert(
  examinationPublicSafe({
    attached: true,
    identityConfidence: 'CONFIRMED',
    examType: EXAMINATION_FAMILY.FINANCIAL_EXAMINATION,
    reportDate: '2023-05-30',
    retrievedAt: '2026-08-29T20:19:13Z',
    sourceUrl: 'https://www.insurance.ca.gov/example.pdf',
    nameOnly: false,
  }) === 'INTERNAL_ONLY',
  'allowlist empty → not PUBLIC_SAFE this task',
);
assert(
  examinationDedupeKey({ regulator: 'CDI', sourceNativeId: 'rpt-1' }) ===
    examinationDedupeKey({ regulator: 'CDI', sourceNativeId: 'rpt-1' }),
  'document dedupe deterministic',
);

const census = JSON.parse(src('data/reports/ins-insurer-003-census.json'));
const d = census.denominators;
assert(d.E2 + d.E3 + d.E4 === d.E1, 'E2+E3+E4=E1');
assert(assertExamEquations(d).length === 0, 'exam equations');
assert(d.E2 === 0 && d.E5 === 0 && d.E8 === 0, 'no exact legal-insurer attachment ingested');
assert(d.E9 === 0 && d.E10 === 0 && d.E11 === 0, 'no CA/FL exam attach');
assert(census.ingest.inserted === 0 && census.ingest.secondRunInserts === 0, 'ingest idempotent (0/0)');
assert(census.tdiComplaintRemainsInternal === true, 'TDI internal');
assert(census.publication.decision === 'ZERO_PUBLICATION', 'wave 0');
assert(INS_INSURER_003_WAVE1_SIZE === 0 && INS_INSURER_003_PUBLISHED_URLS === 0, 'routes equal wave');
assert(INS_INSURER_003_PUBLIC_SOURCE_ALLOWLIST.length === 0, 'exam allowlist empty');
assert(census.identityAudit.exactCompanyCoCodeInSample === 0, 'sample CoCode 0');
assert(INS_INSURER_003_WAVE1_SIZE === 0, '003 did not launch /insurers; 006 owns the pilot');
assert(src('app/sitemap.ts').includes('/carriers'), '/carriers unchanged');
assert(!src('lib/national/home-intel.ts').includes('INS-INSURER-003'), 'homepage untouched');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-INSURER-003'), 'florida contract untouched');
assert(!src('lib/national/legal-insurer-examination.ts').toLowerCase().includes('exam score'), 'no exam score');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT && view.fingerprint === FL_FP, 'Florida fingerprint unchanged');

if (errors.length) {
  console.error(`INS-INSURER-003 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-INSURER-003 PASS');
console.log('decision', INS_INSURER_003_DECISION);
console.log('E', d);
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
