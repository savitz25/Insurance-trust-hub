/**
 * FL-INS-004 Florida regulatory / enforcement evidence tests.
 *   npm run check:fl-ins-004
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { EVIDENCE_FAMILY, PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../lib/national/regulatory-evidence';
import { TRUST_REPORT_VERSION } from '../lib/national/agency-trust-report';
import {
  CRN_SAFE_PUBLIC_COPY,
  crnFamily,
  crnIsComplaintIndex,
  crnIsEnforcementFinding,
  crnIsFinalOrder,
  crnNameOnlyAttaches,
  decideFloridaEvidenceIdentity,
  duplicateRecordBlocked,
  examExistenceIsMisconduct,
  evidenceProvenanceComplete,
  financialExamFamily,
  floridaEvidenceChangesTrustScore,
  floridaEvidencePublishesInsurerPages,
  classifyReceivershipFamily,
  highConfidenceMayAttachFloridaEvidence,
  marketExamEqualsFinancialExam,
  marketExamFamily,
  mayPublishFloridaRegulatoryEvidence,
  nameOnlyAdverseMatchAttaches,
  naicCompanyStatusIsReceivershipEvent,
  nonInsurerForcedToLegalInsurer,
  orderIsFinal,
  pendingActionIsFinal,
  receivershipIsConductViolation,
  reviewRequiredMayAttachFloridaEvidence,
} from '../lib/national/fl-regulatory-evidence';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const reports = join(root, 'data/reports');
function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(reports, name), 'utf8')) as Record<string, unknown>;
}

assert(existsSync(join(root, 'docs/florida/FL-INS-004-regulatory-evidence-contract.md')), 'contract');
assert(existsSync(join(root, 'docs/florida/FL-INS-004-crn-semantics.md')), 'crn semantics');
assert(existsSync(join(root, 'docs/florida/FL-INS-004-examination-semantics.md')), 'exam semantics');
assert(existsSync(join(root, 'docs/florida/FL-INS-004-receivership-semantics.md')), 'rx semantics');
assert(existsSync(join(root, 'docs/florida/FL-INS-004-source-audit.md')), 'source audit');
assert(existsSync(join(root, 'docs/florida/FL-INS-004-public-records-request.md')), 'prr');

assert(EVIDENCE_FAMILY.CIVIL_REMEDY_NOTICE === 'CIVIL_REMEDY_NOTICE', 'family crn');
assert(EVIDENCE_FAMILY.REHABILITATION === 'REHABILITATION', 'family rehab');
assert(crnFamily() === 'CIVIL_REMEDY_NOTICE', '1 crn family');
assert(crnIsFinalOrder() === false, '1 CRN ≠ final order');
assert(crnIsEnforcementFinding() === false, '1b CRN ≠ finding');
assert(crnIsComplaintIndex() === false, '1c CRN ≠ TDI complaint');

const spine = new Set(['12345']);
const flMap = new Map([['03047', '12345']]);

const nameOnly = decideFloridaEvidenceIdentity({
  nameOnly: 'FEDNAT INSURANCE COMPANY',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
});
assert(nameOnly.attach === false && nameOnly.confidence === 'UNRESOLVED', '2 CRN name-only not attached');
assert(crnNameOnlyAttaches() === false, '2b');

const exactNaic = decideFloridaEvidenceIdentity({
  naicCoCode: '12345',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
});
assert(exactNaic.attach === true && exactNaic.confidence === 'CONFIRMED', '3 exact NAIC CRN accepted');

const exactFl = decideFloridaEvidenceIdentity({
  flCompanyCode: '03047',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
});
assert(exactFl.attach === true && exactFl.confidence === 'CONFIRMED', '4 exact FL CoCode→NAIC accepted');

assert(marketExamFamily() !== financialExamFamily(), '5 market ≠ financial');
assert(marketExamEqualsFinancialExam() === false, '5b');
assert(examExistenceIsMisconduct() === false, '6 exam existence ≠ misconduct');

assert(orderIsFinal({ instrument: 'FINAL_ORDER' }) === true, '7 final order is final');
assert(orderIsFinal({ instrument: 'CONSENT_ORDER' }) === true, '7b consent final');
assert(orderIsFinal({ instrument: 'PENDING' }) === false, '8 pending not final');
assert(pendingActionIsFinal() === false, '8b');

assert(receivershipIsConductViolation() === false, '9 receivership ≠ conduct');
const liq = classifyReceivershipFamily('Liquidation');
const rehab = classifyReceivershipFamily('Rehabilitation');
assert(liq.family === 'LIQUIDATION' && rehab.family === 'REHABILITATION', '10 liquidation separate');
assert(liq.family !== rehab.family, '10b');

const seen = new Set(['florida_dfs_civil_remedy_notices|CRN-1']);
assert(duplicateRecordBlocked(seen, 'florida_dfs_civil_remedy_notices', 'CRN-1') === true, '11 duplicate CRN blocked');
assert(
  duplicateRecordBlocked(new Set(['florida_oir_market_conduct_exams|u1']), 'florida_oir_market_conduct_exams', 'u1') ===
    true,
  '12 duplicate exam blocked'
);
assert(
  duplicateRecordBlocked(new Set(['florida_oir_administrative_orders|o1']), 'florida_oir_administrative_orders', 'o1') ===
    true,
  '13 duplicate order blocked'
);

assert(nameOnlyAdverseMatchAttaches() === false, '14 name-only rejected');
const nonIns = decideFloridaEvidenceIdentity({
  naicCoCode: '12345',
  officialCoCodes: spine,
  flCodeToNaic: flMap,
  nonInsurer: true,
});
assert(nonIns.attach === false && nonInsurerForcedToLegalInsurer() === false, '15 non-insurer not forced');

assert(
  evidenceProvenanceComplete({
    sourceDataset: 'florida_dfs_receiver_companies',
    recordIdentifier: 'receivership:562',
    sourceUrl: 'https://www.myfloridacfo.com/division/receiver/companies/detail/562',
    sourceObservedAt: '2026-08-28T00:00:00.000Z',
    family: 'LIQUIDATION',
  }) === true,
  '16 provenance complete'
);

assert(mayPublishEntityKind('legal_insurer') === false, '17 public insurers 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, '17b people');
assert(mayPublishFloridaRegulatoryEvidence() === false, '17c evidence off');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, '17d');
assert(floridaEvidencePublishesInsurerPages() === false, '17e');
assert(floridaEvidenceChangesTrustScore() === false, '18 no Trust Score');
assert(TRUST_REPORT_VERSION === 'insurance-agency-trust-report-v1', '18b trust report version unchanged');
assert(reviewRequiredMayAttachFloridaEvidence() === false, 'review no attach');
assert(highConfidenceMayAttachFloridaEvidence() === false, 'high-conf no attach');
assert(naicCompanyStatusIsReceivershipEvent() === false, 'naic status ≠ event');
assert(CRN_SAFE_PUBLIC_COPY.includes('Civil Remedy Notice filed'), 'safe crn copy');

const crn = load('fl-ins-004-crn-census.json');
const mc = load('fl-ins-004-market-exam-census.json');
const fin = load('fl-ins-004-financial-exam-census.json');
const ord = load('fl-ins-004-order-census.json');
const rx = load('fl-ins-004-receivership-census.json');
const ident = load('fl-ins-004-identity-reconciliation.json');
const recon = load('fl-ins-004-evidence-reconciliation.json');
const pub = load('fl-ins-004-publication-regression.json');
const idem = load('fl-ins-004-idempotency.json');
const verd = load('fl-ins-004-verdict.json');

assert(crn.attached === 0 && crn.ingested === 0, 'crn 0');
assert(crn.family === 'CIVIL_REMEDY_NOTICE', 'crn family report');
assert(mc.family === 'MARKET_CONDUCT_EXAM' && mc.attached === 0, 'mc unattached');
assert(mc.not_financial_exam === true, 'mc ≠ fin report');
assert(fin.family === 'FINANCIAL_EXAM' && fin.attached === 0, 'fin unattached');
assert(ord.attached === 0 && ord.pending_is_final === false, 'orders unattached');
assert(rx.liquidation === 12, '12 liquidations');
assert(rx.rehabilitation === 0, '0 rehab');
assert(rx.attached === 0, 'rx unattached');
assert(rx.not_conduct_violation === true, 'rx not conduct');
assert(ident.CONFIRMED === 0, 'identity confirmed 0');
assert(ident.name_only_attach === 0, 'no name attach');
assert(recon.WRONG_TARGET === 0, 'wrong target 0');
assert(recon.CRN_INGESTED === 0 && recon.MARKET_EXAM_INGESTED === 0, 'listings not ingested');
assert(pub.pass === true, 'O publication regression');
assert((pub.after as Record<string, unknown>).appointed_by === 2680, 'appointed_by');
assert((pub.after as Record<string, unknown>).legal_insurers === 6185, 'legal');
assert((pub.after as Record<string, unknown>).appointer_resolves_to_fl === 0, 'fl resolves 0');
assert((pub.after as Record<string, unknown>).fl_oir_company_code === 1897, 'oir ids');
assert(pub.public_florida_regulatory_evidence === 0, 'N public fl evidence 0');
assert(idem.pass === true, '19 idempotency');
assert(idem.first_run_inserted === 12, '19 first insert 12');
assert(idem.inserted === 0, '19 second execute 0');
assert(idem.expected_equals_production === true, '20 expected=production');
assert((pub.after as Record<string, unknown>).florida_receiver === 12, '20 prod receiver 12');
assert((pub.after as Record<string, unknown>).regulatory_evidence === 5978, '20 evidence 5978');
assert(crn.fields && (crn.fields as Record<string, unknown>).naic === false, 'crn no naic field');
assert(String(verd.status).includes('COMPLETE'), 'complete');
assert(verd.started_005 === false, 'no 005');

const after = pub.after as Record<string, unknown>;
assert(after.providers === 170499, 'providers');
assert(after.agencies === 82071, 'agencies');
assert(after.persons === 1029860, 'persons');
assert(after.bridges === 37515, 'bridges');

const py = readFileSync(join(root, 'scripts/national/fl-ins-004.py'), 'utf8');
assert(py.includes('--execute'), 'execute gate');
assert(!/Citizens|CHOICES|IRFS|FSLSO|NFIP/.test(py) || /not_in_scope/.test(py), 'no 005 sources ingested');

if (errors.length) {
  console.error('FL-INS-004 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-004 PASS regulatory evidence tests=20');
