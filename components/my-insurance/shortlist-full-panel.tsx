'use client';

import type { SavedProvider } from '@/lib/my-insurance/plan-types';
import { SHORTLIST_CAP } from '@/lib/my-insurance/shortlist-rules';
import { Button } from '@/components/ui/button';

type Props = {
  shortlisted: SavedProvider[];
  incomingName: string;
  onCancel: () => void;
  onDemoteOldest: () => void;
  onReplace: (slug: string) => void;
  onSaveAsResearching: () => void;
};

/**
 * When user tries to shortlist a 4th agency — never silently drop data.
 */
export function ShortlistFullPanel({
  shortlisted,
  incomingName,
  onCancel,
  onDemoteOldest,
  onReplace,
  onSaveAsResearching,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortlist-full-title"
    >
      <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
        <h2 id="shortlist-full-title" className="text-lg font-semibold text-slate-900">
          Shortlist is full ({SHORTLIST_CAP})
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Move one to Researching or Done, replace someone, or save{' '}
          <strong>{incomingName}</strong> as Researching instead.
        </p>
        <ul className="mt-4 space-y-2">
          {shortlisted.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-medium">{p.providerName}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => onReplace(p.providerSlug)}>
                Replace
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={onDemoteOldest}>
            Move oldest shortlisted → Researching &amp; add this
          </Button>
          <Button type="button" variant="outline" onClick={onSaveAsResearching}>
            Save as Researching only
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
