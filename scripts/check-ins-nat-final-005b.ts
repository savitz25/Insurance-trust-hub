/**
 * INS-NAT-FINAL-005B reconciliation tests.
 *   npm run check:ins-nat-final-005b
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../lib/national/regulatory-evidence';
import {
  buildExpectedConfirmedBridges,
  classifyAgencyPublicationReadiness,
  decideProviderAgencyBridge,
  nameOnlyProviderBridges,
  npnAloneIsNotCredential,
  reconcileProviderBridges,
} from '../lib/national/provider-graph-bridge';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/run-ins-nat-final-005b.ts'), 'utf8');
const mig = readFileSync(
  join(root, 'supabase/migrations/20260827180000_regulatory_evidence_foundation.sql'),
  'utf8'
);
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const robots = readFileSync(join(root, 'app/robots.ts'), 'utf8');

assert(existsSync(join(root, 'scripts/national/run-ins-nat-final-005b.ts')), '005b runner');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'no provider writes');
assert(!/generate_sitemap|app\/robots/.test(src), 'no sitemap/robots');
assert(!/FL-INS-000/.test(src), 'no Florida');
assert(/Do(?:es)? not start FINAL-006/i.test(src), 'no FINAL-006 start');
assert(src.includes('--execute'), 'execute gate');
assert(!/TRUNCATE/i.test(src), 'no truncate');
assert(src.includes('.delete()'), 'stale delete');
assert(src.includes('not_in_deterministic_confirmed_set') || src.includes('staleExtra'), 'stale path');

// T1 evidence migration columns visible in source
assert(mig.includes('ADD COLUMN IF NOT EXISTS evidence_family'), 'T1 family');
assert(mig.includes('ADD COLUMN IF NOT EXISTS publication_readiness'), 'T1 readiness');
assert(mig.includes('ADD COLUMN IF NOT EXISTS evidence_subtype'), 'T1 subtype');
assert(src.includes('schemaHasEvidenceFamily'), 'T1 probe');

// T2 / T4 backfill mapping + skip
assert(src.includes("evidence_family: raw.family || 'COMPLAINT'"), 'T2 family');
assert(src.includes("evidence_subtype: raw.subtype || 'CONFIRMED_COMPLAINT_INDEX'"), 'T2 subtype');
assert(src.includes("publication_readiness: 'INTERNAL_ONLY'"), 'T2 internal');
assert(src.includes('is_final: false'), 'T2 is_final');
assert(src.includes("row.evidence_family === 'COMPLAINT'"), 'T4 skip already');
assert(src.includes('backfill2') || src.includes('second'), 'T4 second pass');

// T3 unresolved stay NULL — backfill does not set entity_id
assert(!/entity_id:\s*[^n]/.test(src.match(/const patch = \{[\s\S]*?\};/)?.[0] || 'entity_id: x'), 'T3 no attach');
assert((src.match(/const patch = \{[\s\S]*?\};/)?.[0] || '').includes('respondent_kind'), 'T3 patch');
assert(!(src.match(/const patch = \{[\s\S]*?\};/)?.[0] || '').includes('entity_id:'), 'T3 no entity_id write');

// T5 stable provider pagination
assert(src.includes(".order('id', { ascending: true })"), 'T5 order id');
assert(src.includes(".gt('id', lastId)"), 'T5 keyset');

// T6 deterministic exact bridge set
{
  const agenciesByNpn = new Map([['1234567', ['ag-1']]]);
  const providersByNpn = new Map([['1234567', ['p-1']]]);
  const expected = buildExpectedConfirmedBridges({
    providers: [
      { id: 'p-1', npn: '1234567' },
      { id: 'p-2', npn: null },
    ],
    agenciesByNpn,
    providersByNpn,
  });
  assert(expected.length === 1 && expected[0]!.providerId === 'p-1' && expected[0]!.entityId === 'ag-1', 'T6');
}

// T7 stale bridge detection
{
  const r = reconcileProviderBridges({
    expected: [{ providerId: 'p-1', entityId: 'ag-1', npn: '1' }],
    existing: [
      {
        id: 'b-stale',
        providerId: 'p-stale',
        entityId: 'ag-x',
        matchMethod: 'exact_npn',
        confidence: 'CONFIRMED',
        source: 'INS-NAT-FINAL-005',
        notes: null,
        matchedAt: '2026-08-28',
      },
      {
        id: 'b-ok',
        providerId: 'p-1',
        entityId: 'ag-1',
        matchMethod: 'exact_npn',
        confidence: 'CONFIRMED',
        source: 'INS-NAT-FINAL-005',
        notes: null,
        matchedAt: '2026-08-28',
      },
    ],
  });
  assert(r.summary.staleExtra === 1 && r.staleExtra[0]!.providerId === 'p-stale', 'T7');
  assert(r.summary.existingCorrect === 1, 'T7 correct');
}

// T8 stale cleanup is targeted delete, not truncate
assert(/\.delete\(\)\.in\('id'/.test(src) || src.includes(".delete().in('id'"), 'T8 delete by id');
assert(!/delete\(\)\s*;/.test(src), 'T8 no unfiltered delete');

// T9 wrong target detection
{
  const r = reconcileProviderBridges({
    expected: [{ providerId: 'p-1', entityId: 'ag-1', npn: '1' }],
    existing: [
      {
        id: 'b-1',
        providerId: 'p-1',
        entityId: 'ag-WRONG',
        matchMethod: 'exact_npn',
        confidence: 'CONFIRMED',
        source: 'INS-NAT-FINAL-005',
        notes: null,
        matchedAt: null,
      },
    ],
  });
  assert(r.summary.wrongTarget === 1 && r.wrongTarget[0]!.expectedEntityId === 'ag-1', 'T9');
}

// T10 no REVIEW_REQUIRED production bridge
{
  const d = decideProviderAgencyBridge({
    providerNpn: '1234567',
    agencyIdsForNpn: ['a', 'b'],
    otherProviderIdsForNpn: [],
  });
  assert(d.action === 'hold' && d.confidence === 'REVIEW_REQUIRED', 'T10 hold');
  assert(!src.includes("confidence: 'REVIEW_REQUIRED'"), 'T10 no review insert');
}

// T11 no name-based bridge
assert(nameOnlyProviderBridges() === false, 'T11');
assert(!/legal_name|displayName/.test(src.match(/buildExpectedConfirmedBridges[\s\S]{0,400}/)?.[0] || ''), 'T11 expected from NPN');

// T12 agency NPN alone does not satisfy hasCredential
{
  const r = classifyAgencyPublicationReadiness({
    identityConfidence: 'CONFIRMED',
    hasNpn: true,
    hasCredential: false,
    kindCollision: false,
  });
  assert(r === 'NOT_READY', 'T12');
  assert(npnAloneIsNotCredential() === true, 'T12 helper');
}

// T13 actual credential satisfies hasCredential
{
  const r = classifyAgencyPublicationReadiness({
    identityConfidence: 'CONFIRMED',
    hasNpn: true,
    hasCredential: true,
    kindCollision: false,
  });
  assert(r === 'READY_FOR_PUBLIC_PROFILE', 'T13');
}

// T14 readiness counts reproducible
{
  const a = classifyAgencyPublicationReadiness({
    identityConfidence: 'CONFIRMED',
    hasNpn: true,
    hasCredential: true,
    kindCollision: false,
  });
  const b = classifyAgencyPublicationReadiness({
    identityConfidence: 'CONFIRMED',
    hasNpn: true,
    hasCredential: true,
    kindCollision: false,
  });
  assert(a === b && a === 'READY_FOR_PUBLIC_PROFILE', 'T14');
  assert(src.includes('credentialEntityIds.has(a.id)'), 'T14 uses credential set');
  assert(!/hasCredential:\s*Boolean\(a\.npn\)/.test(src), 'T14 not npn-as-credential');
}

// T15 no index/publication expansion
assert(mayPublishEntityKind('person') === false, 'T15 people');
assert(mayPublishEntityKind('legal_insurer') === false, 'T15 legal');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'T15 flag');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'T15 evidence off');
assert(src.includes('publicGraphAgenciesPublished: 0'), 'T15 no mass publish');
assert(!/\/agencies\//.test(sitemap), 'T15 sitemap');
assert(/\/admin/.test(robots), 'T15 robots');

// T16 second reconciliation zero delta
{
  const expected = [{ providerId: 'p-1', entityId: 'ag-1', npn: '1' }];
  const existing = [
    {
      id: 'b-1',
      providerId: 'p-1',
      entityId: 'ag-1',
      matchMethod: 'exact_npn' as const,
      confidence: 'CONFIRMED',
      source: 'INS-NAT-FINAL-005B',
      notes: null,
      matchedAt: null,
    },
  ];
  const r = reconcileProviderBridges({ expected, existing });
  assert(
    r.summary.missing === 0 &&
      r.summary.staleExtra === 0 &&
      r.summary.wrongTarget === 0 &&
      r.summary.duplicate === 0 &&
      r.summary.existingCorrect === 1,
    'T16'
  );
}

assert(existsSync(join(root, 'docs/national/publication/INS-NAT-FINAL-005-provider-graph-bridge.md')), 'docs');

if (errors.length) {
  console.error('INS-NAT-FINAL-005B FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-FINAL-005B PASS T1-T16 backfill reconcile readiness');
