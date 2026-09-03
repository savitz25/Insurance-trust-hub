/**
 * INS-NAT-005 Ohio class recovery + graph-SQL package tests (no production graph writes).
 *   npm run check:ins-nat-005
 */
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import {
  CLASSIFICATION_REGISTRY_VERSION,
  classifyCredential,
  classifyAndRollup,
  isProposedConfirmedCore,
  lookupClassification,
} from '../lib/national/classification';
import type { ClassificationInput } from '../lib/national/classification';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const mig = join(root, 'supabase/migrations/20260826120000_national_identity_graph.sql');
assert(existsSync(mig), 'migration file missing');
const sql = readFileSync(mig, 'utf8').replace(/\r\n/g, '\n');
const hash = createHash('sha256').update(sql).digest('hex');
assert(
  hash === 'd918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8',
  `migration hash ${hash}`
);
assert(!/DROP TABLE providers/i.test(sql), 'must not drop providers');
assert(!/ALTER TABLE providers/i.test(sql), 'must not alter providers');
assert(sql.includes('CREATE TABLE IF NOT EXISTS national_entities'), 'national_entities');
assert(sql.includes('CREATE TABLE IF NOT EXISTS license_credentials'), 'license_credentials');
assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS');

const editorDoc = join(root, 'docs/INS-NAT-005-GRAPH-SQL-EDITOR.md');
assert(existsSync(editorDoc), 'SQL editor action package missing');
const doc = readFileSync(editorDoc, 'utf8');
assert(doc.includes('d918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8'), 'doc hash');
assert(/provider impact:\s*\*\*NONE\*\*/i.test(doc), 'doc provider impact NONE');

assert(CLASSIFICATION_REGISTRY_VERSION === '1.1.0', 'registry 1.1.0');

function cred(
  partial: Partial<ClassificationInput> &
    Pick<ClassificationInput, 'sourceDataset' | 'sourceRecordId' | 'jurisdiction' | 'licenseNumber'>
): ClassificationInput {
  return {
    entityKind: 'agency',
    legalName: partial.legalName || 'Test Agency LLC',
    ...partial,
  };
}

// OH1 — confirmed major-lines producer/business entity → core
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh1',
      jurisdiction: 'OH',
      licenseNumber: '20061156',
      licenseClass: 'Major Lines',
      licenseTypes: ['Major Lines'],
      npn: '20061156',
    })
  );
  assert(c.coreAgencyEligible, 'OH1 Major Lines core eligible');
  assert(c.primaryProductClass === 'core_agency', 'OH1 product core_agency');
  assert(c.confidence === 'CONFIRMED', 'OH1 confirmed');
  assert(c.evidence.licenseClass === 'Major Lines', 'OH1 raw preserved');
}

// OH2 — limited-line credential → not ordinary core agency
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh2',
      jurisdiction: 'OH',
      licenseNumber: 'LL1',
      licenseClass: 'Limited Lines',
      licenseTypes: ['Limited Lines'],
      npn: '20000002',
    })
  );
  assert(!c.coreAgencyEligible, 'OH2 limited lines not core');
  assert(c.primaryProductClass === 'ancillary_distribution', 'OH2 ancillary');
}

// OH3 — title → TITLE specialty, not primary core
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh3',
      jurisdiction: 'OH',
      licenseNumber: 'T1',
      licenseClass: 'Title',
      licenseTypes: ['Title'],
      npn: '20000003',
    })
  );
  assert(!c.coreAgencyEligible, 'OH3 title not core');
  assert(c.primaryProductClass === 'title', 'OH3 title product');
  assert(lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: 'Title',
  }).productClass === 'title', 'OH3 registry title');
}

// OH4 — bail → BAIL, not core
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh4',
      jurisdiction: 'OH',
      licenseNumber: '21375625',
      licenseClass: 'Surety Bail Bond',
      licenseTypes: ['Surety Bail Bond'],
      legalName: '#1 APEX BAIL BONDING LLC',
      npn: '21375625',
    })
  );
  assert(!c.coreAgencyEligible, 'OH4 bail not core');
  assert(c.primaryProductClass === 'bail', 'OH4 bail product');
}

