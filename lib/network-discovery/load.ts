import type { Provider as DbProvider } from '@/types/supabase';
import { CARRIER_REGISTRY } from '@/lib/carriers/registry';

export type DiscoverySourceSnapshot = {
  providers: DbProvider[];
  npnByLicenseKey: Map<string, string>;
  source_row_count: number;
  provider_type_counts: Record<string, number>;
  max_updated_at: string | null;
  dfs_npn_rows: number;
};

type QueryClient = {
  from: (table: string) => {
    select: (columns: string, opts?: { count?: 'exact'; head?: boolean }) => {
      range: (
        from: number,
        to: number
      ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
      limit: (
        n: number
      ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

const PAGE = 1000;

async function paginate<T>(
  client: QueryClient,
  table: string,
  columns: string
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) {
      throw new Error(`${table} load failed: ${error.message}`);
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function licenseKey(state: string | null | undefined, number: string | null | undefined): string | null {
  const st = (state || '').trim().toUpperCase();
  const num = (number || '').trim();
  if (!st || !num) return null;
  return `${st}:${num}`;
}

/**
 * Read-only snapshot of existing InsuranceTrustHub data.
 * No Google Places, LLM, geocoding, or new enrichment APIs.
 */
export async function loadDiscoverySource(
  client: QueryClient
): Promise<DiscoverySourceSnapshot> {
  const loaded = await paginate<DbProvider>(client, 'providers', '*');
  const byId = new Map<string, DbProvider>();
  for (const row of loaded) {
    if (!row?.id || byId.has(row.id)) continue;
    byId.set(row.id, row);
  }
  const providers = Array.from(byId.values());

  const provider_type_counts: Record<string, number> = {};
  let max_updated_at: string | null = null;
  for (const row of providers) {
    const t = row.provider_type || 'unknown';
    provider_type_counts[t] = (provider_type_counts[t] ?? 0) + 1;
    if (row.updated_at && (!max_updated_at || row.updated_at > max_updated_at)) {
      max_updated_at = row.updated_at;
    }
  }

  const npnByLicenseKey = new Map<string, string>();
  let dfs_npn_rows = 0;
  try {
    const producers = await paginate<{
      npn: string | null;
      license_number: string | null;
      license_state: string | null;
    }>(client, 'dfs_producers', 'npn,license_number,license_state');
    for (const p of producers) {
      const npn = (p.npn || '').trim();
      if (!npn || !/^\d{5,10}$/.test(npn)) continue;
      const key = licenseKey(p.license_state || 'FL', p.license_number);
      if (!key || npnByLicenseKey.has(key)) continue;
      npnByLicenseKey.set(key, npn);
      dfs_npn_rows += 1;
    }
  } catch {
    // Staging table optional — identity still works from DOI on providers.
  }

  return {
    providers,
    npnByLicenseKey,
    source_row_count: providers.length + CARRIER_REGISTRY.length,
    provider_type_counts,
    max_updated_at,
    dfs_npn_rows,
  };
}

export function npnForProvider(
  row: DbProvider,
  npnByLicenseKey: Map<string, string>
): string | null {
  const license = row.license_info?.licenses?.[0];
  const key = licenseKey(license?.state, license?.license_number);
  if (!key) return null;
  return npnByLicenseKey.get(key) ?? null;
}
