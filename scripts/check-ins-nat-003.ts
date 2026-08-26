/**
 * INS-NAT-003 classification + denominator tests (no production writes).
 *   npm run check:ins-nat-003
 */
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import {
  CLASSIFICATION_REGISTRY_VERSION,
  classifyAndRollup,
  classifyCredential,
  lookupClassification,
  researchDenominators,
  snapshotSourceEvidence,
  SOURCE_OFFICIAL_SUPPORT,
  MIXED_CREDENTIAL_POLICY,
} from '../lib/national/classification';
import { floridaRepeatedNpnMetrics } from '../lib/national/metrics';
import { mayPromoteToPublicProvider } from '../lib/national/publication';
import type { ClassificationInput } from '../lib/national/classification';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const mig = join(root, 'supabase/migrations/20260826120000_national_identity_graph.sql');
assert(existsSync(mig), 'graph migration must still exist');
const sql = readFileSync(mig, 'utf8');
const hash = createHash('sha256').update(sql).digest('hex');
assert(
  hash === 'd918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8',
  `graph SQL hash changed: ${hash}`
);
assert(!/DROP TABLE providers/i.test(sql), 'must not drop providers');

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

// ---------------------------------------------------------------------------
// C1 — Core agency credential → core eligible
// ---------------------------------------------------------------------------
{
  const fl = classifyCredential(
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c1-fl',
      jurisdiction: 'FL',
      licenseNumber: 'L1',
      licenseClass: 'AGENCY LICENSE',
      npn: '11111',
    })
  );
  assert(fl.coreAgencyEligible, 'C1 FL agency license should be core eligible');
  assert(fl.primaryProductClass === 'core_agency', 'C1 FL product class');
  assert(fl.evidence.licenseClass === 'AGENCY LICENSE', 'C1 preserves raw class');
  assert(fl.confidence === 'CONFIRMED', 'C1 FL confirmed');

  const tx = classifyCredential(
    cred({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'c1-tx',
      jurisdiction: 'TX',
      licenseNumber: 'A1',
      licenseClass: 'General Lines Agency',
      npn: '11111',
    })
  );
  assert(tx.coreAgencyEligible, 'C1 TX general lines should be core eligible');
}

// ---------------------------------------------------------------------------
// C2 — Bail credential retained but not core
// ---------------------------------------------------------------------------
{
  const bail = classifyCredential(
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c2',
      jurisdiction: 'FL',
      licenseNumber: 'B1',
      licenseClass: 'BAIL BOND AGENCY LICENSE',
      npn: '22222',
    })
  );
  assert(!bail.coreAgencyEligible, 'C2 bail is not core eligible');
  assert(bail.primaryProductClass === 'bail', 'C2 product class bail');
  assert(bail.rawTypesPreserved.includes('BAIL BOND AGENCY LICENSE'), 'C2 raw retained');
}

// ---------------------------------------------------------------------------
// C3 — Adjuster credential retained separately from producer agency
// ---------------------------------------------------------------------------
{
  const adj = classifyCredential(
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c3',
      jurisdiction: 'FL',
      licenseNumber: 'P1',
      licenseClass: 'PUBLIC ADJUSTING FIRM',
      npn: '33333',
    })
  );
  assert(!adj.coreAgencyEligible, 'C3 adjuster not core');
  assert(adj.primaryProductClass === 'claims_service', 'C3 claims_service');
  assert(adj.licenseNamespaces.includes('adjuster'), 'C3 adjuster namespace');
}

// ---------------------------------------------------------------------------
// C4 — Warranty credential retained but classified independently
// ---------------------------------------------------------------------------
{
  const w = classifyCredential(
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c4',
      jurisdiction: 'FL',
      licenseNumber: 'W1',
      licenseClass: 'SERVICE WARRANTY',
      npn: '44444',
    })
  );
  assert(!w.coreAgencyEligible, 'C4 warranty not core');
  assert(w.primaryProductClass === 'warranty_service', 'C4 warranty_service');
  const auto = classifyCredential(
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c4b',
      jurisdiction: 'FL',
      licenseNumber: 'G1',
      licenseClass: 'AUTOMOBILE WARRANTY',
      npn: '44445',
    })
  );
  assert(auto.primaryProductClass === 'warranty_service', 'C4 auto warranty independent');
}

