'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  removeProviderAction,
  saveProviderAction,
} from '@/actions/my-insurance';
import {
  getActivePlan,
  getLastSaveError,
  getProvidersForPlan,
  removeProviderFromPlan,
  saveAsResearching,
  shortlistReplacing,
  shortlistWithDemoteOldest,
  upsertSavedProvider,
  type UpsertSavedProviderResult,
} from '@/lib/my-insurance/storage';
import type { ProviderResearchStatus, SavedProvider } from '@/lib/my-insurance/plan-types';
import { PROVIDER_STATUS_OPTIONS } from '@/lib/my-insurance/plan-types';
import {
  removeGuestProvider,
  stashPendingSaveAction,
} from '@/lib/my-insurance/guest-storage';
import { ShortlistFullPanel } from '@/components/my-insurance/shortlist-full-panel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type SaveProviderButtonProps = {
  providerSlug: string;
  providerName: string;
  city?: string;
  state?: string;
  licenseSummary?: string;
  lines?: string[];
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  /**
   * Directory default: researching.
   * Profile explicit shortlist: shortlisted.
   */
  defaultStatus?: ProviderResearchStatus;
  /** Compact card layout for directory grids */
  compact?: boolean;
};

function findLocalProvider(slug: string): SavedProvider | null {
  const plan = getActivePlan();
  if (!plan) return null;
  return getProvidersForPlan(plan.id).find((p) => p.providerSlug === slug) ?? null;
}

/**
 * Save / manage My Insurance shortlist (guest localStorage + optional cloud).
 * Phase B: directory default researching; shortlist cap 3 with replace flow.
 */