// OH5 — public adjuster → CLAIMS, not core
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh5',
      jurisdiction: 'OH',
      licenseNumber: 'PA1',
      licenseClass: 'Public Insurance Adjuster',
      licenseTypes: ['Public Insurance Adjuster'],
      npn: '20000005',
    })
  );
  assert(!c.coreAgencyEligible, 'OH5 adjuster not core');
  assert(c.primaryProductClass === 'claims_service', 'OH5 claims_service');
}

// OH6 — unknown official class → UNKNOWN, never silently core (even if name says BAIL)
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh6',
      jurisdiction: 'OH',
      licenseNumber: '17065496',
      licenseClass: null,
      licenseTypes: [],
      legalName: '1 2 3 ASAP BAIL LLC',
      npn: '17065496',
    })
  );
  assert(!c.coreAgencyEligible, 'OH6 empty not core');
  assert(c.classificationUnknown, 'OH6 unknown');
  assert(c.confidence === 'UNRESOLVED', 'OH6 unresolved');
  assert(c.primaryProductClass === 'unknown', 'OH6 product unknown');
}

// OH7 — same NPN: Ohio unknown + FL confirmed core
{
  const { entities, credentials } = classifyAndRollup([
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'oh7fl',
      jurisdiction: 'FL',
      licenseNumber: 'L1',
      licenseClass: 'AGENCY LICENSE',
      npn: '70000007',
    }),
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh7oh',
      jurisdiction: 'OH',
      licenseNumber: '70000007',
      licenseClass: null,
      licenseTypes: [],
      npn: '70000007',
    }),
  ]);
  assert(entities.length === 1, 'OH7 one entity');
  assert(entities[0]!.coreAgencyEligible, 'OH7 entity core from FL');
  assert(isProposedConfirmedCore(entities[0]!), 'OH7 in proposed cohort via FL');
  const ohCred = credentials.find((c) => c.jurisdiction === 'OH')!;
  assert(ohCred.classificationUnknown, 'OH7 Ohio credential remains unknown');
  assert(!ohCred.coreAgencyEligible, 'OH7 Ohio credential not core');
}

// OH8 — same NPN: Ohio specialty + TX core
{
  const { entities, credentials } = classifyAndRollup([
    cred({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'oh8tx',
      jurisdiction: 'TX',
      licenseNumber: 'GL1',
      licenseClass: 'General Lines Agency',
      npn: '80000008',
    }),
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh8oh',
      jurisdiction: 'OH',
      licenseNumber: '80000008',
      licenseClass: 'Surplus Lines',
      licenseTypes: ['Surplus Lines'],
      npn: '80000008',
    }),
  ]);
  assert(entities.length === 1, 'OH8 one entity');
  assert(entities[0]!.coreAgencyEligible, 'OH8 entity core from TX');
  assert(entities[0]!.primaryProductClass === 'core_agency', 'OH8 counted once as core');
  const ohCred = credentials.find((c) => c.jurisdiction === 'OH')!;
  assert(ohCred.primaryProductClass === 'specialty_insurance', 'OH8 Ohio remains specialty');
  assert(!ohCred.coreAgencyEligible, 'OH8 Ohio surplus credential not core');
}

// OH9 — Ohio-only unknown not in confirmed-core backfill cohort
{
  const { entities } = classifyAndRollup([
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh9',
      jurisdiction: 'OH',
      licenseNumber: '7891248',
      licenseClass: null,
      licenseTypes: [],
      legalName: 'BENEFITS ADVISORS OF OHIO INC',
      npn: '7891248',
    }),
  ]);
  assert(entities.length === 1, 'OH9 one identity');
  assert(entities[0]!.classificationUnknown, 'OH9 unknown');
  assert(!entities[0]!.coreAgencyEligible, 'OH9 not core');
  assert(!isProposedConfirmedCore(entities[0]!), 'OH9 excluded from confirmed-core cohort');
}

if (errors.length) {
  console.error('INS-NAT-005 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-005 PASS OH1–OH9 registryVersion=' + CLASSIFICATION_REGISTRY_VERSION);
