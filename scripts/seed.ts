/**
 * Insurance Trust Hub - Database Seed Script
 *
 * Executes schema.sql and seed.sql against your Supabase PostgreSQL database.
 *
 * Required environment variables (set in .env.local):
 *   DATABASE_URL - Direct PostgreSQL connection string from Supabase dashboard
 *                  (Settings > Database > Connection string > URI)
 *
 * Optional:
 *   SEED_SCHEMA - Set to "true" to run schema.sql before seeding (default: false)
 *
 * Usage:
 *   npm run db:seed
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

function loadEnv(): void {
  const envPath = resolve(projectRoot, '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional if vars are already set
  }
}

function readSqlFile(filename: string): string {
  const filePath = resolve(projectRoot, 'supabase', filename);
  return readFileSync(filePath, 'utf-8');
}

async function executeSql(client: pg.Client, sql: string, label: string): Promise<void> {
  console.log(`\n▶ Running ${label}...`);
  const start = Date.now();
  await client.query(sql);
  console.log(`✓ ${label} completed in ${Date.now() - start}ms`);
}

async function main(): Promise<void> {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      'Error: DATABASE_URL is required.\n\n' +
        'Get it from Supabase Dashboard → Settings → Database → Connection string (URI).\n' +
        'Add to .env.local:\n' +
        '  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres\n'
    );
    process.exit(1);
  }

  const runSchema =
    process.env.SEED_SCHEMA === 'true' || process.argv.includes('--schema');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✓ Connected');

    if (runSchema) {
      const schemaSql = readSqlFile('schema.sql');
      await executeSql(client, schemaSql, 'schema.sql');
    } else {
      console.log('\nℹ Skipping schema.sql (set SEED_SCHEMA=true to apply schema)');
    }

    const seedSql = readSqlFile('seed.sql');
    await executeSql(client, seedSql, 'seed.sql');

    const { rows } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM providers'
    );
    console.log(`\n✓ Database seeded successfully — ${rows[0].count} providers loaded`);
  } catch (error) {
    console.error('\n✗ Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();