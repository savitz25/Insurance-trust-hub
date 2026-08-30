/**
 * Production-graph semantic smoke for Insurance Ask.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Does not ingest. Does not load million-row tables.
 *   npx tsx scripts/check-insurance-ask-live.ts
 */
import { loadLocalEnv } from './lib/load-local-env';
import { executeInsuranceAsk } from '../lib/insurance-ask/execute';
import { INSURANCE_ASK_PAGE_SIZE } from '../lib/insurance-ask/contract';

loadLocalEnv();

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

async function main() {
  const times: Record<string, number> = {};

  async function run(label: string, text: string, page = 1) {
    const r = await executeInsuranceAsk(text, page);
    times[label] = r.elapsedMs;
    console.log(`${label}: ${r.resultType} class=${r.entityClass} n=${r.results.length} total=${r.pagination.total} ${r.elapsedMs}ms`);
    return r;
  }

  const fl = await run('FL agencies', 'Show insurance agencies credentialed in Florida.');
  assert(fl.resultType === 'entity', 'FL entity mode');
  assert(fl.entityClass === 'agency', 'FL agency class');
  assert(fl.results.length > 0, 'FL agencies return identities');
  assert(fl.results.length <= INSURANCE_ASK_PAGE_SIZE, 'page size capped');
  assert(fl.results.every((row) => row.entityClass === 'agency'), 'no person/insurer mixed into FL agency list');
  assert(fl.results.every((row) => row.credentialJurisdiction === 'FL'), 'FL credential jurisdiction');
  assert(fl.results.every((row) => /credential jurisdiction/.test(row.whyMatched)), 'why this matched names credential jurisdiction');
  assert(
    fl.results.every((row) => /not service territory/i.test(row.whyMatched) && !/\brecommend(ed|s)?\b/i.test(row.whyMatched)),
    'why-matched denies service territory and does not recommend',
  );
  assert(fl.pagination.total > 1000, 'FL agency universe is a census, not a handful');
  const npns = fl.results.map((r) => r.npn).filter(Boolean);
  assert(npns.length > 0, 'at least one NPN on page 1');
  const again = await run('FL agencies repeat', 'Show insurance agencies credentialed in Florida.');
  assert(again.results.map((r) => r.entityId).join() === fl.results.map((r) => r.entityId).join(), 'deterministic page 1');

  const page2 = await run('FL agencies p2', 'Show insurance agencies credentialed in Florida.', 2);
  assert(page2.results[0]?.entityId !== fl.results[0]?.entityId, 'page 2 is a different page');

  const pc = await run(
    'FL P+C',
    'Show insurance agencies credentialed in Florida with Property and Casualty lines of authority.',
  );
  assert(pc.parsed.query.entityClass === 'agency', 'P+C agency');
  assert(pc.parsed.query.jurisdiction?.meaning === 'credential_jurisdiction', 'P+C geo');
  assert(JSON.stringify(pc.parsed.query.linesOfAuthority) === JSON.stringify(['Property', 'Casualty']), 'P+C LOAs');
  if (pc.results.length) {
    assert(pc.results.every((row) => row.entityClass === 'agency'), 'P+C identities are agencies');
    assert(pc.results.every((row) => !/appointment/.test(row.whyMatched) || /not an appointment/i.test(row.whyMatched)), 'LOA ≠ appointment');
  } else {
    assert(pc.limitations.some((l) => /AGENCY LICENSE|Official Florida LOA/i.test(l)), 'FL P+C empty is taxonomy-limited, not invented');
  }

  const liveNpn = npns[0];
  if (liveNpn) {
    const npnHit = await run('live NPN', `Find NPN ${liveNpn}.`);
    assert(npnHit.results.length >= 1, 'live NPN hits graph');
    assert(npnHit.results.some((r) => r.npn === liveNpn), 'NPN preserved');
    assert(npnHit.results.every((r) => r.entityClass === 'person' || r.entityClass === 'agency' || r.entityClass === 'insurer'), 'class labeled');
    const kinds = new Set(npnHit.results.map((r) => r.entityClass));
    if (kinds.size > 1) {
      assert(!npnHit.results.some((r) => r.entityClass === 'person' && r.entityClass === 'agency'), 'classes not merged');
    }
  }

  const unknown = await run('unknown NPN', 'Find NPN 0000001.');
  assert(unknown.results.length === 0 || unknown.results.every((r) => r.npn === '0000001'), 'unknown NPN does not invent');

  const count = await run('FL agency count', 'How many agencies are credentialed in Florida?');
  assert(count.counts[0]?.value && count.counts[0].value > 1000, 'FL agency count is a distinct-entity census');
  assert(/canonical agency/i.test(count.counts[0]?.grain ?? ''), 'count grain is agency not mixed providers');

  const loaDef = await run('LOA def', 'What is an insurance line of authority?');
  assert(loaDef.parsed.query.mode === 'definition', 'LOA definition executes');

  const vs = await run('agency vs insurer', 'What is the difference between an agency and an insurer?');
  assert(vs.parsed.query.definitionId === 'agency_vs_insurer', 'agency vs insurer definition');

  const domicile = await run('FL domicile', 'Show insurers domiciled in Florida.');
  assert(domicile.resultType === 'fail_closed' || domicile.parsed.query.mode === 'fail_closed', 'domicile fail closed');

  const every = await run('every insurer', "Is this agency authorized to sell every insurer's products?");
  assert(every.parsed.query.mode === 'fail_closed', 'LOA is not universal appointment');

  const best = await run('best agency', 'Which is the best insurance agency in Florida?');
  assert(best.parsed.query.mode === 'fail_closed', 'best fail closed');
  assert(!best.results.length, 'best returns no ranked identities');

  const xyz = await run('xyz appointment', 'Is this producer allowed to sell policies for XYZ Insurance Company?');
  assert(xyz.parsed.query.mode === 'fail_closed', 'appointment without NPN fail closed');

  const naic = await run('NAIC 10064', 'Find insurer NAIC code 10064.');
  assert(naic.entityClass === 'insurer' || naic.results[0]?.entityClass === 'insurer', 'NAIC is legal insurer');
  if (naic.results.length) {
    assert(naic.results[0]?.naicCode === '10064', 'NAIC preserved');
    assert(naic.results[0]?.href?.startsWith('/insurers/'), 'Wave-1 profile link');
  }

  console.log('timings', times);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('check-insurance-ask-live PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
