/**
 * INS-NAT-FINAL-004 regulatory evidence foundation tests.
 *   npm run check:ins-nat-final-004
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { mayPublishEntityKind } from '../lib/national/publication';
import {
  FORBIDDEN_PUBLIC_COPY,
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  SAFE_PUBLIC_COPY,
  affiliationInheritsAdverse,
  agencyActionDisciplinesPerson,
  appointmentInheritsAdverse,
  brandInheritsAdverse,
  cmsTerminationIsMisconduct,
  complaintIsEnforcementFinding,
  complaintIsFinalOrder,
  decideLegalInsurerEvidenceIdentity,
  evidenceMayTraverseBridge,
  groupInheritsMemberAdverse,
  mayPublishRegulatoryEvidence,
  nameAloneIsEvidenceIdentity,
  naicStatusIsEnforcementEvent,
  personActionDisciplinesAgency,
  publicationReadinessForThisTask,
  reviewRequiredMayAttachToCanonicalEntity,
} from '../lib/national/regulatory-evidence';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/ingest-regulatory-evidence.ts'), 'utf8');
assert(existsSync(join(root, 'lib/national/regulatory-evidence.ts')), 'lib');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'no provider writes');
assert(!/FL-INS-000/.test(src), 'no Florida rollout');
assert(src.includes('COMPLAINT'), 'complaint family');
assert(!src.includes('relationship_type: \'APPOINTER_RESOLVES_TO\''), 'no new appointer bridges');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'publication off');
assert(mayPublishRegulatoryEvidence() === false, 'mayPublish false');
assert(publicationReadinessForThisTask() === 'INTERNAL_ONLY', 'internal only');
assert(complaintIsFinalOrder() === false, 'complaint ≠ final');
assert(complaintIsEnforcementFinding() === false, 'complaint ≠ finding');
assert(cmsTerminationIsMisconduct() === false, 'cms ≠ misconduct');
assert(naicStatusIsEnforcementEvent() === false, 'naic status ≠ enforcement');
assert(nameAloneIsEvidenceIdentity() === false, 'no name identity');
assert(affiliationInheritsAdverse() === false, 'no affiliation inherit');
assert(appointmentInheritsAdverse() === false, 'no appointment inherit');
assert(brandInheritsAdverse() === false, 'no brand inherit');
assert(groupInheritsMemberAdverse() === false, 'no group inherit');
assert(personActionDisciplinesAgency() === false, 'person ↛ agency');
assert(agencyActionDisciplinesPerson() === false, 'agency ↛ person');
assert(reviewRequiredMayAttachToCanonicalEntity() === false, 'review no attach');
assert(evidenceMayTraverseBridge('CONFIRMED') === true, 'confirmed traverse');
assert(evidenceMayTraverseBridge('REVIEW_REQUIRED') === false, 'review no traverse');
assert(SAFE_PUBLIC_COPY.noMatch.includes('sources currently included'), 'safe no-match copy');
assert(FORBIDDEN_PUBLIC_COPY.includes('Clean record.'), 'forbid clean record');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal unpublished');

const co = new Set(['19232', '60488']);
const groups = new Set(['8']);
{
  const d = decideLegalInsurerEvidenceIdentity({
    naicId: '19232',
    officialCoCodes: co,
    officialGroupCodes: groups,
  });
  assert(d.confidence === 'CONFIRMED' && d.confidence === 'CONFIRMED' && 'legalInsurerKey' in d, 'exact CoCode');
}
{
  const d = decideLegalInsurerEvidenceIdentity({
    naicId: '',
    officialCoCodes: co,
    officialGroupCodes: groups,
  });
  assert(d.confidence === 'UNRESOLVED', 'missing naic');
}
{
  const d = decideLegalInsurerEvidenceIdentity({
    naicId: '99999',
    officialCoCodes: co,
    officialGroupCodes: groups,
  });
  assert(d.confidence === 'UNRESOLVED', 'unknown naic');
}

assert(existsSync(join(root, 'docs/national/evidence/INS-NAT-FINAL-004-source-inventory.md')), 'source inv');
assert(existsSync(join(root, 'docs/national/evidence/INS-NAT-FINAL-004-evidence-contract.md')), 'contract');
assert(
  existsSync(join(root, 'supabase/migrations/20260827180000_regulatory_evidence_foundation.sql')),
  'migration prepared'
);
const mig = readFileSync(
  join(root, 'supabase/migrations/20260827180000_regulatory_evidence_foundation.sql'),
  'utf8'
);
assert(!/^\s*DROP TABLE/im.test(mig), 'no drop');
assert(!/ALTER TABLE\s+providers/i.test(mig), 'no provider alter');

if (errors.length) {
  console.error('INS-NAT-FINAL-004 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-FINAL-004 PASS taxonomy identity publication traversal');
