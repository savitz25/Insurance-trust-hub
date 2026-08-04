'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Copy,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  PROTECT_FOCUS_OPTIONS,
  type CoveragePlan,
} from '@/lib/my-insurance/plan-types';
import {
  archivePlan,
  deletePlan,
  duplicatePlan,
  getPlanStats,
  listAllPlans,
  loadMyInsuranceStore,
  renamePlan,
  setActivePlan,
} from '@/lib/my-insurance/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Phase D — multi-plan library (My Move reports parity).
 */
export function PlansLibrary() {
  const router = useRouter();
  const [plans, setPlans] = useState<CoveragePlan[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const store = loadMyInsuranceStore();
    setPlans(listAllPlans(store));
    setActiveId(store.activePlanId);
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    window.addEventListener('storage', onStore);
    return () => {
      window.removeEventListener('ith-my-insurance-store', onStore);
      window.removeEventListener('storage', onStore);
    };
  }, [refresh]);

  if (!hydrated) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
        Loading coverage plans...
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FolderOpen className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="font-medium text-slate-900">No coverage plans yet</p>
          <p className="max-w-md text-sm text-slate-600">
            Start guided setup to create your first research plan. Shortlist and reports attach to the
            active plan.
          </p>
          <Button asChild className="mt-2 bg-teal-600 hover:bg-teal-700">
            <Link href="/my-insurance/setup">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Guided setup
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {plans.length} plan{plans.length === 1 ? '' : 's'} on this device. Compare tray stays global.
        </p>
        <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
          <Link href="/my-insurance/setup">
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            New plan setup
          </Link>
        </Button>
      </div>

      <ul className="space-y-3">
        {plans.map((plan) => {
          const stats = getPlanStats(plan.id);
          const isActive = plan.id === activeId && plan.status !== 'archived';
          const isRenaming = renamingId === plan.id;
          return (
            <li key={plan.id}>
              <Card
                className={cn(
                  'shadow-sm transition-colors',
                  isActive && 'border-teal-300 ring-1 ring-teal-100'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {isRenaming ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="max-w-xs"
                            aria-label="Plan label"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700"
                            onClick={() => {
                              renamePlan(plan.id, renameValue);
                              setRenamingId(null);
                              toast.success('Plan renamed');
                              refresh();
                            }}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <CardTitle className="text-lg text-slate-900">{plan.label}</CardTitle>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Updated {new Date(plan.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {isActive ? (
                        <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                          Active
                        </span>
                      ) : null}
                      {plan.status === 'archived' ? (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                          Archived
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.protectFocus.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {plan.protectFocus.map((id) => (
                        <li
                          key={id}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                        >
                          {PROTECT_FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-sm text-slate-600">
                    {plan.location?.label ||
                      [plan.location?.zip, plan.location?.state].filter(Boolean).join(' ') ||
                      'No location set'}
                    {' · '}
                    Shortlist {stats.shortlist}/3 · {stats.snapshots} tool save
                    {stats.snapshots === 1 ? '' : 's'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                      onClick={() => {
                        setActivePlan(plan.id);
                        toast.success(`Active plan: ${plan.label}`);
                        router.push('/my-insurance');
                      }}
                    >
                      <FolderOpen className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActivePlan(plan.id);
                        router.push(
                          `/my-insurance/report?planId=${encodeURIComponent(plan.id)}`
                        );
                      }}
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />
                      View report
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenamingId(plan.id);
                        setRenameValue(plan.label);
                      }}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const copy = duplicatePlan(plan.id);
                        if (copy) {
                          toast.success('Plan duplicated');
                          refresh();
                        }
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Duplicate
                    </Button>
                    {plan.status !== 'archived' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          archivePlan(plan.id);
                          toast.message('Plan archived');
                          refresh();
                        }}
                      >
                        <Archive className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Archive
                      </Button>
                    ) : null}
                    {confirmDeleteId === plan.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-rose-700">Delete plan and its shortlist?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            deletePlan(plan.id);
                            setConfirmDeleteId(null);
                            toast.message('Plan deleted');
                            refresh();
                          }}
                        >
                          Confirm delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => setConfirmDeleteId(plan.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
