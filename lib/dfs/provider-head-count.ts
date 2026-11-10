import 'server-only';

import { unstable_cache } from 'next/cache';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import {
  structuredIdCountFilter,
  type ProviderCountField,
} from './provider-count-filter';
import { rememberCount } from './provider-count-flight';

const COUNT_TTL_MS = 60 * 60 * 1000;

async function queryStructuredCount(
  state: string,
  field: ProviderCountField,
  idsCsv: string
): Promise<number> {
  if (!isSupabaseConfigured()) throw new Error('provider count client unavailable');
  const supabase = createPublicClient();
  if (!supabase) throw new Error('provider count client unavailable');
  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', [state])
    .or(structuredIdCountFilter(idsCsv.split(','), field));
  if (error || count == null) throw new Error('provider count unavailable');
  return count;
}

async function queryStateCount(state: string): Promise<number> {
  if (!isSupabaseConfigured()) throw new Error('provider count client unavailable');
  const supabase = createPublicClient();
  if (!supabase) throw new Error('provider count client unavailable');
  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .contains('states_licensed', [state]);
  if (error || count == null) throw new Error('provider count unavailable');
  return count;
}

const cachedStructuredCount = unstable_cache(
  queryStructuredCount,
  ['provider-structured-head-count-v1'],
  { revalidate: 3600 }
);

const cachedStateCount = unstable_cache(
  queryStateCount,
  ['provider-state-head-count-v1'],
  { revalidate: 3600 }
);

/** Exact verified count for one structured id key. Successes are reused for one hour. */
export function exactStructuredProviderCount(
  state: string,
  field: ProviderCountField,
  ids: readonly string[]
): Promise<number> {
  const idsCsv = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].join(',');
  const key = `structured:${state}:${field}:${idsCsv}`;
  return rememberCount(key, COUNT_TTL_MS, () => cachedStructuredCount(state, field, idsCsv));
}

/** Exact verified count for one state license array. Successes are reused for one hour. */
export function exactVerifiedStateCount(state: string): Promise<number> {
  return rememberCount(`state:${state}`, COUNT_TTL_MS, () => cachedStateCount(state));
}

/** Fail soft. A timeout is not stored as zero. */
export async function countVerifiedProvidersInState(state: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    return await exactVerifiedStateCount(state);
  } catch {
    return 0;
  }
}
