import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import {
  compareFloridaHubOrder,
  compareFloridaHubOrderByNfc,
  mergeFloridaHubPage,
} from './florida-hub-merge';
import { floridaHubIdPredicate } from './launch-counties';

const root = process.cwd();
const precomposed = 'Zoé Order Lab';
const combining = 'Zoe\u0301 Order Lab';
const precomposedId = '00000000-0000-4000-8000-000000000001';
const combiningId = '00000000-0000-4000-8000-000000000002';

type Row = { id: string; name: string };

function pageWalk(rows: readonly Row[], pageSize: number): { missing: number; repeated: number; pages: Row[][] } {
  const seen = new Set<string>();
  let repeated = 0;
  const pages: Row[][] = [];
  for (let from = 0; from < rows.length; from += pageSize) {
    const page = rows.slice(from, from + pageSize);
    pages.push(page);
    for (const row of page) {
      if (seen.has(row.id)) repeated += 1;
      seen.add(row.id);
    }
  }
  let missing = 0;
  for (const row of rows) if (!seen.has(row.id)) missing += 1;
  return { missing, repeated, pages };
}

/**
 * Linux PostgreSQL 17.6 ordered the combining acute before the precomposed
 * form when both ids were forced the other way. Node's raw collator ties
 * those two strings. This double encodes that measured name order and then
 * uses the raw collator for every other pair.
 */
function simulatedPostgresRawOrder(left: Row, right: Row): number {
  const nfcEqual = left.name.normalize('NFC') === right.name.normalize('NFC');
  const leftCombining = left.name.includes('\u0301');
  const rightCombining = right.name.includes('\u0301');
  if (nfcEqual && left.name !== right.name && leftCombining !== rightCombining) {
    return leftCombining ? -1 : 1;
  }
  return compareFloridaHubOrder(left, right);
}

test('PostgREST hub read orders by name and id columns', async () => {
  let url = '';
  const supabase = createClient('http://postgrest.test', 'public-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        url = input instanceof Request ? input.url : String(input);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });
  const { error } = await supabase
    .from('providers')
    .select('*')
    .eq('verified', true)
    .contains('states_licensed', ['FL'])
    .or(floridaHubIdPredicate('miami_dade'))
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(9600, 9699);
  assert.equal(error, null);
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/rest/v1/providers');
  assert.equal(parsed.searchParams.get('order'), 'name.asc,id.asc');
  assert.equal(parsed.searchParams.get('offset'), '9600');
  assert.equal(parsed.searchParams.get('limit'), '100');
  assert.equal(parsed.searchParams.get('verified'), 'eq.true');
  assert.equal(parsed.searchParams.get('states_licensed'), 'cs.{FL}');
  assert.equal(
    parsed.searchParams.get('or'),
    '(contact->>launch_county_id.eq.miami_dade)'
  );
  assert.equal(url.includes('normalize'), false);
  assert.equal(url.includes('provider_name_nfc'), false);

  let expressionUrl = '';
  const expressionClient = createClient('http://postgrest.test', 'public-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        expressionUrl = input instanceof Request ? input.url : String(input);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });
  await expressionClient.from('providers').select('id,name').order('normalize(name, NFC)');
  const expressionOrder = new URL(expressionUrl).searchParams.get('order');
  assert.equal(expressionOrder, 'normalize(name, NFC).asc');
  assert.equal(new URL(expressionUrl).pathname, '/rest/v1/providers');
});

test('raw-name comparison stays the negative control for the Zoe pair', () => {
  const precomposedRow = { id: precomposedId, name: precomposed };
  const combiningRow = { id: combiningId, name: combining };
  assert.equal(precomposed.normalize('NFC'), combining.normalize('NFC'));
  assert.notEqual(
    compareFloridaHubOrder(precomposedRow, combiningRow),
    simulatedPostgresRawOrder(precomposedRow, combiningRow)
  );
  assert.equal(compareFloridaHubOrderByNfc(precomposedRow, combiningRow), -1);
  assert.equal(simulatedPostgresRawOrder(combiningRow, precomposedRow), -1);
  const postgresPages = pageWalk(
    [combiningRow, precomposedRow].sort(simulatedPostgresRawOrder),
    1
  );
  const contractPages = pageWalk(
    [combiningRow, precomposedRow].sort(compareFloridaHubOrderByNfc),
    1
  );
  assert.deepEqual(postgresPages.pages.map((page) => page[0].id), [combiningId, precomposedId]);
  assert.deepEqual(contractPages.pages.map((page) => page[0].id), [precomposedId, combiningId]);
  assert.equal(precomposedRow.name, precomposed);
  assert.equal(combiningRow.name, combining);
});

test('NFC contract covers punctuation, case, duplicates, and unicode equivalents', () => {
  const rows: Row[] = [
    { id: 'p-1', name: 'A_1 ORDER LAB' },
    { id: 'p-2', name: 'A-1 ORDER LAB' },
    { id: 'p-3', name: 'a-1 order lab' },
    { id: 'm-2', name: 'Duplicate Order Lab' },
    { id: 'm-1', name: 'Duplicate Order Lab' },
    { id: 'p-4', name: "O'Brien Order Lab" },
    { id: 'p-5', name: 'Obrien Order Lab' },
    { id: 'p-6', name: 'Ávila Order Lab' },
    { id: 'p-7', name: 'Avila Order Lab' },
    { id: 'p-8', name: 'Müller Order Lab' },
    { id: 'p-9', name: 'Muller Order Lab' },
    { id: precomposedId, name: precomposed },
    { id: combiningId, name: combining },
    { id: 'p-10', name: 'Ñoño Order Lab' },
    { id: 'p-11', name: 'Noño Order Lab' },
    { id: 'p-12', name: 'Agency · Middle Dot' },
  ];
  const contract = [...rows].sort(compareFloridaHubOrderByNfc);
  const independent = [...rows].sort((left, right) => {
    const collator = new Intl.Collator('en-US', { usage: 'sort', sensitivity: 'variant' });
    const byName = collator.compare(left.name.normalize('NFC'), right.name.normalize('NFC'));
    return byName === 0 ? collator.compare(left.id, right.id) : byName;
  });
  assert.deepEqual(contract.map((row) => row.id), independent.map((row) => row.id));
  const codeUnit = [...rows].sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : left.id < right.id ? -1 : 1));
  assert.notDeepEqual(contract.map((row) => row.id), codeUnit.map((row) => row.id));
  assert.deepEqual(
    contract.filter((row) => row.name === 'Duplicate Order Lab').map((row) => row.id),
    ['m-1', 'm-2']
  );
  assert.ok(contract.findIndex((row) => row.id === 'p-1') < contract.findIndex((row) => row.id === 'p-2'));
  assert.equal(rows.find((row) => row.id === combiningId)?.name, combining);
  const coverage = pageWalk(contract, 1);
  assert.equal(coverage.missing, 0);
  assert.equal(coverage.repeated, 0);
  assert.equal(coverage.pages.length, rows.length);
});

