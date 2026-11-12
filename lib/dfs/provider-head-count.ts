import 'server-only';

import { unstable_cache } from 'next/cache';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import {
  COUNT_FRESH_MS,
  COUNT_MAX_AGE_MS,
  type HeadCount,
  unavailableCount,
} from './provider-count';
import { rememberCount } from './provider-count-flight';
import {
  structuredIdCountFilter,
  type ProviderCountField,
} from './provider-count-filter';
import { captureProviderStatementTimeout } from '@/lib/observability/sentry';
import { headCountTimeoutError, PROVIDERS_STATEMENT_ROUTE } from '@/lib/observability/sentry-policy';

const COUNT_TTL_MS = COUNT_FRESH_MS;

function rejectProviderCount(
  error: unknown,
  count: number | null,
  proxyStatus: string | null
): asserts count is number {
  if (!error && count != null) return;
  captureProviderStatementTimeout(headCountTimeoutError(error, proxyStatus), {
    route: PROVIDERS_STATEMENT_ROUTE,
    queryKind: 'count',
  });
  throw new Error('provider count unavailable');
}

function openCountClient(): { client: NonNullable<ReturnType<typeof createPublicClient>>; proxyStatus: () => string | null } | null {
  let proxyStatus: string | null = null;
  const client = createPublicClient((response) => {
    proxyStatus = response.headers.get('proxy-status');
  });
  if (!client) return null;
  return { client, proxyStatus: () => proxyStatus };
}

type CachedCount = { value: number; asOf: number };

async function queryStructuredCount(
  state: string,
  field: ProviderCountField,
  idsCsv: string
): Promise<CachedCount> {
  if (!isSupabaseConfigured()) throw new Error('provider count client unavailable');
  const opened = openCountClient();
  if (!opened) throw new Error('provider count client unavailable');
  const { count, error } = await opened.client
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', [state])
    .or(structuredIdCountFilter(idsCsv.split(','), field));
  rejectProviderCount(error, count, opened.proxyStatus());
  return { value: count, asOf: Date.now() };
}

async function queryStateCount(state: string): Promise<CachedCount> {
  if (!isSupabaseConfigured()) throw new Error('provider count client unavailable');
  const opened = openCountClient();
  if (!opened) throw new Error('provider count client unavailable');
  const { count, error } = await opened.client
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', [state]);
  rejectProviderCount(error, count, opened.proxyStatus());
  return { value: count, asOf: Date.now() };
}

const cachedStructuredCount = unstable_cache(
  queryStructuredCount,
  ['provider-structured-head-count-v2'],
  { revalidate: 3600 }
);

const cachedStateCount = unstable_cache(
  queryStateCount,
  ['provider-state-head-count-v2'],
  { revalidate: 3600 }
);

async function loadCachedCount(cached: Promise<CachedCount>, live: () => Promise<CachedCount>) {
  const stored = await cached;
  if (Date.now() - stored.asOf < COUNT_MAX_AGE_MS) return stored;
  return live();
}

/** Exact verified count for one structured id key. Successes are reused for one hour. */
export function exactStructuredProviderCount(
  state: string,
  field: ProviderCountField,
  ids: readonly string[]
): Promise<HeadCount> {
  const idsCsv = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].join(',');
  const key = `structured:${state}:${field}:${idsCsv}`;
  return rememberCount(key, COUNT_TTL_MS, () =>
    loadCachedCount(cachedStructuredCount(state, field, idsCsv), () =>
      queryStructuredCount(state, field, idsCsv)
    )
  );
}

/** Exact verified count for one state license array. Successes are reused for one hour. */
export function exactVerifiedStateCount(state: string): Promise<HeadCount> {
  return rememberCount(`state:${state}`, COUNT_TTL_MS, () =>
    loadCachedCount(cachedStateCount(state), () => queryStateCount(state))
  );
}

/** A miss is unavailable. It is never stored or returned as zero. */
export async function countVerifiedProvidersInState(state: string): Promise<HeadCount> {
  if (!isSupabaseConfigured()) return unavailableCount();
  try {
    return await exactVerifiedStateCount(state);
  } catch {
    return unavailableCount();
  }
}
