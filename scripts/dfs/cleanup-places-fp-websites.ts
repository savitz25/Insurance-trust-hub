/**
 * Phase 6C-2 — conservative cleanup of suspicious Places websites.
 *
 * Heuristic only (no Places re-fetch by default):
 *   - major carrier corporate domains
 *   - dealer / contractor / realty / bank legal names without insurance keywords
 *
 * Clears contact.website only. Never touches DFS / verified / license fields.
 * Keeps enrichment.google snapshot; appends skipReasons audit note.
 *
 *   npm run dfs:cleanup-places-fp -- --dry-run
 *   npm run dfs:cleanup-places-fp -- --confirm --limit 200
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { mapRowToProvider } from '../../lib/providers/map-db-provider';
import type { Provider as DbProvider, ContactInfo } from '../../types/supabase';
import type { ProviderEnrichment } from '../../lib/enrichment/types';
import { shouldClearWebsiteHeuristic } from '../../lib/enrichment/places-fp-gate';
import { SFL_LAUNCH_COUNTY_IDS } from '../../lib/enrichment/places-pilot';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function hasFlag(name: string): boolean {
  return process.argv.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
}
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) {
    const v = process.argv[i + 1];
    if (v && !v.startsWith('--')) return v;
    return 'true';
  }
  const pref = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (pref) return pref.split('=').slice(1).join('=');
  return undefined;
}
function num(name: string, def: number): number {
  const v = arg(name);
  if (v == null || v === 'true') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function main() {
  const confirm = hasFlag('confirm');
  const dryRun = hasFlag('dry-run') || !confirm;
  const limit = Math.min(Math.max(num('limit', 5000), 1), 20000);
  const sflOnly = !hasFlag('all-fl');

  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    JSON.stringify({ mode: dryRun ? 'dry-run' : 'live', confirm, limit, sflOnly }, null, 2)
  );

  const rows: DbProvider[] = [];
  let from = 0;
  const page = 500;
  for (;;) {
    let q = supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .not('contact->>website', 'is', null)
      .order('name', { ascending: true })
      .range(from, from + page - 1);

    if (sflOnly) {
      q = q.in('contact->>launch_county_id', [...SFL_LAUNCH_COUNTY_IDS]);
    }

    const { data, error } = await q;
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    rows.push(...(data as DbProvider[]));
    if (data.length < page) break;
    from += page;
    if (rows.length >= limit * 3) break;
  }

  const flagged: Array<{
    slug: string;
    name: string;
    website: string;
    reasons: string[];
    softWarnings: string[];
    hadPlaces: boolean;
  }> = [];

  for (const row of rows) {
    if (flagged.length >= limit) break;
    const p = mapRowToProvider(row);
    const website = p.website?.trim();
    if (!website) continue;
    const decision = shouldClearWebsiteHeuristic({ name: p.name, website });
    if (!decision.clear) continue;
    flagged.push({
      slug: p.slug,
      name: p.name,
      website,
      reasons: decision.reasons,
      softWarnings: decision.softWarnings,
      hadPlaces: p.enrichment?.google?.matchConfidence === 'high',
    });
  }

  console.log(`Flagged for website clear: ${flagged.length}`);
  for (const f of flagged.slice(0, 25)) {
    console.log(`  - ${f.slug}: ${f.reasons.join('; ')} | ${f.website}`);
  }

  let cleared = 0;
  if (confirm && !dryRun) {
    for (const f of flagged) {
      const row = rows.find((r) => mapRowToProvider(r).slug === f.slug);
      if (!row) continue;
      const contact = {
        ...(row.contact as ContactInfo),
      } as ContactInfo & { enrichment?: ProviderEnrichment };
      const prevSite = contact.website;
      const next: ContactInfo & { enrichment?: ProviderEnrichment } = {
        ...contact,
        website: '',
        enrichment: {
          ...(contact.enrichment ?? {}),
          lastRunAt: new Date().toISOString(),
          skipReasons: [
            ...(contact.enrichment?.skipReasons ?? []).filter(
              (r) => !r.startsWith('places_fp_cleanup')
            ),
            `places_fp_cleanup: cleared website (${f.reasons.join(', ')}); was ${prevSite}`.slice(
              0,
              280
            ),
          ],
        },
      };

      const { error } = await supabase
        .from('providers')
        .update({
          contact: next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('verified', true);
      if (!error) cleared++;
    }
  }

  const outDir = resolve(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(outDir, `places-fp-cleanup-${stamp}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'live',
        flagged: flagged.length,
        cleared,
        sample: flagged.slice(0, 100),
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        flagged: flagged.length,
        cleared,
        dryRun,
        log: outPath,
        resumeHint: dryRun
          ? 'npm run dfs:cleanup-places-fp -- --confirm'
          : undefined,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
