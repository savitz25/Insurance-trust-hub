import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  assertNoContactFields,
  buildCmsContractHistory,
  CmsActionBuildError,
} from './cms-part-cd-action-builder';
import {
  applyEaInsRoadmapPlan,
  assertFixtureHashes,
  assertSummary,
  EaInsRoadmapClosedError,
  EXPECTED,
  loadEaInsRoadmapFromRepo,
  QUARANTINE_NAIC,
  SOURCE,
  SURPLUS_NAIC_NOT_IN_DB,
  TABLE,
  writesEnabled,
  type RoadmapSummary,
} from './ea-ins-roadmap-001';
import { IDENTIFIER_SCHEME } from './legal-insurer-identity';

const root = process.cwd();

test('identifier schemes keep HIOS and Medicare contract ids distinct from NAIC', () => {
  assert.equal(IDENTIFIER_SCHEME.HIOS_ISSUER_ID, 'hios_issuer_id');
  assert.equal(IDENTIFIER_SCHEME.CMS_CONTRACT_ID, 'cms_medicare_contract_id');
  assert.notEqual(IDENTIFIER_SCHEME.HIOS_ISSUER_ID, IDENTIFIER_SCHEME.NAIC_COCODE);
  assert.notEqual(IDENTIFIER_SCHEME.HIOS_ISSUER_ID, IDENTIFIER_SCHEME.CMS_HIOS_ISSUER_ID);
});

test('nj_ins_001 and nj_ins_002 stay idempotent and keep the Florida OIR scheme', () => {
  const nj001 = readFileSync('supabase/migrations/20260902140000_nj_ins_001_regulatory_ledger.sql', 'utf8');
  const nj002 = readFileSync('supabase/migrations/20260902180000_nj_ins_002_market_intelligence.sql', 'utf8');
  for (const sql of [nj001, nj002]) {
    assert.match(sql, /drop constraint if exists national_entity_identifiers_scheme_check/);
    assert.match(sql, /fl_oir_company_code/);
    assert.match(sql, /cms_medicare_contract_id/);
    assert.match(sql, /create table if not exists/i);
    assert.match(sql, /drop policy if exists/i);
    assert.match(sql, /force row level security/i);
    assert.doesNotMatch(sql, /grant\s+select.*(?:anon|authenticated)/i);
  }
  assert.match(nj002, /revoke all on table insurance_monitoring_events from anon, authenticated, public/);
  assert.match(nj002, /grant all on table insurance_monitoring_events to service_role/);
  assert.match(nj002, /nj_crib_company_number/);
  assert.match(nj002, /serff_tracking_number/);
});

test('roadmap migration registers hios_issuer_id and cms_medicare_contract_id', () => {
  const sql = readFileSync('supabase/migrations/20261023120000_ea_ins_roadmap_001_identifier_schemes.sql', 'utf8');
  for (const scheme of [
    'hios_issuer_id',
    'cms_medicare_contract_id',
    'cms_hios_issuer_id',
    'fl_oir_company_code',
    'nj_crib_company_number',
    'serff_tracking_number',
    'npn',
  ]) {
    assert.match(sql, new RegExp(`'${scheme}'`));
  }
  assert.match(sql, /drop constraint if exists/);
  assert.match(sql, /create table if not exists insurance_review_queue/);
  assert.match(sql, /publication_allowed = false/);
  assert.match(sql, /identifier_value <> '13064'/);
  assert.match(sql, /identifier_value <> '18711'/);
  assert.doesNotMatch(sql, /grant\s+select.*(?:anon|authenticated)/i);
  assert.doesNotMatch(sql, /\b(phone|contact_name|email)\s+(text|varchar)/i);
});

