'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ResearchSessionRow } from '@/lib/my-insurance/types';
import {
  listGuestResearchSessions,
  removeGuestResearchSession,
} from '@/lib/my-insurance/session-storage';
import { deleteResearchSessionAction } from '@/actions/my-insurance';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { toast } from 'sonner';

export function ResearchSessionsPanel({
  cloudRows = [],
}: {
  cloudRows?: ResearchSessionRow[];
}) {
  const mi = useMyInsuranceOptional();
  const [guest, setGuest] = useState<ResearchSessionRow[]>([]);

  useEffect(() => {
    const refresh = () => setGuest(listGuestResearchSessions());
    refresh();
    window.addEventListener('ith-research-sessions', refresh);
    return () => window.removeEventListener('ith-research-sessions', refresh);
  }, []);

  const cloudIds = new Set(cloudRows.map((r) => r.resumeHref));
  const localOnly = mi?.user
    ? guest.filter((g) => !cloudIds.has(g.resumeHref))
    : guest;
  const rows = [...cloudRows, ...localOnly];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FolderOpen className="h-5 w-5 text-[#0284C7]" />
          Research sessions
        </h2>
        <span className="text-sm text-slate-500">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-slate-600">
            No research sessions yet. Save one from a verified profile or a live hub — it is a
            research passport, not a quote request.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{row.title}</p>
                <p className="text-xs text-slate-500">
                  {row.source}
                  {row.providerName ? ` · ${row.providerName}` : ''}
                  {row.marketplaceZip ? ` · ZIP ${row.marketplaceZip}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={row.resumeHref}>Resume</Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (row.id.startsWith('guest-')) {
                      removeGuestResearchSession(row.id);
                    } else {
                      const res = await deleteResearchSessionAction(row.id);
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                    }
                    toast.message('Session removed');
                    setGuest(listGuestResearchSessions());
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
