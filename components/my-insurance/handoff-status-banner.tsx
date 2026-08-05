'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Surfaces ?handoff=ok|failed on Insurance HQ without breaking guest tools.
 */
export function HandoffStatusBanner() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const status = params.get('handoff');

  useEffect(() => {
    if (status === 'ok') {
      toast.success('Signed in across Ask Trust Hub');
    }
  }, [status]);

  if (dismissed || status !== 'failed') return null;

  return (
    <div
      className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p>
        We couldn&apos;t carry your sign-in over from another Trust Hub site. Please sign in once on
        this site (magic link or Google) — your research on this device stays either way.
      </p>
      <button
        type="button"
        className="shrink-0 text-xs font-semibold underline"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  );
}