test('dry-run counts and hashes fail closed on the handoff fixtures', () => {
  const plan = loadEaInsRoadmapFromRepo(root);
  assert.equal(plan.closed, true);
  assert.equal(plan.summary.hashesOk, true);
  assert.deepEqual(plan.summary.marketConduct, EXPECTED.marketConduct);
  assert.deepEqual(plan.summary.surplusLines, EXPECTED.surplusLines);
  assert.deepEqual(plan.summary.mlr, EXPECTED.mlr);
  assert.deepEqual(plan.summary.cms, EXPECTED.cms);
  assert.equal(plan.summary.reviewQueue, 147);
  assert.equal(plan.summary.publicationAllowedTrue, 0);
  assert.equal(plan.reviewRows.length, 147);
  assert.equal(plan.rosterRows.length, 216);
  assert.equal(plan.bridgeRows.length, 1662);
  assert.equal(plan.cmsRows.length, 844);

  const again = loadEaInsRoadmapFromRepo(root);
  assert.deepEqual(
    plan.reviewRows.map((row) => row.content_hash),
    again.reviewRows.map((row) => row.content_hash)
  );

  const geico = plan.reviewRows.find((row) => row.hold_reason === 'HELD_ONE_ACTION_MULTI_ENTITY_GEICO_10_20_2026');
  assert.ok(geico);
  assert.equal(geico.publication_allowed, false);
  assert.deepEqual(geico.raw_value.naic_cocodes, ['14137', '14139', '22055', '22063', '41491']);
  assert.equal(geico.raw_value.action_count, 1);
  assert.equal(plan.reviewRows.filter((row) => row.hold_reason.includes('GEICO')).length, 1);

  assert.equal(plan.rosterRows.some((row) => row.identifier_value === QUARANTINE_NAIC), false);
  assert.equal(plan.rosterRows.some((row) => row.identifier_value === SURPLUS_NAIC_NOT_IN_DB), false);
  const quarantine = plan.reviewRows.filter((row) => row.identifier_value === QUARANTINE_NAIC);
  assert.equal(quarantine.length, 2);
  assert.deepEqual(
    quarantine.map((row) => row.legal_name).sort(),
    ['Tudor Insurance Co.', 'United National Insurance Co.']
  );
  const hyphen = plan.reviewRows.filter((row) => row.hold_reason === 'ISI_ID_HYPHEN_NORMALIZED_REVIEW');
  assert.equal(hyphen.length, 3);
  assert.deepEqual(
    hyphen.map((row) => row.identifier_value).sort(),
    ['AA1440031', 'AA3191315', 'AA3191624']
  );
  assert.equal(hyphen.every((row) => String(row.raw_value.id_raw).includes('-')), true);

  const ocr = plan.reviewRows.filter((row) => row.hold_reason === 'HELD_OCR_SINGLE_UNVERIFIED');
  assert.equal(ocr.length, 13);
  assert.equal(ocr.every((row) => row.identifier_value === null && row.match_status !== 'EXACT'), true);

  assert.equal(plan.bridgeRows.every((row) => row.from_scheme === 'hios_issuer_id'), true);
  assert.equal(plan.bridgeRows.every((row) => row.to_scheme === 'naic_cocode' && row.from_value !== row.to_value), true);
  assert.equal(plan.cmsRows.every((row) => row.identifier_scheme === 'cms_medicare_contract_id'), true);
  assert.equal(new Set(plan.cmsRows.map((row) => row.contract_id)).size, 515);
  assert.equal(plan.cmsRows.filter((row) => row.action_type === 'AD_HOC_CAP').length, 508);
  assert.equal(plan.cmsRows.filter((row) => row.action_type === 'WARNING_LETTER').length, 336);
  assert.equal(plan.reviewRows.every((row) => row.publication_allowed === false), true);
  assert.equal(plan.bridgeRows.every((row) => row.publication_allowed === false), true);
  assert.equal(plan.rosterRows.every((row) => row.publication_allowed === false), true);
  assert.equal(plan.cmsRows.every((row) => row.publication_allowed === false), true);
});