test('NFC pages and split county streams do not drop or repeat providers', () => {
  const rows: Row[] = [];
  for (let index = 0; index < 9630; index += 1) {
    rows.push({
      id: `10000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`,
      name: `Agency ${String(index).padStart(5, '0')}`,
    });
  }
  rows.push({ id: precomposedId, name: precomposed }, { id: combiningId, name: combining });
  const contract = [...rows].sort(compareFloridaHubOrderByNfc);
  const coverage = pageWalk(contract, 100);
  assert.equal(coverage.missing, 0);
  assert.equal(coverage.repeated, 0);
  assert.equal(coverage.pages.length, 97);
  const deep = coverage.pages[96];
  assert.equal(deep.length, 32);
  assert.deepEqual(
    contract.filter((row) => row.name.normalize('NFC') === precomposed.normalize('NFC')).map((row) => row.id),
    [precomposedId, combiningId]
  );

  const left: Row[] = [];
  const right: Row[] = [];
  for (const row of contract) {
    if (row.name.includes('\u0301')) right.push(row);
    else if (row.name === precomposed) left.push(row);
    else if (left.length <= right.length) left.push(row);
    else right.push(row);
  }
  const merged = mergeFloridaHubPage([left, right], 0, contract.length, compareFloridaHubOrderByNfc);
  assert.deepEqual(merged.map((row) => row.id), contract.map((row) => row.id));
  const first = mergeFloridaHubPage([left, right], 0, 100, compareFloridaHubOrderByNfc);
  const next = mergeFloridaHubPage([left, right], 100, 100, compareFloridaHubOrderByNfc);
  const seen = new Set<string>();
  for (const row of [...first, ...next]) {
    assert.equal(seen.has(row.id), false);
    seen.add(row.id);
  }
  assert.equal(first.length, 100);
  assert.equal(next.length, 100);
});

test('the live read stays on raw name order until the computed field exists', () => {
  const source = readFileSync(join(root, 'lib/dfs/providers-by-county.ts'), 'utf8');
  const readStart = source.indexOf('async function readFloridaCountyChunk');
  const readEnd = source.indexOf('async function readFloridaCountyPrefix');
  const readBody = source.slice(readStart, readEnd);
  assert.ok(readBody.includes(".order('name'"));
  assert.ok(readBody.includes(".order('id'"));
  assert.equal(readBody.includes('provider_name_nfc'), false);
  assert.equal(readBody.includes('normalize'), false);
  assert.equal(readBody.includes('compareFloridaHubOrderByNfc'), false);
  assert.ok(readBody.includes(".contains('states_licensed', ['FL'])"));
  assert.ok(readBody.includes('floridaHubIdPredicate('));

  const packet = readFileSync(join(root, 'lib/dfs/ins-ordering-integration-004.not-applied.sql'), 'utf8');
  assert.ok(packet.includes('DO NOT APPLY'));
  assert.equal(packet.includes('CREATE FUNCTION'), false);
  assert.ok(packet.includes('supabase/migrations/20261030160000_provider_name_nfc.sql'));
  assert.ok(packet.includes('supabase/rollbacks/20261030160000_provider_name_nfc.sql'));
  assert.equal(packet.includes('CREATE INDEX'), false);
  assert.equal(packet.includes('ALTER TABLE'), false);
  const migration = readFileSync(
    join(root, 'supabase/migrations/20261030160000_provider_name_nfc.sql'),
    'utf8'
  );
  assert.ok(migration.includes('CREATE FUNCTION public.provider_name_nfc(public.providers)'));
  assert.ok(migration.includes("pg_catalog.normalize($1.name, 'NFC')"));
  assert.ok(migration.includes('SECURITY INVOKER'));
  assert.equal(migration.includes('SECURITY DEFINER'), false);
  const inventory = readFileSync(join(root, 'supabase/migrations/20260811120000_florida_dfs_inventory.sql'), 'utf8');
  assert.equal(inventory.includes('provider_name_nfc'), false);
});
