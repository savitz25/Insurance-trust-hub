import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const migrationName = '20261030160000_provider_name_nfc.sql';

test('the computed-field migration is explicit and does not change row visibility', () => {
  const migration = readFileSync(join(root, 'supabase/migrations', migrationName), 'utf8');
  assert.ok(migration.includes('CREATE FUNCTION public.provider_name_nfc(public.providers)'));
  assert.ok(migration.includes("pg_catalog.normalize($1.name, 'NFC')"));
  assert.ok(migration.includes('SECURITY INVOKER'));
  assert.equal(migration.includes('SECURITY DEFINER'), false);
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.provider_name_nfc(public.providers) FROM PUBLIC;'));
  assert.ok(
    migration.includes(
      'GRANT EXECUTE ON FUNCTION public.provider_name_nfc(public.providers) TO anon, authenticated, service_role;'
    )
  );
  assert.ok(migration.includes("NOTIFY pgrst, 'reload schema';"));
  assert.ok(migration.includes('insurance.provider_name_nfc_go'));
  assert.equal(migration.includes('CREATE INDEX'), false);
  assert.equal(migration.includes('ALTER TABLE'), false);
  assert.equal(migration.includes('ENABLE ROW LEVEL SECURITY'), false);
  assert.equal(migration.includes('CREATE POLICY'), false);
  assert.equal(migration.includes('GRANT SELECT'), false);
  assert.equal(migration.includes('GRANT ALL'), false);

  const names = readdirSync(join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
  assert.equal(names.filter((name) => name.includes('provider_name_nfc')).length, 1);
  for (const name of names) {
    if (name === migrationName) continue;
    const text = readFileSync(join(root, 'supabase/migrations', name), 'utf8');
    assert.equal(text.includes('provider_name_nfc'), false, name);
  }
});

test('the paired rollback is outside the migration runner', () => {
  const rollback = readFileSync(
    join(root, 'supabase/rollbacks', migrationName),
    'utf8'
  );
  assert.ok(rollback.includes('DROP FUNCTION IF EXISTS public.provider_name_nfc(public.providers);'));
  assert.ok(rollback.includes("NOTIFY pgrst, 'reload schema';"));
  assert.ok(rollback.includes('revert the application before this script'));
  assert.equal(rollback.includes('CREATE FUNCTION'), false);
  const migrationNames = readdirSync(join(root, 'supabase/migrations'));
  assert.equal(migrationNames.includes(migrationName), true);
  assert.equal(
    readFileSync(join(root, 'supabase/migrations', migrationName), 'utf8').includes('DROP FUNCTION'),
    false
  );
});

test('the old packet is not a second copy of the function', () => {
  const packet = readFileSync(join(root, 'lib/dfs/ins-ordering-integration-004.not-applied.sql'), 'utf8');
  assert.ok(packet.includes('DO NOT APPLY'));
  assert.equal(packet.includes('CREATE FUNCTION'), false);
  assert.equal(packet.includes('CREATE INDEX'), false);
  assert.equal(packet.includes('ALTER TABLE'), false);
  assert.ok(packet.includes('supabase/migrations/20261030160000_provider_name_nfc.sql'));
  assert.ok(packet.includes('supabase/rollbacks/20261030160000_provider_name_nfc.sql'));
});