test('hash and count checks fail closed', () => {
  assert.throws(
    () => assertFixtureHashes(root, { 'q1nj_rows.json': '0'.repeat(64) }),
    EaInsRoadmapClosedError
  );
  const summary = {
    marketConduct: { ...EXPECTED.marketConduct, loadExact: 1 },
    surplusLines: { ...EXPECTED.surplusLines },
    mlr: { ...EXPECTED.mlr },
    cms: { ...EXPECTED.cms },
    reviewQueue: EXPECTED.reviewQueue,
    publicationAllowedTrue: 0,
    hashesOk: true,
  } satisfies RoadmapSummary;
  assert.throws(() => assertSummary(summary), /market-conduct exact loads/);
});

test('CMS action builder refuses contact fields and keeps one issue on its contracts', () => {
  assert.throws(
    () =>
      buildCmsContractHistory(
        [
          {
            action_type: 'AD_HOC_CAP',
            issue_id: '1 *',
            date_sent: '01-JAN-2024',
            issue_type: 'Health Benefit',
            issue_topic: 'Star Ratings',
            parent_org: 'Example Health Plan',
            contract_ids: ['H0001'],
            raw_contract_field: 'H0001 - EXAMPLE HEALTH PLAN',
            phone: 'redacted',
          } as never,
        ],
        new Set(),
        new Map([['H0001|1', false]])
      ),
    CmsActionBuildError
  );
  const shaped = ['202', '555', '0199'].join('-');
  assert.throws(() => assertNoContactFields({ note: shaped }), CmsActionBuildError);
  const rows = buildCmsContractHistory(
    [
      {
        action_type: 'WARNING_LETTER',
        issue_id: '10 *',
        date_sent: '02-FEB-2024',
        issue_type: 'Drug Benefit',
        issue_topic: 'PDE',
        parent_org: 'Example Health Plan',
        contract_ids: ['H0001', 'H0002'],
        raw_contract_field: 'H0001 - EXAMPLE HEALTH PLAN',
      },
    ],
    new Set(['H0002']),
    new Map([
      ['H0001|10', false],
      ['H0002|10', false],
    ])
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].issue_id, '10');
  assert.equal(rows[0].shared_with, 'H0002');
  assert.equal(rows[1].shared_with, 'H0001');
  assert.equal(rows[1].in_repo_static_cms_json, true);
  assert.equal(rows.every((row) => row.publication_allowed === false), true);
  assert.equal(JSON.stringify(rows).includes('phone'), false);
});

test('writes stay behind the write flag', async () => {
  assert.equal(writesEnabled(['node', 'ea-ins-roadmap-001-load.ts']), false);
  assert.equal(writesEnabled(['node', 'ea-ins-roadmap-001-load.ts', '--write']), true);
  const plan = loadEaInsRoadmapFromRepo(root);
  const calls: string[] = [];
  const client = {
    upsert: async (table: string) => {
      calls.push(table);
    },
  };
  const dry = await applyEaInsRoadmapPlan(plan, client, { write: false });
  assert.deepEqual(dry, { wrote: false, upserts: 0 });
  assert.deepEqual(calls, []);
  const wrote = await applyEaInsRoadmapPlan(plan, client, { write: true });
  assert.equal(wrote.wrote, true);
  assert.deepEqual(calls, [TABLE.review, TABLE.bridges, TABLE.roster, TABLE.cmsActions]);
  assert.equal(plan.reviewRows[0].source_dataset === SOURCE.marketConduct, true);
});

test('loader script dry-run does not request a database write', () => {
  const result = spawnSync('node_modules/.bin/tsx', ['scripts/ea-ins-roadmap-001-load.ts'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as { dryRun: boolean; wrote: boolean; summary: RoadmapSummary };
  assert.equal(payload.dryRun, true);
  assert.equal(payload.wrote, false);
  assert.equal(payload.summary.surplusLines.loadExactNaic, 216);
  assert.equal(payload.summary.mlr.loadExact, 1662);
  assert.equal(payload.summary.cms.links, 844);
  assert.equal(payload.summary.reviewQueue, 147);
});
