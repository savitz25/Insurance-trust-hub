/**
 * ASK-SEARCH-INSURANCE-001 — read-only discovery pilot export.
 *
 * PILOT / NOT YET CONSUMED BY ASK PRODUCTION.
 * Does not modify AskTrustHub, copy the feed into Ask, or deploy.
 *
 *   npx tsx scripts/export-insurance-discovery-pilot.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { compareStability } from '../lib/network-discovery/fingerprint';
import { loadDiscoverySource } from '../lib/network-discovery/load';
import { publishFromSnapshot } from '../lib/network-discovery/publish';
import { AMBIGUOUS_QUERY_POLICY } from '../lib/network-discovery/query-readiness';
import { ASK_NETWORK_DISCOVERY_SCHEMA, PILOT_BANNER } from '../lib/network-discovery/types';
import { loadLocalEnv, requireSupabaseOpsEnv } from './lib/load-local-env';

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  const root = resolve(process.cwd());
  loadLocalEnv(root);
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();

  const tLoad = Date.now();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const snapshot = await loadDiscoverySource(supabase);
  const load_ms = Date.now() - tLoad;

  const sha = gitSha();
  const sourceVersion = [
    `git:${sha}`,
    `providers:${snapshot.providers.length}`,
    `updated:${snapshot.max_updated_at ?? 'none'}`,
    `carriers:${snapshot.source_row_count - snapshot.providers.length}`,
  ].join('|');

  const generatedAt = new Date().toISOString();
  const result = publishFromSnapshot(snapshot, {
    generatedAt,
    sourceVersion,
    loadMs: load_ms,
  });

  const tExport = Date.now();
  const outDir = resolve(root, 'data', 'network-discovery');
  mkdirSync(outDir, { recursive: true });
  const feedPath = resolve(outDir, 'insurance-discovery-pilot.v1.json');
  writeFileSync(feedPath, `${JSON.stringify(result.feed, null, 2)}\n`, 'utf8');
  result.timings.export_ms = Date.now() - tExport;
  result.timings.total_ms = load_ms + result.timings.normalize_ms + result.timings.validation_ms + result.timings.export_ms;

  const again = publishFromSnapshot(snapshot, {
    generatedAt: new Date().toISOString(),
    sourceVersion,
    loadMs: load_ms,
  });
  const stability = compareStability(result.feed, again.feed);

  const audit = {
    banner: PILOT_BANNER,
    schema_version: ASK_NETWORK_DISCOVERY_SCHEMA,
    hub: 'insurance',
    source_version: sourceVersion,
    git_sha: sha,
    counts: {
      source: result.source_rows,
      providers: snapshot.providers.length,
      carriers_registry: snapshot.source_row_count - snapshot.providers.length,
      eligible: result.eligible_rows,
      ineligible: result.ineligible_rows,
      selected: result.selected_rows,
      dfs_npn_rows: snapshot.dfs_npn_rows,
    },
    provider_type_counts: result.provider_type_counts,
    entity_counts_source: result.entity_counts_source,
    entity_counts_pilot: result.entity_counts_pilot,
    ineligible_reasons: result.ineligible_reasons,
    medicare_readiness: result.medicare_readiness,
    query_readiness: result.query_readiness,
    ambiguous_query_policy: AMBIGUOUS_QUERY_POLICY,
    external_calls: {
      google_places: 0,
      llm: 0,
      external_geocoding: 0,
      new_enrichment_apis: 0,
    },
    stability,
    timings: result.timings,
    fingerprint: result.feed.fingerprint,
    feed_path: 'data/network-discovery/insurance-discovery-pilot.v1.json',
  };

  writeFileSync(
    resolve(outDir, 'insurance-discovery-pilot.report.json'),
    `${JSON.stringify(audit, null, 2)}\n`,
    'utf8'
  );

  if (
    stability.membership_drift !== 0 ||
    stability.identity_drift !== 0 ||
    stability.content_fingerprint_drift !== 0
  ) {
    throw new Error(`Stability failed: ${JSON.stringify(stability)}`);
  }

  console.log(JSON.stringify({
    banner: PILOT_BANNER,
    path: 'data/network-discovery/insurance-discovery-pilot.v1.json',
    entity_count: result.feed.entity_count,
    fingerprint: result.feed.fingerprint,
    source: result.source_rows,
    eligible: result.eligible_rows,
    ineligible: result.ineligible_rows,
    selected: result.selected_rows,
    medicare_readiness: result.medicare_readiness,
    query_readiness: result.query_readiness.map((q) => ({
      query: q.query,
      match_count: q.match_count,
    })),
    stability,
    timings: result.timings,
    external_calls: audit.external_calls,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
