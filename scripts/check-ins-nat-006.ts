/**
 * INS-NAT-006 backfill safety tests (no production writes).
 *   npm run check:ins-nat-006
 */
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { selectCanonicalName, CANONICAL_NAME_POLICY } from '../lib/national/canonical-name';
import { isProposedConfirmedCore } from '../lib/national/classification';
import type { EntityClassification } from '../lib/national/classification';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const mig = join(root, 'supabase/migrations/20260826120000_national_identity_graph.sql');
assert(existsSync(mig), 'graph migration missing');
const sql = readFileSync(mig, 'utf8').replace(/\r\n/g, '\n');
assert(
  createHash('sha256').update(sql).digest('hex') ===
    'd918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8',
  'migration hash'
);
assert(!/DROP TABLE providers/i.test(sql), 'must not drop providers');
assert(sql.includes('idx_license_credentials_natural'), 'natural key');

const script = readFileSync(join(root, 'scripts/national/backfill-confirmed-core.ts'), 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(script), 'no provider writes');
assert(script.includes('--execute'), 'execute flag');
assert(script.includes('dry-run') || script.includes('dryRun'), 'dry-run');

{
  const picked = selectCanonicalName([
    {
      sourceDataset: 'texas_tdi',
      legalName: 'ACME',
      licenseNumber: 'B1',
      coreAgencyEligible: false,
    },
    {
      sourceDataset: 'florida_dfs',
      legalName: 'ACME INSURANCE LLC',
      licenseNumber: 'L1',
      coreAgencyEligible: true,
    },
    {
      sourceDataset: 'florida_dfs',
      legalName: 'ACME INS',
      licenseNumber: 'L2',
      coreAgencyEligible: true,
    },
  ]);
  assert(picked.legalName === 'ACME INSURANCE LLC', 'canonical prefers FL core longest name');
  assert(picked.policy === CANONICAL_NAME_POLICY, 'policy constant');
}

{
  const excluded: EntityClassification = {
    identityKey: 'npn:agency:1',
    identityKind: 'npn',
    identityConfidence: 'REVIEW_REQUIRED',
    npn: '12345',
    entityKind: 'agency',
    legalName: 'X',
    credentialCount: 1,
    jurisdictions: ['FL'],
    productClasses: ['core_agency'],
    primaryProductClass: 'core_agency',
    coreAgencyEligible: true,
    currentCoreAgency: null,
    classificationUnknown: false,
    mixedCredential: false,
    locationNetwork: false,
    publishedAny: false,
  };
  assert(!isProposedConfirmedCore(excluded), 'REVIEW_REQUIRED excluded from cohort');
}

if (errors.length) {
  console.error('INS-NAT-006 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-006 PASS safety + canonical-name');
