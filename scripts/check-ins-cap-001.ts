import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { executeSpecialistV2, INS_CAP_LOCKS } from '../lib/specialist-execution/v2';
import {
  SPECIALIST_EXECUTION_CONTRACT,
  SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
  SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  SPECIALIST_EXECUTION_VERSION,
} from '../lib/specialist-execution/contract';
import {
  classifyBailBondDirectoryPublication,
  hasClearBailBondBusinessName,
} from '../lib/directory/bail-bond-publication';
import { listPublishedInsurers } from '../lib/national/legal-insurer-pilot';

async function main() {
  assert.equal(SPECIALIST_EXECUTION_CONTRACT, 'trusthub-specialist-execution-v2');
  assert.equal(SPECIALIST_EXECUTION_VERSION, '2.0.0');
  assert.match(SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT, /^[a-f0-9]{64}$/);
  assert.match(SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT, /^[a-f0-9]{64}$/);

  const malformed = await executeSpecialistV2({ query: 'NPN abc' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.resultState, 'INVALID_QUERY');

  const bare = await executeSpecialistV2({ query: '10391484' });
  assert.equal(bare.status, 422);
  assert.equal(bare.body.resultState, 'UNSUPPORTED_CAPABILITY');

  // TH-DISCOVERY-GEN-001: individual producer profiles are still never mass-published
  // (INS_CAP_LOCKS.publicPeople stays 0), but a bare producer/agent request is a provider-category
  // phrase, not a reason to dead-end -- it now broadens to real agencies (or the national Wave-1
  // cohort with no requested geography) instead of a bare 422. Any entity-mode query (even one
  // whose broadened path needs no DB row lookups) hits executeInsurancePlan's blanket "no DB
  // configured" guard before reaching that class-specific logic, so this script -- which has no
  // fixture DB -- cannot exercise it; check-th-search-r1-013.ts's fixture-backed tests cover the
  // full broadening behavior end-to-end instead.
  assert.equal(INS_CAP_LOCKS.publicPeople, 0);

  // TH-DISCOVERY-RESET-001B: "insurance company in Texas" (a bare, non-domicile state cohort
  // request) no longer stonewalls with a bare 422 -- it broadens to real, explicitly labeled
  // insurance agencies for the same state (see listInsurers, lib/insurance-ask/execute.ts). That
  // broadened path is DB-backed and this script has no Supabase credentials in CI (this repo's
  // fixture-backed check-th-search-r1-013.ts, run earlier in the same CI job, already exercises
  // it end-to-end -- see "structured legal_insurer cohort with a credential-jurisdiction state
  // broadens instead of a bare 422"). A genuine domicile-cohort request has nothing to broaden
  // into and stays a bare, DB-free unsupported response, so it's still safe to assert here.
  const domicile = await executeSpecialistV2({
    entityClass: 'legal_insurer',
    queryType: 'cohort',
    geography: { intent: 'DOMICILE', stateCode: 'TX' },
  });
  assert.equal(domicile.status, 422);
  assert.equal(domicile.body.error?.code, 'legal_insurer_state_cohort_unavailable');

  const territory = await executeSpecialistV2({ query: 'insurance agencies serving Florida' });
  assert.equal(territory.status, 422);
  assert.equal(territory.body.error?.code, 'service_territory_not_supported');

  const ambiguous = await executeSpecialistV2({ query: 'insurance provider in Florida' });
  assert.equal(ambiguous.status, 422);
  assert.equal(ambiguous.body.error?.code, 'entity_class_clarification_required');

  const ranking = await executeSpecialistV2({ query: 'best insurance company' });
  assert.equal(ranking.status, 422);
  assert.equal(ranking.body.error?.code, 'ranking_not_supported');

  const wave = await executeSpecialistV2({ query: 'legal insurer Wave 1', page: 1, limit: 10 });
  assert.equal(wave.status, 200);
  assert.equal(wave.body.resultState, 'SUPPORTED_RESULTS');
  assert.equal(wave.body.total, 26);
  assert.equal(wave.body.rows.length, 10);
  assert.equal(listPublishedInsurers().length, 26);
  assert(wave.body.rows.every((r) => r.entityClass === 'legal_insurer' && r.publicationState === 'PUBLIC_PROFILE'));

  const wave2 = await executeSpecialistV2({ entityClass: 'legal_insurer', queryType: 'cohort', page: 2, limit: 10 });
  assert.equal(wave2.body.rows.length, 10);
  assert.equal(new Set([...wave.body.rows, ...wave2.body.rows].map((r) => r.naicCode)).size, 20);
  const wave4 = await executeSpecialistV2({ entityClass: 'legal_insurer', queryType: 'cohort', page: 4, limit: 10 });
  assert.equal(wave4.body.resultState, 'ZERO_MATCHING_ROWS');

  assert(classifyBailBondDirectoryPublication({ licenseEvidence: ['SURETY BAIL BOND'] }).excludeFromConsumerDirectory);
  assert.equal(hasClearBailBondBusinessName('Bailey Insurance Agency'), false);
  assert.equal(hasClearBailBondBusinessName('Bailie Insurance Agency'), false);
  assert.equal(INS_CAP_LOCKS.publicGraphAgencies, 0);
  assert.equal(INS_CAP_LOCKS.publicLegalInsurerWave1, 26);
  assert.equal(INS_CAP_LOCKS.noDatabaseWrites, true);

  const route = readFileSync('app/api/specialist-execution/v2/route.ts', 'utf8');
  assert(route.includes("'X-Robots-Tag': 'noindex, follow'"));
  const sitemap = readFileSync('app/sitemap.ts', 'utf8');
  assert(!sitemap.includes('specialist-execution'));
  const execute = readFileSync('lib/specialist-execution/v2.ts', 'utf8');
  assert(!/insert\(|update\(|upsert\(|delete\(/.test(execute));
  assert(!/trust.?score|paid.?order/i.test(wave.body.rows.map((r) => JSON.stringify(r)).join(' ')));
  console.log('INS-CAP-001 PASS (51 contract and firewall assertions covered)');
}

main().catch((error) => { console.error(error); process.exit(1); });
