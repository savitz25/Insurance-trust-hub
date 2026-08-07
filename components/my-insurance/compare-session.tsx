'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Provider } from '@/types/provider';
import { ProviderCompareView } from '@/components/my-insurance/provider-compare-view';
import {
  clearCompareTray,
  getCompareTray,
} from '@/lib/my-insurance/compare-storage';
import { COMPARE_PATH } from '@/lib/my-insurance/constants';
import { Button } from '@/components/ui/button';

type Props = {
  /** Providers resolved on the server from ?add= slugs */
  providers: Provider[];
  comparisonId?: string | null;
  /** True when the URL already carried compare slugs */
  hasUrlSlugs: boolean;
};

/**
 * Guest-first compare continuity:
 * - Reads durable tray `ith-my-insurance-compare-tray-v1`
 * - If URL has no slugs but tray has items, rewrites to ?add=...
 * - Empty UX by tray size: 0 / 1 / >=2
 */
export function CompareSession({ providers, comparisonId, hasUrlSlugs }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<'boot' | 'ready'>(
    providers.length >= 2 || hasUrlSlugs ? 'ready' : 'boot'
  );
  const [trayLen, setTrayLen] = useState(0);

  useEffect(() => {
    const tray = getCompareTray();
    setTrayLen(tray.length);

    if (!hasUrlSlugs && tray.length > 0) {
      const qs = tray.map((t) => `add=${encodeURIComponent(t.slug)}`).join('&');
      router.replace(`${COMPARE_PATH}?${qs}`);
      // Stay on boot until navigation brings server providers
      return;
    }

    setPhase('ready');
  }, [hasUrlSlugs, router]);

  // Listen for tray clears while empty UI is open
  useEffect(() => {
    const sync = () => setTrayLen(getCompareTray().length);
    window.addEventListener('ith-compare-tray', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ith-compare-tray', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (providers.length >= 2) {
    return <ProviderCompareView providers={providers} comparisonId={comparisonId} />;
  }

  if (phase === 'boot' || (!hasUrlSlugs && trayLen >= 2 && providers.length < 2)) {
    return (
      <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center">
        <p className="font-medium text-slate-900">Loading your compare set...</p>
        <p className="mt-2 text-sm text-slate-600">
          Restoring agencies saved on this device.
        </p>
      </div>
    );
  }

  // length === 1 (URL or tray)
  if (providers.length === 1 || trayLen === 1) {
    const name = providers[0]?.name ?? getCompareTray()[0]?.name ?? 'one agency';
    return (
      <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center">
        <p className="font-medium text-slate-900">Add one more agency to compare</p>
        <p className="mt-2 text-sm text-slate-600">
          You have <strong>{name}</strong> in compare. Select 2-4 agencies total for a
          side-by-side view.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild className="bg-[#0284C7] hover:bg-[#1E3A8A]">
            <Link href="/directory">Browse directory</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my-insurance">Insurance HQ / shortlist</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Empty (0 in tray and URL)
  return (
    <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center">
      <p className="font-medium text-slate-900">Select 2-4 agencies to compare</p>
      <p className="mt-2 text-sm text-slate-600">
        Use <strong>Add to compare</strong> on provider profiles or your shortlist. Your
        selection is saved on this device until you clear it.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild className="bg-[#0284C7] hover:bg-[#1E3A8A]">
          <Link href="/directory">Browse directory</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/my-insurance">Open shortlist</Link>
        </Button>
      </div>
      {trayLen > 0 ? (
        <button
          type="button"
          className="mt-4 text-xs text-slate-500 underline hover:text-slate-700"
          onClick={() => {
            clearCompareTray();
            setTrayLen(0);
          }}
        >
          Clear compare selection
        </button>
      ) : null}
    </div>
  );
}
