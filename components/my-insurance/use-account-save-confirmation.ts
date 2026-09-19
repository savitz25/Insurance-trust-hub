'use client';

import { useEffect, useMemo, useState } from 'react';
import { listSavedProviderSlugsAction } from '@/actions/my-insurance';

type Snapshot = { status: 'pending' | 'ready' | 'unavailable'; slugs: ReadonlySet<string> };
export type AccountSaveConfirmation = Snapshot & { forget: (slug: string) => void };
const pending: Snapshot = { status: 'pending', slugs: new Set() };

/** One owner-bound read per provider auth tenure, not per directory card.
 * No module/global account cache; logout/loading changes discard the tenure.
 */
export function useAccountSaveConfirmation(owner: string | undefined, loading: boolean): AccountSaveConfirmation {
  const tenure = useMemo<{ owner?: string; request?: Promise<string[]>; removed: Set<string> }>(() => ({ owner: loading ? undefined : owner, removed: new Set() }), [owner, loading]);
  const [result, setResult] = useState<{ tenure: typeof tenure; value: Snapshot } | null>(null);
  useEffect(() => {
    if (!tenure.owner) return;
    let active = true;
    // Reuse on StrictMode effect replay too, without caching across owners.
    tenure.request ??= listSavedProviderSlugsAction(tenure.owner);
    void tenure.request.then(slugs => {
      if (active) setResult({ tenure, value: { status: 'ready', slugs: new Set(slugs.filter(slug => !tenure.removed.has(slug))) } });
    }).catch(() => {
      if (active) setResult({ tenure, value: { status: 'unavailable', slugs: new Set() } });
    });
    return () => { active = false; };
  }, [tenure]);
  return { ...(result?.tenure === tenure ? result.value : pending), forget: slug => {
    tenure.removed.add(slug);
    setResult(previous => {
      if (!previous || previous.tenure !== tenure) return previous;
      const slugs = new Set(previous.value.slugs);
      slugs.delete(slug);
      return { tenure, value: { ...previous.value, slugs } };
    });
  } };
}