export function SaveProviderButton({
  providerSlug,
  providerName,
  city,
  state,
  licenseSummary,
  lines,
  className,
  variant = 'outline',
  defaultStatus = 'shortlisted',
  compact = false,
}: SaveProviderButtonProps) {
  const mi = useMyInsuranceOptional();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<SavedProvider | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [fullPanel, setFullPanel] = useState<SavedProvider[] | null>(null);

  const refresh = useCallback(() => {
    setLocal(findLocalProvider(providerSlug));
  }, [providerSlug]);

  useEffect(() => {
    refresh();
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => window.removeEventListener('ith-my-insurance-store', onStore);
  }, [refresh]);

  const baseInput = {
    providerSlug,
    providerName,
    city,
    state,
    licenseSummary,
    lines,
    profilePath: `/providers/${providerSlug}` as const,
  };

  function handleResult(result: UpsertSavedProviderResult, opts?: { intendShortlist?: boolean }) {
    const err = getLastSaveError();
    if (err) {
      toast.error(err);
      refresh();
      return;
    }
    if (!result.ok) {
      setFullPanel(result.shortlisted);
      return;
    }
    if (result.alreadySaved && !opts?.intendShortlist) {
      toast.message('Already in My Insurance', {
        description: result.provider.status,
        action: {
          label: 'Manage',
          onClick: () => {
            window.location.href = '/my-insurance';
          },
        },
      });
    } else if (result.created) {
      toast.success('Saved to My Insurance', {
        description: mi?.user
          ? result.provider.status === 'researching'
            ? 'Added under Researching · synced to your account'
            : 'Added to shortlist · synced to your account'
          : result.provider.status === 'researching'
            ? 'Added under Researching on this device · sign in to sync'
            : 'Added to shortlist on this device · sign in to sync',
        action: {
          label: 'Open HQ',
          onClick: () => {
            window.location.href = '/my-insurance';
          },
        },
      });
    } else {
      toast.success('Updated in My Insurance', {
        description: `Status: ${result.provider.status}`,
        action: {
          label: 'Open HQ',
          onClick: () => {
            window.location.href = '/my-insurance';
          },
        },
      });
    }
    refresh();
  }

  async function saveWithStatus(status: ProviderResearchStatus) {
    if (busy) return;
    setBusy(true);
    try {
      if (mi?.user) {
        // Cloud sync best-effort; local plan is source of shortlist discipline
        if (!mi.isProviderSaved(providerSlug)) {
          await saveProviderAction({ providerSlug, providerName });
          mi.markProviderSaved(providerSlug);
        }
      } else {
        stashPendingSaveAction({
          type: 'provider',
          payload: { providerSlug, providerName },
        });
      }
      const result = upsertSavedProvider({
        ...baseInput,
        status,
        shortlistPolicy: 'block',
      });
      handleResult(result, { intendShortlist: status === 'shortlisted' });
    } finally {
      setBusy(false);
    }
  }

  async function handlePrimaryClick() {
    if (local) {
      setManageOpen((v) => !v);
      return;
    }
    // First save: directory uses researching; profile often shortlisted
    await saveWithStatus(defaultStatus);
  }

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    try {
      if (mi?.user) {
        await removeProviderAction(providerSlug);
        mi.unmarkProviderSaved(providerSlug);
      }
      removeProviderFromPlan(providerSlug);
      removeGuestProvider(providerSlug);
      toast.message('Removed from My Insurance');
      setManageOpen(false);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const saved = Boolean(local) || (mi?.user ? mi.isProviderSaved(providerSlug) : false);

  return (
    <>
      <div className={cn('relative inline-flex flex-col items-stretch gap-1', className)}>
        <Button
          type="button"
          variant={saved ? 'secondary' : variant}
          size={compact ? 'sm' : 'sm'}
          onClick={handlePrimaryClick}
          disabled={busy || mi?.loading}
          className={cn('gap-1.5 min-h-11', compact && 'text-xs')}
          aria-pressed={saved}
          aria-expanded={saved ? manageOpen : undefined}
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4 text-[#0284C7]" aria-hidden />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden />
          )}
          {saved ? (compact ? 'Saved' : 'In My Insurance') : compact ? 'Save' : 'Save'}
          {saved ? <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden /> : null}
        </Button>

        {saved && local ? (
          <p className="text-center text-[10px] font-medium uppercase tracking-wide text-[#0284C7]">
            {local.status.replace('_', ' ')}
          </p>
        ) : null}

        {manageOpen && local ? (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border bg-white p-2 shadow-lg">
            <p className="px-2 py-1 text-xs font-semibold text-slate-500">Manage</p>
            <label className="sr-only" htmlFor={`manage-status-${providerSlug}`}>
              Status
            </label>
            <select
              id={`manage-status-${providerSlug}`}
              className="mb-2 w-full rounded-md border px-2 py-1.5 text-sm"
              value={local.status}
              onChange={async (e) => {
                const status = e.target.value as ProviderResearchStatus;
                setBusy(true);
                try {
                  const result = upsertSavedProvider({
                    ...baseInput,
                    status,
                    shortlistPolicy: 'block',
                  });
                  if (!result.ok) {
                    setFullPanel(result.shortlisted);
                  } else {
                    toast.success(`Status: ${status.replace('_', ' ')}`);
                    refresh();
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              {PROVIDER_STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mb-1 w-full"
              asChild
            >
              <Link href="/my-insurance">Open My Insurance</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full text-red-700"
              onClick={handleRemove}
            >
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      {fullPanel ? (
        <ShortlistFullPanel
          shortlisted={fullPanel}
          incomingName={providerName}
          onCancel={() => setFullPanel(null)}
          onDemoteOldest={() => {
            const result = shortlistWithDemoteOldest({ ...baseInput, status: 'shortlisted' });
            setFullPanel(null);
            handleResult(result, { intendShortlist: true });
          }}
          onReplace={(slug) => {
            const result = shortlistReplacing({ ...baseInput, status: 'shortlisted' }, slug);
            setFullPanel(null);
            handleResult(result, { intendShortlist: true });
          }}
          onSaveAsResearching={() => {
            const result = saveAsResearching({ ...baseInput });
            setFullPanel(null);
            handleResult(result);
          }}
        />
      ) : null}
    </>
  );
}
