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
import {
  deterministicSampleIndexes,
  evaluateDiscoveryLegitimacy,
  type LegitimacyBucket,
} from '../lib/network-discovery/legitimacy';
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

  // Deterministic legitimacy sample (~400) stratified by license state when present.
  const byState = new Map<string, typeof snapshot.providers>();
  for (const row of snapshot.providers) {
    const st =
      (row.states_licensed?.[0] || row.license_info?.licenses?.[0]?.state || 'ZZ')
        .toString()
        .toUpperCase()
        .slice(0, 2) || 'ZZ';
    const list = byState.get(st) ?? [];
    list.push(row);
    byState.set(st, list);
  }
  for (const list of byState.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  const sampleRows: typeof snapshot.providers = [];
  const perState = Math.max(40, Math.ceil(400 / Math.max(1, byState.size)));
  for (const st of [...byState.keys()].sort()) {
    const list = byState.get(st)!;
    const idxs = deterministicSampleIndexes(list.length, Math.min(perState, list.length));
    for (const i of idxs) sampleRows.push(list[i]!);
  }
  sampleRows.sort((a, b) => a.id.localeCompare(b.id));
  const sampleBuckets: Record<LegitimacyBucket, number> = {
    CLEAR_INSURANCE_AGENCY_OR_BROKERAGE: 0,
    INSURANCE_RELATED_BUT_AMBIGUOUS: 0,
    INCIDENTAL_LICENSE_HOLDER: 0,
    NON_INSURANCE_BUSINESS: 0,
    TITLE_OR_ADJUSTER_ONLY: 0,
    INSUFFICIENT_EVIDENCE: 0,
  };
  let autoNationSample: Record<string, unknown> | null = null;
  for (const row of sampleRows) {
    const d = evaluateDiscoveryLegitimacy(row);
    sampleBuckets[d.bucket] += 1;
  }
  const autoNationRow =
    snapshot.providers.find((p) =>
      /chevrolet.*coral\s*gables|coral\s*gables.*chevrolet|abraham\s*chevrolet/i.test(
        p.name || ''
      )
    ) ||
    snapshot.providers.find((p) => /a000425/i.test(p.slug || '')) ||
    snapshot.providers.find((p) => /autonation/i.test(p.name || '') && /chevrolet/i.test(p.name || ''));
  if (autoNationRow) {
    const d = evaluateDiscoveryLegitimacy(autoNationRow);
    autoNationSample = {
      id: autoNationRow.id,
      name: autoNationRow.name,
      slug: autoNationRow.slug,
      provider_type: autoNationRow.provider_type,
      categories: autoNationRow.categories,
      specialties: autoNationRow.specialties,
      license: autoNationRow.license_info?.licenses?.[0] ?? null,
      legitimacy: d,
      classification: d.ok
        ? 'VALID_INSURANCE_PROVIDER'
        : d.bucket === 'INCIDENTAL_LICENSE_HOLDER'
          ? 'INCIDENTAL_LICENSE_HOLDER'
          : d.bucket,
    };
  }

  const miamiHomeowners = result.query_readiness.find((q) =>
    /homeowners insurance agencies Miami FL/i.test(q.query)
  );

  const audit = {
    banner: PILOT_BANNER,
    schema_version: ASK_NETWORK_DISCOVERY_SCHEMA,
    hub: 'insurance',
    amendment: 'ASK-SEARCH-INSURANCE-001.1',
    source_version: sourceVersion,
    git_sha: sha,
    prior_fingerprint:
      'e8bfad58d39a4ad92d6b90328782e81b42d16c4d210eaf47c4c1a50a828b68ed',
    counts: {
      source: result.source_rows,
      providers: snapshot.providers.length,
      carriers_registry: snapshot.source_row_count - snapshot.providers.length,
      eligible: result.eligible_rows,
      ineligible: result.ineligible_rows,
      selected: result.selected_rows,
      dfs_npn_rows: snapshot.dfs_npn_rows,
      prior_eligible: 105378,
    },
    provider_type_counts: result.provider_type_counts,
    entity_counts_source: result.entity_counts_source,
    entity_counts_pilot: result.entity_counts_pilot,
    ineligible_reasons: result.ineligible_reasons,
    legitimacy_sample: {
      sample_size: sampleRows.length,
      buckets: sampleBuckets,
    },
    autonation_audit: autoNationSample,
    miami_homeowners_regression: miamiHomeowners
      ? {
          match_count: miamiHomeowners.match_count,
          names: miamiHomeowners.matches.map((m) => m.display_name),
          autonation_present: miamiHomeowners.matches.some((m) =>
            /autonation|chevrolet/i.test(m.display_name)
          ),
        }
      : null,
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
