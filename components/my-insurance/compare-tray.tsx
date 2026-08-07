'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitCompare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  clearCompareTray,
  getCompareTray,
  removeFromCompareTray,
  type CompareTrayItem,
} from '@/lib/my-insurance/compare-storage';
import { COMPARE_PATH } from '@/lib/my-insurance/constants';

export function CompareTray() {
  const [items, setItems] = useState<CompareTrayItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(getCompareTray());
    sync();
    window.addEventListener('ith-compare-tray', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ith-compare-tray', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (items.length === 0) return null;

  const href = `${COMPARE_PATH}?${items.map((i) => `add=${encodeURIComponent(i.slug)}`).join('&')}`;

  return (
    <>
      <div
        className="pointer-events-none fixed bottom-6 left-1/2 z-40 hidden w-[min(92vw,40rem)] -translate-x-1/2 md:block"
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#0284C7]/30 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur">
          <GitCompare className="h-4 w-4 shrink-0 text-[#0284C7]" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {items.length} selected: {items.map((i) => i.name).join(', ')}
          </span>
          <Button size="sm" className="bg-[#0284C7] hover:bg-[#1E3A8A]" asChild>
            <Link href={href}>Compare</Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => clearCompareTray()}
            aria-label="Clear compare selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E0F2FE] bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden">
        <div className="mb-2 flex flex-wrap gap-1">
          {items.map((i) => (
            <button
              key={i.slug}
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-[#E0F2FE] px-2 py-0.5 text-xs text-[#0A2540]"
              onClick={() => removeFromCompareTray(i.slug)}
            >
              {i.name}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 gap-2 bg-[#0284C7] hover:bg-[#1E3A8A]" asChild>
            <Link href={href}>
              <GitCompare className="h-4 w-4" />
              Compare {items.length}
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => clearCompareTray()} aria-label="Clear">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
