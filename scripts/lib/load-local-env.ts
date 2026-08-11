/**
 * Load local env files for ops scripts (DFS import/promote, seed, etc.).
 * Never commits secrets. Does not override vars already set in the process.
 *
 * Load order (later files do not override earlier process env; first file wins per key
 * among files, and process env always wins):
 *   1. .env
 *   2. .env.local
 *   3. .env.dfs.local (optional DFS-only overrides for ops machines)
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ENV_FILES = ['.env', '.env.local', '.env.dfs.local'] as const;

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Load env files from repo root into process.env.
 * @returns list of files that were found and loaded
 */
export function loadLocalEnv(cwd: string = process.cwd()): string[] {
  const loaded: string[] = [];
  for (const name of ENV_FILES) {
    const path = resolve(cwd, name);
    if (!existsSync(path)) continue;
    try {
      const parsed = parseEnvFile(readFileSync(path, 'utf8'));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined || process.env[key] === '') {
          process.env[key] = value;
        }
      }
      loaded.push(name);
    } catch {
      // ignore unreadable files
    }
  }
  return loaded;
}

export type SupabaseOpsEnv = {
  url: string;
  serviceRoleKey: string;
};

/**
 * Resolve Supabase URL + service role for ops scripts.
 * Prefers SUPABASE_URL, falls back to NEXT_PUBLIC_SUPABASE_URL.
 */
export function requireSupabaseOpsEnv(): SupabaseOpsEnv {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    const missing: string[] = [];
    if (!url) missing.push('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    console.error(
      [
        'Missing required Supabase ops credentials:',
        ...missing.map((m) => `  - ${m}`),
        '',
        'Create a local file (never commit secrets):',
        '  1. Copy .env.example → .env.local',
        '  2. Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Supabase → Settings → API',
        '  3. Re-run the command',
        '',
        'See docs/LOCAL-ENV.md and docs/FLORIDA-DFS-INVENTORY.md',
      ].join('\n')
    );
    process.exit(1);
  }

  return { url, serviceRoleKey };
}

/** Non-throwing check for preflight scripts */
export function getSupabaseOpsEnvStatus(): {
  hasUrl: boolean;
  hasServiceRole: boolean;
  loadedFiles: string[];
} {
  const loadedFiles = loadLocalEnv();
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return {
    hasUrl: Boolean(url),
    hasServiceRole: Boolean(serviceRoleKey),
    loadedFiles,
  };
}