// ---------------------------------------------------------------------------
// C5 — One entity with core + specialty credentials counted once as core
// ---------------------------------------------------------------------------
{
  const { entities, credentials } = classifyAndRollup([
    cred({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'c5a',
      jurisdiction: 'TX',
      licenseNumber: 'GL1',
      licenseClass: 'General Lines Agency',
      npn: '55555',
      legalName: 'Mixed Co',
    }),
    cred({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'c5b',
      jurisdiction: 'TX',
      licenseNumber: 'SL1',
      licenseClass: 'Surplus Lines Agency',
      npn: '55555',
      legalName: 'Mixed Co',
    }),
  ]);
  assert(credentials.length === 2, 'C5 two credentials');
  assert(entities.length === 1, 'C5 one entity');
  assert(entities[0]!.coreAgencyEligible, 'C5 entity core eligible');
  assert(entities[0]!.primaryProductClass === 'core_agency', 'C5 counted as core');
  assert(entities[0]!.mixedCredential, 'C5 mixed flag');
  assert(MIXED_CREDENTIAL_POLICY.includes('at_least_one_core'), 'C5 policy constant');
}

// ---------------------------------------------------------------------------
// C6 — One NPN with 100 licensed locations = one national entity
// ---------------------------------------------------------------------------
{
  const rows: ClassificationInput[] = [];
  for (let i = 0; i < 100; i++) {
    rows.push(
      cred({
        sourceDataset: 'florida_dfs',
        sourceRecordId: `c6-${i}`,
        jurisdiction: 'FL',
        licenseNumber: `LOC${i}`,
        licenseClass: 'AGENCY LICENSE',
        npn: '66666',
        legalName: 'Retail Network Inc',
      })
    );
  }
  const { entities, credentials } = classifyAndRollup(rows);
  assert(credentials.length === 100, 'C6 100 credentials');
  assert(entities.length === 1, 'C6 one entity not 100 agencies');
  assert(entities[0]!.locationNetwork, 'C6 location network flag');
}

// ---------------------------------------------------------------------------
// C7 — Credential count remains 100 where 100 legitimate credentials exist
// ---------------------------------------------------------------------------
{
  const rows: ClassificationInput[] = [];
  for (let i = 0; i < 100; i++) {
    rows.push(
      cred({
        sourceDataset: 'florida_dfs',
        sourceRecordId: `c7-${i}`,
        jurisdiction: 'FL',
        licenseNumber: `CRED${i}`,
        licenseClass: i % 2 === 0 ? 'AGENCY LICENSE' : 'SERVICE WARRANTY',
        npn: String(70000 + i),
      })
    );
  }
  const { credentials } = classifyAndRollup(rows);
  const d = researchDenominators(credentials, classifyAndRollup(rows).entities);
  assert(d.credentialsMonitored === 100, 'C7 credentials monitored = 100');
  assert(d.sourceRecords === 100, 'C7 source records = 100');
}

// ---------------------------------------------------------------------------
// C8 — Unknown Ohio credential class does not silently become core eligible
// ---------------------------------------------------------------------------
{
  const oh = classifyCredential(
    cred({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'c8',
      jurisdiction: 'OH',
      licenseNumber: '17065496',
      licenseClass: null,
      licenseTypes: [],
      legalName: '1 2 3 ASAP BAIL LLC',
      npn: '88888',
    })
  );
  assert(!oh.coreAgencyEligible, 'C8 Ohio empty class is not core');
  assert(oh.classificationUnknown, 'C8 unknown');
  assert(oh.primaryProductClass === 'unknown', 'C8 product unknown');
  assert(oh.confidence === 'UNRESOLVED', 'C8 unresolved');
  const named = lookupClassification({
    jurisdiction: 'OH',
    sourceDataset: 'ohio_odi',
    rawType: '',
  });
  assert(!named.coreAgencyEligible, 'C8 registry empty Ohio not core');
}

