/**
 * INS-INSURER-004 — PDF-native CoCode extraction. Mention ≠ subject. Wave 1 = 0.
 *   npm run check:ins-insurer-004
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { TDI_COMPLAINT_INDEX_DATASET, INS_INSURER_002_DECISION } from '../lib/national/legal-insurer-regulatory-gate';
import {
  examinationExistenceIsMisconduct,
  financialExaminationIsEnforcementAction,
  marketConductIsEnforcementAction,
  tdiComplaintIsExamination,
} from '../lib/national/legal-insurer-examination';
import {
  INS_INSURER_004_DECISION,
  INS_INSURER_004_IDENTITY_WRITES,
  INS_INSURER_004_PUBLISHED_URLS,
  INS_INSURER_004_WAVE1_SIZE,
  absenceMeansNeverExamined,
  assertClassPartition,
  cocodeMentionIsExamSubject,
  examIsViolation,
  fiveDigitNumberIsAutomaticallyNaic,
  groupMemberMentionAttaches,
  mayAttachExamClass,
  nameIsIdentityJoin,
  nameOnlyPdfAttaches,
  reportDateIsRetrievedDate,
} from '../lib/national/legal-insurer-pdf-cocode';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}
const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '94aa1ee193c1b7c62e83bc9060a18202a3c8a71ec5ec5fb1d8bc0775857905bb';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';
const home = buildInsuranceHomeIntelV1();
assert(home.fingerprint === HOME_FP && home.fingerprint === fingerprintHomeIntel(home), 'homepage fingerprint unchanged');
assert(home.publicAvailability.publicPeople === 0, 'people remain unpublished');
assert(home.publicAvailability.publicGraphAgencies === 0, 'graph agencies remain unpublished');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people flag');
assert(mayPublishEntityKind('legal_insurer') === false, 'no /insurers product flag');
assert(INS_INSURER_002_DECISION === 'ZERO_PUBLICATION', 'TDI complaint family remains internal');
assert(tdiComplaintIsExamination() === false, 'TDI not an exam');
assert(cocodeMentionIsExamSubject() === false, 'CoCode mention ≠ exam subject');
assert(fiveDigitNumberIsAutomaticallyNaic() === false, 'five-digit number ≠ automatically NAIC');
assert(groupMemberMentionAttaches() === false, 'group-member mentions excluded');
assert(nameOnlyPdfAttaches() === false, 'no name-only attachment');
assert(nameIsIdentityJoin() === false, 'name used only as validation');
assert(marketConductIsEnforcementAction() === false, 'market conduct ≠ enforcement');
assert(financialExaminationIsEnforcementAction() === false, 'financial exam ≠ enforcement');
assert(examIsViolation() === false, 'exam ≠ violation');
assert(examinationExistenceIsMisconduct() === false, 'absence/existence semantics');
assert(absenceMeansNeverExamined() === false, 'absence ≠ never examined');
assert(!reportDateIsRetrievedDate('2021-12-31', '2026-08-29T20:40:00Z'), 'report date ≠ retrieval date');
assert(mayAttachExamClass('EXAMINED_ENTITY_EXACT') === true, 'exact class attachable');
assert(mayAttachExamClass('COCODE_MENTION_ONLY') === false, 'mention-only not attachable');
assert(mayAttachExamClass('NAME_ONLY') === false, 'name-only not attachable');
assert(INS_INSURER_004_WAVE1_SIZE === 0 && INS_INSURER_004_PUBLISHED_URLS === 0, 'sitemap expansion equals approved pilot (0)');
assert(INS_INSURER_004_IDENTITY_WRITES === 0, 'identity writes = 0');
assert(INS_INSURER_004_DECISION === 'ZERO_PUBLICATION', 'no ranking/recommendation product');
assert(INS_INSURER_004_WAVE1_SIZE === 0, '004 did not launch /insurers; 006 owns the pilot');
assert(src('app/sitemap.ts').includes('/carriers'), '/carriers unchanged');
assert(!src('lib/national/home-intel.ts').includes('INS-INSURER-004'), 'homepage untouched');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-INSURER-004'), 'florida untouched');
assert(src('lib/national/legal-insurer-regulatory-gate.ts').includes(TDI_COMPLAINT_INDEX_DATASET), 'TDI dataset still gated');

const extract = JSON.parse(src('data/reports/ins-insurer-004-exam-cocode-extraction.json'));
const x = extract.denominators;
assert(x.X1 === 129, 'X1 unique PDFs');
assert(x.X2 === 129, 'native PDF extraction preferred (all readable)');
assert(x.X5 + x.X6 + x.X7 + x.X8 + x.X9 + x.X10 === x.X1, 'classification partition');
assert(assertClassPartition(x).length === 0, 'partition helper');
assert(x.X6 === 1 && x.X12 === 7 && x.X11 === 7, 'consolidated exams explicitly scoped');
assert(x.X5 === 0, 'no single-company exact without proven CoCode');
assert(x.X13 === 0, 'PUBLIC_SAFE relationships 0 (no profile launch)');
assert(x.mention_only_cocode_instances >= 40, 'group-member CoCodes deliberately not attached');
const farmers = extract.documents.find((d: { classification: string }) => d.classification === 'CONSOLIDATED_EXAM_EXPLICIT');
assert(farmers && farmers.listing_names.length === 8, 'shared PDFs deduped (8 listings / 1 PDF)');
assert(new Set(farmers.examined_entities.map((e: { naic_cocode: string }) => e.naic_cocode)).size === 7, 'examined company scope explicitly proven');
assert(!farmers.examined_entities.some((e: { naic_cocode: string }) => farmers.mentioned_only.includes(e.naic_cocode)), 'examined vs mentioned disjoint');
assert(typeof farmers.document_hash === 'string' && farmers.document_hash.length === 64, 'document hash deterministic');
const shared21 = extract.documents.find((d: { listing_names?: string[] }) => (d.listing_names || []).some((n: string) => /21st Century/.test(n)));
assert(shared21 && shared21.classification === 'COCODE_MENTION_ONLY', 'shared 21st Century PDF not auto-attached');
assert(extract.documents.every((d: { classification: string }) => d.classification !== 'EXAMINED_ENTITY_EXACT' || (d.examined_entities || []).length === 1), 'exact class is single subject');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT && view.fingerprint === FL_FP, 'Florida fingerprint unchanged');

if (errors.length) {
  console.error(`INS-INSURER-004 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-INSURER-004 PASS');
console.log('decision', INS_INSURER_004_DECISION);
console.log('X', x);
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
