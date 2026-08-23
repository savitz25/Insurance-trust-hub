import { CARRIER_REGISTRY } from '@/lib/carriers/registry';
import type { Provider as DbProvider } from '@/types/supabase';
import {
  evaluateCarrierEligibility,
  evaluateProviderEligibility,
} from '@/lib/network-discovery/eligibility';
import { fingerprintEntities } from '@/lib/network-discovery/fingerprint';
import { npnForProvider, type DiscoverySourceSnapshot } from '@/lib/network-discovery/load';
import { runQueryReadiness } from '@/lib/network-discovery/query-readiness';
import { assertPilotSize, selectPilotCohort } from '@/lib/network-discovery/select-pilot';
import {
  ASK_NETWORK_DISCOVERY_SCHEMA,
  INSURANCE_HUB,
  MEDICARE_ENTITY_READINESS,
  PILOT_BANNER,
  PILOT_TARGET,
  type DiscoveryEntity,
  type DiscoveryFeed,
  type EligibilityRecord,
  type IneligibilityReason,
} from '@/lib/network-discovery/types';
import { assertValidFeed } from '@/lib/network-discovery/validate';

export type TimingReport = {
  load_ms: number;
  normalize_ms: number;
  eligibility_ms: number;
  validation_ms: number;
  export_ms: number;
  total_ms: number;
};

export type EntityCountReport = {
  agencies: number;
  agents: number;
  brokerages: number;
  carriers: number;
  medicare: number;
  other: number;
};

export type PublishResult = {
  feed: DiscoveryFeed;
  source_rows: number;
  eligible_rows: number;
  ineligible_rows: number;
  selected_rows: number;
  ineligible_reasons: Record<string, number>;
  entity_counts_source: EntityCountReport;
  entity_counts_pilot: EntityCountReport;
  provider_type_counts: Record<string, number>;
  medicare_readiness: typeof MEDICARE_ENTITY_READINESS;
  query_readiness: ReturnType<typeof runQueryReadiness>;
  timings: TimingReport;
};

function countEntities(entities: DiscoveryEntity[]): EntityCountReport {
  const out: EntityCountReport = {
    agencies: 0,
    agents: 0,
    brokerages: 0,
    carriers: 0,
    medicare: 0,
    other: 0,
  };
  for (const e of entities) {
    if (e.entity_type === 'insurance_agency') out.agencies += 1;
    else if (e.entity_type === 'insurance_agent') out.agents += 1;
    else if (e.entity_type === 'insurance_brokerage') out.brokerages += 1;
    else if (e.entity_type === 'insurance_carrier') out.carriers += 1;
    else if (e.entity_type === 'medicare_agent') out.medicare += 1;
    else out.other += 1;
    if (e.medicare_category) {
      // category tag only — not an entity class
    }
  }
  return out;
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function publishFromSnapshot(
  snapshot: DiscoverySourceSnapshot,
  opts: {
    generatedAt: string;
    sourceVersion: string;
    loadMs?: number;
    target?: number;
  }
): PublishResult {
  const started = Date.now();
  const load_ms = opts.loadMs ?? 0;

  const tNorm = Date.now();
  const records: EligibilityRecord[] = [];
  for (const row of snapshot.providers) {
    const npn = npnForProvider(row, snapshot.npnByLicenseKey);
    records.push(evaluateProviderEligibility(row, npn));
  }
  for (const carrier of CARRIER_REGISTRY) {
    records.push(evaluateCarrierEligibility(carrier));
  }
  const normalize_ms = Date.now() - tNorm;
  const eligibility_ms = normalize_ms;

  const eligible = records
    .filter((r) => r.eligible && r.entity)
    .map((r) => r.entity as DiscoveryEntity);

  const ineligible_reasons: Record<string, number> = {};
  for (const r of records) {
    if (r.eligible) continue;
    if (r.reasons.length === 0) bump(ineligible_reasons, 'unspecified');
    for (const reason of r.reasons as IneligibilityReason[]) {
      bump(ineligible_reasons, reason);
    }
  }

  const selected = selectPilotCohort(eligible, opts.target ?? PILOT_TARGET);
  const size = assertPilotSize(selected.length);
  if (!size.ok) {
    throw new Error(
      `Pilot selection failed: ${size.reason}. Eligible=${eligible.length}`
    );
  }

  const tVal = Date.now();
  const feed: DiscoveryFeed = {
    schema_version: ASK_NETWORK_DISCOVERY_SCHEMA,
    hub: INSURANCE_HUB,
    generated_at: opts.generatedAt,
    source_version: opts.sourceVersion,
    entity_count: selected.length,
    fingerprint: fingerprintEntities(selected),
    banner: PILOT_BANNER,
    entities: selected,
  };
  assertValidFeed(feed);
  const validation_ms = Date.now() - tVal;
  const export_ms = 0;
  const total_ms = Date.now() - started + load_ms;

  return {
    feed,
    source_rows: snapshot.source_row_count,
    eligible_rows: eligible.length,
    ineligible_rows: records.length - eligible.length,
    selected_rows: selected.length,
    ineligible_reasons,
    entity_counts_source: countEntities(
      records.map((r) => r.entity).filter(Boolean) as DiscoveryEntity[]
    ),
    entity_counts_pilot: countEntities(selected),
    provider_type_counts: snapshot.provider_type_counts,
    medicare_readiness: MEDICARE_ENTITY_READINESS,
    query_readiness: runQueryReadiness(selected),
    timings: {
      load_ms,
      normalize_ms,
      eligibility_ms,
      validation_ms,
      export_ms,
      total_ms,
    },
  };
}

/** Test helper: evaluate a providers row list without a live client. */
export function snapshotFromProviderRows(
  providers: DbProvider[]
): DiscoverySourceSnapshot {
  let max_updated_at: string | null = null;
  const provider_type_counts: Record<string, number> = {};
  for (const row of providers) {
    const t = row.provider_type || 'unknown';
    provider_type_counts[t] = (provider_type_counts[t] ?? 0) + 1;
    if (row.updated_at && (!max_updated_at || row.updated_at > max_updated_at)) {
      max_updated_at = row.updated_at;
    }
  }
  return {
    providers,
    npnByLicenseKey: new Map(),
    source_row_count: providers.length + CARRIER_REGISTRY.length,
    provider_type_counts,
    max_updated_at,
    dfs_npn_rows: 0,
  };
}