// ---------------------------------------------------------------------------
// C9 — Inactive/expired credential does not establish current core agency
// ---------------------------------------------------------------------------
{
  const expiredOnly = classifyAndRollup([
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c9a',
      jurisdiction: 'FL',
      licenseNumber: 'E1',
      licenseClass: 'AGENCY LICENSE',
      npn: '99991',
      regulatoryStatus: 'expired',
    }),
  ]);
  assert(expiredOnly.entities[0]!.coreAgencyEligible, 'C9 still core-eligible historically');
  assert(expiredOnly.entities[0]!.currentCoreAgency === false, 'C9 not current from expired');

  const mixedStatus = classifyAndRollup([
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c9b',
      jurisdiction: 'FL',
      licenseNumber: 'E2',
      licenseClass: 'AGENCY LICENSE',
      npn: '99992',
      regulatoryStatus: 'expired',
    }),
    cred({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'c9c',
      jurisdiction: 'TX',
      licenseNumber: 'A9',
      licenseClass: 'General Lines Agency',
      npn: '99992',
      regulatoryStatus: 'active',
    }),
  ]);
  assert(mixedStatus.entities[0]!.currentCoreAgency === true, 'C9 other current credential qualifies');
}

// ---------------------------------------------------------------------------
// C10 — Publication status does not control research denominator
// ---------------------------------------------------------------------------
{
  const rows: ClassificationInput[] = [
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c10a',
      jurisdiction: 'FL',
      licenseNumber: 'PUB1',
      licenseClass: 'AGENCY LICENSE',
      npn: '10101',
      published: true,
    }),
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c10b',
      jurisdiction: 'FL',
      licenseNumber: 'PUB2',
      licenseClass: 'AGENCY LICENSE',
      npn: '10102',
      published: false,
    }),
  ];
  const { credentials, entities } = classifyAndRollup(rows);
  const d = researchDenominators(credentials, entities);
  assert(d.coreAgencyEntities === 2, 'C10 both published and unpublished count in research');
  assert(d.confirmedIdentities === 2, 'C10 identities ignore publication');
  const pubGate = mayPromoteToPublicProvider({ entityKind: 'person' });
  assert(!pubGate.ok, 'C10 person publication still gated');
}

// ---------------------------------------------------------------------------
// C11 — Raw regulator terminology remains preserved
// ---------------------------------------------------------------------------
{
  const raw = 'PORTABLE ELECTRONICS OR EYEWEAR - AGENT';
  const c = classifyCredential(
    cred({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c11',
      jurisdiction: 'FL',
      licenseNumber: 'PE1',
      licenseClass: raw,
      licenseTypes: [raw],
      npn: '11112',
    })
  );
  assert(c.evidence.licenseClass === raw, 'C11 licenseClass frozen');
  assert(c.rawTypesPreserved[0] === raw, 'C11 raw types preserved');
  assert(c.primaryProductClass === 'ancillary_distribution', 'C11 classified as ancillary');
}

