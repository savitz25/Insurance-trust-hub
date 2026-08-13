'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calculator, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ACA_PLAN_EXPLORER_PATH,
  ACA_SUBSIDY_PATH,
  COST_ESTIMATOR_PATH,
  COVERAGE_COMPASS_PATH,
  MARKETPLACE_RESEARCH_PATH,
} from '@/lib/my-insurance/constants';
import {
  CALCULATOR_LABELS,
  mapToolIdToCalculatorId,
  type CalculatorToolId,
  type SavedCalculatorResultRow,
} from '@/lib/my-insurance/types';
import {
  getToolSnapshots,
  removeToolSnapshot,
} from '@/lib/my-insurance/storage';
import type { ToolSnapshot } from '@/lib/my-insurance/plan-types';
import { deleteCalculatorResultAction } from '@/actions/my-insurance';
import { extractMarketplaceResearch } from '@/lib/marketplace/research-snapshot';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Props = {
  cloudRows?: SavedCalculatorResultRow[];
};

function toolLabel(id: string): string {
  return CALCULATOR_LABELS[id as CalculatorToolId] || id;
}

function sourcePathFor(id: string, snapshotPath?: string): string {
  if (snapshotPath) return snapshotPath;
  if (id === 'aca_subsidy') return ACA_SUBSIDY_PATH;
  if (id === 'aca_plan_explorer') return ACA_PLAN_EXPLORER_PATH;
  if (id === 'cost_estimator') return COST_ESTIMATOR_PATH;
  if (id === 'marketplace_research') return MARKETPLACE_RESEARCH_PATH;
  if (id === 'needs_assessment') return COVERAGE_COMPASS_PATH;
  return '/tools';
}

type UnifiedRow = {
  key: string;
  source: 'cloud' | 'device';
  cloudId?: string;
  localId?: string;
  calculatorId: string;
  title: string;
  summary: string;
  href: string;
  dateIso: string;
  live?: boolean | null;
  market?: string | null;
};

export function SavedResearchPanel({ cloudRows = [] }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<ToolSnapshot[]>([]);

  const refresh = useCallback(() => {
    setLocal(getToolSnapshots());
  }, []);

  useEffect(() => {
    refresh();
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => window.removeEventListener('ith-my-insurance-store', onStore);
  }, [refresh]);

  const rows = useMemo<UnifiedRow[]>(() => {
    const cloud: UnifiedRow[] = cloudRows.map((row) => {
      const research = extractMarketplaceResearch(row.snapshot);
      return {
        key: `cloud-${row.id}`,
        source: 'cloud',
        cloudId: row.id,
        calculatorId: row.calculator_id,
        title: row.title,
        summary:
          research?.costSummary ||
          research?.assistanceSummary ||
          row.snapshot?.summaryText ||
          row.title,
        href: sourcePathFor(row.calculator_id, row.snapshot?.sourcePath),
        dateIso: row.updated_at || row.created_at,
        live: research?.usedLiveMarketplace ?? row.used_live_marketplace ?? null,
        market:
          research?.marketLabel ||
          [row.county, row.state, row.zip].filter(Boolean).join(' · ') ||
          null,
      };
    });
    const cloudKeys = new Set(
      cloud.map((r) => `${r.calculatorId}::${r.title.trim().toLowerCase()}`)
    );
    const device: UnifiedRow[] = local
      .filter((snap) => {
        const id = mapToolIdToCalculatorId(snap.toolId);
        return !cloudKeys.has(`${id}::${snap.title.trim().toLowerCase()}`);
      })
      .map((snap) => ({
        key: `local-${snap.id}`,
        source: 'device' as const,
        localId: snap.id,
        calculatorId: mapToolIdToCalculatorId(snap.toolId),
        title: snap.title,
        summary: snap.summary,
        href: snap.href || '/tools',
        dateIso: snap.capturedAt,
        live: null,
        market: null,
      }));
    return [...cloud, ...device].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [cloudRows, local]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Calculator className="h-5 w-5 text-[#0284C7]" />
          Saved research
        </h2>
        <span className="text-sm text-slate-500">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-slate-600">
              No saved research yet. Run a tool, then save the result to this HQ.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={MARKETPLACE_RESEARCH_PATH}>Marketplace research</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={ACA_SUBSIDY_PATH}>ACA planner</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={COST_ESTIMATOR_PATH}>Cost planner</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={COVERAGE_COMPASS_PATH}>Coverage Compass</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {rows.map((row) => {
            const dateLabel = new Date(row.dateIso).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <li
                key={row.key}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{dateLabel}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-[#0284C7]">
                    {toolLabel(row.calculatorId)}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-900">{row.title}</p>
                  {row.market ? (
                    <p className="mt-1 text-sm text-slate-600">{row.market}</p>
                  ) : null}
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{row.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {row.live === true ? (
                      <span className="rounded-full bg-[#E0F2FE] px-2 py-0.5 font-medium text-[#0A2540]">
                        Live Marketplace landscape
                      </span>
                    ) : row.live === false ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        Educational baseline
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {row.source === 'cloud' ? 'In your account' : 'On this device'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={row.href}>Re-run</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    className="text-slate-600"
                    onClick={async () => {
                      if (row.cloudId) {
                        const res = await deleteCalculatorResultAction(row.cloudId);
                        if (!res.ok) {
                          toast.error(res.error);
                          return;
                        }
                        toast.success('Removed from account');
                        router.refresh();
                      }
                      if (row.localId) {
                        removeToolSnapshot(row.localId);
                        refresh();
                        if (!row.cloudId) toast.message('Removed from this device');
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
