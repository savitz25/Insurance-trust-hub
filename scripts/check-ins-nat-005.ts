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
const sql = readFileSync(mig, 'utf8');
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

// Empty Ohio remains unknown (C8 preserved)
{
  const oh = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'empty',
      jurisdiction: 'OH',
      licenseNumber: '17065496',
      licenseClass: null,
      licenseTypes: [],
      legalName: '1 2 3 ASAP BAIL LLC',
      npn: '17065496',
    })
  );
  assert(!oh.coreAgencyEligible, 'empty Ohio not core');
  assert(oh.classificationUnknown, 'empty Ohio unknown');
  assert(oh.confidence === 'UNRESOLVED', 'empty Ohio unresolved');
}

// Official Major Lines → core
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'maj',
      jurisdiction: 'OH',
      licenseNumber: '20061156',
      licenseClass: 'Major Lines',
      licenseTypes: ['Major Lines'],
      npn: '20061156',
    })
  );
  assert(c.coreAgencyEligible, 'OH Major Lines core');
  assert(c.primaryProductClass === 'core_agency', 'OH Major Lines product');
  assert(c.confidence === 'CONFIRMED', 'OH Major Lines confirmed');
  assert(c.evidence.licenseClass === 'Major Lines', 'raw preserved');
}

// Official bail → not core
{
  const c = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'bail',
      jurisdiction: 'OH',
      licenseNumber: '21375625',
      licenseClass: 'Surety Bail Bond',
      licenseTypes: ['Surety Bail Bond'],
      legalName: '#1 APEX BAIL BONDING LLC',
      npn: '21375625',
    })
  );
  assert(!c.coreAgencyEligible, 'OH bail not core');
  assert(c.primaryProductClass === 'bail', 'OH bail product');
}

// Title / surplus / TPA / adjuster / limited lines
{
  const title = lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: 'Title',
  });
  assert(!title.coreAgencyEligible && title.productClass === 'title', 'OH title');
  const surplus = lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: 'Surplus Lines',
  });
  assert(!surplus.coreAgencyEligible && surplus.productClass === 'specialty_insurance', 'OH surplus');
  const tpa = lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: 'Third Party Administrator',
  });
  assert(tpa.productClass === 'tpa', 'OH TPA');
  const adj = lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: 'Public Insurance Adjuster',
  });
  assert(adj.productClass === 'claims_service', 'OH public adjuster');
  const lim = lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: 'Limited Lines',
  });
  assert(lim.productClass === 'ancillary_distribution', 'OH limited lines');
}

// FL classification does not determine Ohio credential class
{
  const { entities, credentials } = classifyAndRollup([
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl',
      jurisdiction: 'FL',
      licenseNumber: 'L1',
      licenseClass: 'AGENCY LICENSE',
      npn: '55555',
    }),
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'oh',
      jurisdiction: 'OH',
      licenseNumber: '55555',
      licenseClass: 'Surety Bail Bond',
      npn: '55555',
    }),
  ]);
  assert(entities.length === 1, 'same NPN one entity');
  assert(entities[0]!.coreAgencyEligible, 'entity core from FL');
  const ohCred = credentials.find((c) => c.jurisdiction === 'OH')!;
  assert(ohCred.primaryProductClass === 'bail', 'Ohio credential remains bail');
  assert(!ohCred.coreAgencyEligible, 'Ohio bail credential itself is not core');
}

if (errors.length) {
  console.error('INS-NAT-005 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-005 PASS registryVersion=' + CLASSIFICATION_REGISTRY_VERSION);
