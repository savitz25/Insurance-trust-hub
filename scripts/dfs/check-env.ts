/**
 * Preflight: show whether local env is ready for DFS import/promote.
 * Never prints secret values.
 *
 *   npm run dfs:env
 *   npx tsx scripts/dfs/check-env.ts
 */

import { resolve } from 'path';
import { loadLocalEnv } from '../lib/load-local-env';

const root = resolve(process.cwd());
const loaded = loadLocalEnv(root);

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

console.log('Insurance Trust Hub — DFS / ops env preflight');
console.log(`cwd: ${root}`);
console.log(`Loaded files: ${loaded.length ? loaded.join(', ') : '(none)'}`);
console.log('');

function line(ok: boolean, label: string, detail?: string) {
  const mark = ok ? 'OK ' : 'MISS';
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ''}`);
}

function decodeJwtPayload(jwt: string): { ref?: string; role?: string } | null {
  try {
    const p = jwt.split('.')[1];
    if (!p) return null;
    const json = JSON.parse(
      Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    ) as { ref?: string; role?: string };
    return { ref: json.ref, role: json.role };
  } catch {
    return null;
  }
}

function maskUrl(u: string): string {
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '(invalid URL)';
  }
}

async function main() {
  line(Boolean(url), 'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL', url ? maskUrl(url) : 'not set');
  line(Boolean(key), 'SUPABASE_SERVICE_ROLE_KEY', key ? `set (${key.length} chars)` : 'not set');
  line(Boolean(anon), 'NEXT_PUBLIC_SUPABASE_ANON_KEY (optional)');
  line(Boolean(process.env.MARKETPLACE_API_KEY?.trim()), 'MARKETPLACE_API_KEY (optional for DFS)');

  let liveOk = false;
  let tablesOk = false;

  if (url && key) {
    const payload = decodeJwtPayload(key);
    if (payload?.ref) {
      const hostMatch = url.includes(payload.ref);
      line(
        hostMatch,
        'URL matches service_role project ref',
        hostMatch
          ? payload.ref
          : `URL host does not contain JWT ref "${payload.ref}" — fix .env.local (URL and service_role must be same project)`
      );
      if (payload.role && payload.role !== 'service_role') {
        line(false, 'service_role key role', `JWT role is "${payload.role}", expected service_role`);
      }
    }

    try {
      const r = await fetch(`${url}/rest/v1/providers?select=id&limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: 'count=exact',
        },
      });
      liveOk = r.ok;
      line(liveOk, 'Live API with service_role', liveOk ? `providers ${r.status}` : `providers ${r.status} (invalid key or wrong project)`);

      if (liveOk) {
        const needed = [
          'dfs_import_batches',
          'dfs_license_raw',
          'dfs_producers',
          'dfs_provider_promotions',
        ];
        let all = true;
        for (const t of needed) {
          const tr = await fetch(`${url}/rest/v1/${t}?select=id&limit=1`, {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          });
          const ok = tr.ok;
          if (!ok) all = false;
          line(ok, `Table ${t}`, ok ? 'present' : 'MISSING — run supabase/migrations/20260811130000_repair_providers_and_dfs.sql');
        }
        tablesOk = all;
      }
    } catch (e) {
      line(false, 'Live API with service_role', e instanceof Error ? e.message : 'request failed');
    }
  }

  console.log('');
  if (url && key && liveOk && tablesOk) {
    console.log('Ready for: npm run dfs:import / npm run dfs:promote');
    process.exit(0);
  }

  console.log('Not ready for live DFS import.');
  if (url && key && !liveOk) {
    console.log(
      'Fix: SUPABASE_SERVICE_ROLE_KEY must be the service_role key from the SAME project as SUPABASE_URL (Dashboard → Settings → API).'
    );
  }
  if (liveOk && !tablesOk) {
    console.log(
      'Fix: apply migration 20260811130000_repair_providers_and_dfs.sql in that project SQL Editor.'
    );
  }
  console.log('See docs/LOCAL-ENV.md and docs/FLORIDA-DFS-INVENTORY.md');
  process.exit(1);
}

main();
