/**
 * Preflight: show whether local env is ready for DFS import/promote.
 * Never prints secret values.
 *
 *   npm run dfs:env
 *   npx tsx scripts/dfs/check-env.ts
 */

import { resolve } from 'path';
import { getSupabaseOpsEnvStatus, loadLocalEnv } from '../lib/load-local-env';

const root = resolve(process.cwd());
const loaded = loadLocalEnv(root);
const status = getSupabaseOpsEnvStatus();

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

console.log('Insurance Trust Hub — DFS / ops env preflight');
console.log(`cwd: ${root}`);
console.log(`Loaded files: ${loaded.length ? loaded.join(', ') : '(none)'}`);
console.log('');

function line(ok: boolean, label: string, detail?: string) {
  const mark = ok ? 'OK ' : 'MISS';
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ''}`);
}

line(status.hasUrl, 'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL', url ? maskUrl(url) : 'not set');
line(status.hasServiceRole, 'SUPABASE_SERVICE_ROLE_KEY', key ? `set (${key.length} chars)` : 'not set');
line(Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()), 'NEXT_PUBLIC_SUPABASE_ANON_KEY (optional)');
line(Boolean(process.env.MARKETPLACE_API_KEY?.trim()), 'MARKETPLACE_API_KEY (optional for DFS)');

console.log('');
if (status.hasUrl && status.hasServiceRole) {
  console.log('Ready for: npm run dfs:import / npm run dfs:promote');
  process.exit(0);
}

console.log('Not ready. Copy .env.example → .env.local and fill Supabase service role values.');
console.log('See docs/LOCAL-ENV.md');
process.exit(1);

function maskUrl(u: string): string {
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '(invalid URL)';
  }
}