// ---------------------------------------------------------------------------
// C12 — Changing a normalized classification does not rewrite historical source evidence
// ---------------------------------------------------------------------------
{
  const input = cred({
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'c12',
    jurisdiction: 'FL',
    licenseNumber: 'H1',
    licenseClass: 'HOME WARRANTY',
    licenseTypes: ['HOME WARRANTY'],
    npn: '12121',
  });
  const before = JSON.parse(JSON.stringify(snapshotSourceEvidence(input)));
  const classified = classifyCredential(input);
  assert(classified.primaryProductClass === 'warranty_service', 'C12 classified');
  const after = snapshotSourceEvidence(input);
  assert(JSON.stringify(after) === JSON.stringify(before), 'C12 input evidence unchanged');
  assert(classified.evidence.licenseClass === 'HOME WARRANTY', 'C12 overlay keeps snapshot');
  assert(classified.registryVersion === CLASSIFICATION_REGISTRY_VERSION, 'C12 versioned overlay');
  const v1 = lookupClassification({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs',
    rawType: 'HOME WARRANTY',
  });
  assert(v1.registryVersion === CLASSIFICATION_REGISTRY_VERSION, 'C12 registry version pinned on entry');
}

// ---------------------------------------------------------------------------
// C13 — Records / credentials / identities / repeated-identity percentages
// ---------------------------------------------------------------------------
{
  const rows = [
    { jurisdiction: 'FL', npn: '1'.repeat(6) },
    { jurisdiction: 'FL', npn: '1'.repeat(6) },
    { jurisdiction: 'FL', npn: '1'.repeat(6) },
    { jurisdiction: 'FL', npn: '2'.repeat(6) },
    { jurisdiction: 'FL', npn: '3'.repeat(6) },
    { jurisdiction: 'FL', npn: null },
  ];
  const m = floridaRepeatedNpnMetrics(rows);
  assert(m.records === 6, 'C13 records=6');
  assert(m.validNpnRows === 5, 'C13 valid NPN rows=5');
  assert(m.distinctNpnIdentities === 3, 'C13 distinct NPN=3');
  assert(m.npnsWithMultipleCredentials === 1, 'C13 one repeated NPN');
  assert(m.extraRowsBeyondFirstIdentity === 2, 'C13 extra rows=2');
  assert(m.rowsInRepeatedNpnGroups === 3, 'C13 rows in repeated groups=3');
  assert(Math.abs(m.percentRowsInRepeatedNpnGroups - 3 / 6) < 1e-9, 'C13 50% of records in repeated groups');
  assert(Math.abs(m.percentDistinctNpnOfRecords - 3 / 6) < 1e-9, 'C13 50% distinct NPN of records');
  assert(
    m.unsupportedClaim.includes('distinct-NPN identities divided by Florida records'),
    'C13 documents the 79% error'
  );
}

// Registry / policy sanity
assert(SOURCE_OFFICIAL_SUPPORT.OH.notes.toLowerCase().includes('do not infer'), 'Ohio official note');
assert(SOURCE_OFFICIAL_SUPPORT.NV.notes.toLowerCase().includes('provisional'), 'NV provisional note');
assert(SOURCE_OFFICIAL_SUPPORT.MS.notes.toLowerCase().includes('provisional'), 'MS provisional note');

{
  const nv = classifyAndRollup([
    cred({
      sourceDataset: 'nevada_doi',
      sourceRecordId: 'nv1',
      jurisdiction: 'NV',
      licenseNumber: 'NV1',
      licenseClass: 'Resident Producer Firm',
      npn: null,
    }),
  ]);
  assert(nv.credentials[0]!.coreAgencyEligible, 'NV producer firm is core role');
  assert(nv.entities[0]!.identityKind === 'provisional', 'NV missing NPN stays provisional');
}

{
  const ms = classifyAndRollup([
    cred({
      sourceDataset: 'mississippi_mid',
      sourceRecordId: 'ms1',
      jurisdiction: 'MS',
      licenseNumber: 'MS1',
      licenseClass: 'Insurance Producer Entity',
      npn: null,
    }),
  ]);
  assert(ms.credentials[0]!.coreAgencyEligible, 'MS producer entity is core role');
  assert(ms.entities[0]!.identityKind === 'provisional', 'MS missing NPN stays provisional');
}

if (errors.length) {
  console.error('INS-NAT-003 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-003 PASS C1–C13 registryVersion=' + CLASSIFICATION_REGISTRY_VERSION);
