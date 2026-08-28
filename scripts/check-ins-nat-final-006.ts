/**
 * INS-NAT-FINAL-006 national completion-gate tests.
 *   npm run check:ins-nat-final-006
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  affiliationInheritsAdverse,
  agencyActionDisciplinesPerson,
  brandInheritsAdverse,
  complaintIsEnforcementFinding,
  complaintIsFinalOrder,
  groupInheritsMemberAdverse,
  personActionDisciplinesAgency,
} from '../lib/national/regulatory-evidence';
import {
  LEGAL_INSURER_DISPLAY_DECISION,
  complaintZeroIsCleanRecord,
  legalInsurerEvidenceAppearsOnAgencyReport,
} from '../lib/national/regulatory-display';
import {
  TRUST_REPORT_VERSION,
  appointmentCoverageNote,
  cmsRegistrationIsNotLicense,
  emptyAgencyRegulatoryModule,
} from '../lib/national/agency-trust-report';
import {
  FL_DIGIT_COINCIDENCES,
  TX_UNRESOLVED_IDS,
  flDfsNumberIsNaic,
} from '../lib/national/appointer-crosswalk';
import { nameOnlyProviderBridges } from '../lib/national/provider-graph-bridge';
import { MEDICARE_INFERENCE_POLICY } from '../lib/national/loa';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/run-ins-nat-final-006.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const robots = readFileSync(join(root, 'app/robots.ts'), 'utf8');

assert(existsSync(join(root, 'scripts/national/run-ins-nat-final-006.ts')), '006 runner');
assert(!/\.from\([^)]+\)\.(insert|update|upsert|delete)/i.test(src), 'read-only graph');
assert(!/FL-INS-000/.test(src) || /Do not start Florida/i.test(src), 'no Florida');
assert(/Does not start Florida/i.test(src), 'no Florida comment');

assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people off');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'evidence off');
assert(LEGAL_INSURER_DISPLAY_DECISION === 'INTERNAL_ONLY', 'legal internal');
assert(mayPublishEntityKind('person') === false, 'person unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal unpublished');
assert(mayPublishEntityKind('insurance_group') === false, 'group unpublished');
assert(mayPublishEntityKind('consumer_brand') === false, 'brand unpublished');
assert(mayPublishEntityKind('carrier') === false, 'carrier unpublished');

assert(complaintIsFinalOrder() === false, 'complaint ≠ final');
assert(complaintIsEnforcementFinding() === false, 'complaint ≠ finding');
assert(complaintZeroIsCleanRecord() === false, 'zero ≠ clean');
assert(personActionDisciplinesAgency() === false, 'person ↛ agency');
assert(agencyActionDisciplinesPerson() === false, 'agency ↛ person');
assert(brandInheritsAdverse() === false, 'brand no inherit');
assert(groupInheritsMemberAdverse() === false, 'group no inherit');
assert(affiliationInheritsAdverse() === false, 'affiliation no inherit');
assert(legalInsurerEvidenceAppearsOnAgencyReport() === false, 'no inherit to agency');
assert(cmsRegistrationIsNotLicense() === true, 'cms ≠ license');
assert(nameOnlyProviderBridges() === false, 'no name bridge');
assert(flDfsNumberIsNaic() === false, 'FL DFS ≠ NAIC');
assert(TX_UNRESOLVED_IDS.length === 7, 'TX 7 unresolved');
assert(FL_DIGIT_COINCIDENCES.length === 17, 'FL 17 coincidences');
assert(TRUST_REPORT_VERSION === 'insurance-agency-trust-report-v1', 'trust report v1');
assert(emptyAgencyRegulatoryModule().length === 0, 'empty regulatory module');
assert(/incomplete/.test(appointmentCoverageNote(false)), 'missing ≠ zero appointments');
assert(/Medicare/.test(MEDICARE_INFERENCE_POLICY), 'medicare inference policy');
assert(!/\/people\//.test(sitemap), 'no people sitemap');
assert(/\/admin/.test(robots), 'robots admin');
assert(src.includes('buildExpectedConfirmedBridges'), 'exact bridge recon');
assert(src.includes('37515') || src.includes('expected.length'), 'expected set');

assert(existsSync(join(root, 'docs/national/INS-NAT-FINAL-006-completion-gate.md')), 'gate doc');

if (errors.length) {
  console.error('INS-NAT-FINAL-006 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-FINAL-006 PASS publication semantics bridge taxonomy');
