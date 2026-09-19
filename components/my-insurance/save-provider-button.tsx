'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  removeProviderAction,
  saveProviderAction,
  listSavedProviderSlugsAction,
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
export function SaveProviderButton(props: SaveProviderButtonProps) {
  const mi = useMyInsuranceOptional();
  return <SaveProviderControl key={`${props.providerSlug}:${mi?.user?.id ?? 'device'}`} {...props} />;
}

function SaveProviderControl({
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
  const saving = useRef(false);
  const scope = useRef({ active: true });
  const [saveError, setSaveError] = useState<string | null>(null);
  const disclosureId = useId();
  const [accountConfirmed, setAccountConfirmed] = useState(false);
  const [accountUnavailable, setAccountUnavailable] = useState(false);
  const confirmationVersion = useRef(0);
  const [local, setLocal] = useState<SavedProvider | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [fullPanel, setFullPanel] = useState<SavedProvider[] | null>(null);

  useEffect(() => {
    const current = { active: true };
    scope.current = current;
    return () => { current.active = false; };
  }, [mi?.user?.id]);

  // The provider's saved set is cloud UNION local: never use it as a cloud receipt.
  // An owner-bound read restores only the legacy Insurance account disclosure.
  useEffect(() => {
    const owner = mi?.user?.id;
    if (!owner || mi?.loading) return;
    const version = ++confirmationVersion.current;
    let active = true;
    void listSavedProviderSlugsAction(owner).then((slugs) => {
      if (active && version === confirmationVersion.current && slugs.includes(providerSlug)) setAccountConfirmed(true);
    }).catch(() => { if (active && version === confirmationVersion.current) setAccountUnavailable(true); });
    return () => { active = false; };
  }, [mi?.user?.id, mi?.loading, providerSlug]);

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
        description: result.provider.status === 'researching'
          ? 'Added under Researching on this device'
          : 'Added to shortlist on this device',
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
    if (saving.current || busy) return;
    saving.current = true;
    const current = scope.current;
    let locallySaved = false;
    setSaveError(null);
    setBusy(true);
    try {
      // The existing device workspace is shared by guests and signed-in users.
      // Saving locally does not assert that unresolved auth means "guest".
      // Auth continuity already merges persisted providers on session restore.
      const result = upsertSavedProvider({
        ...baseInput,
        status,
        shortlistPolicy: 'block',
      });
      const storageError = getLastSaveError();
      if (storageError) throw new Error(storageError);
      handleResult(result, { intendShortlist: status === 'shortlisted' });
      locallySaved = result.ok;
      if (!result.ok || result.alreadySaved) return;
      // Never stash a failed/cap-blocked save as a future account mutation.
      if (mi?.user && !mi.loading) {
        const cloud = await saveProviderAction({ providerSlug, providerName, expectedUserId: mi.user.id });
        if (!current.active) return;
        if (!cloud.ok) {
          setAccountUnavailable(true);
          toast.error('Saved on this device, but account sync failed. Retry from My Insurance.');
        } else {
          setAccountConfirmed(true);
          setAccountUnavailable(false);
          mi.markProviderSaved(providerSlug);
        }
      }
    } catch {
      if (current.active && locallySaved) setAccountUnavailable(true);
      if (current.active) setSaveError(locallySaved
        ? 'Saved on this device, but account sync failed. Retry from My Insurance.'
        : 'Could not complete Save. Check device storage and try again.');
    } finally {
      saving.current = false;
      if (current.active) setBusy(false);
    }
  }

  async function handlePrimaryClick() {
    // Re-read synchronous storage: React may not have rendered the first write
    // yet when another activation arrives in the same event turn.
    if (local || findLocalProvider(providerSlug)) {
      refresh();
      setManageOpen((v) => !v);
      return;
    }
    // First save: directory uses researching; profile often shortlisted
    await saveWithStatus(defaultStatus);
  }

  async function handleRemove() {
    if (busy) return;
    confirmationVersion.current++;
    setBusy(true);
    try {
      if (mi?.user) {
        await removeProviderAction(providerSlug);
        mi.unmarkProviderSaved(providerSlug);
      }
      removeProviderFromPlan(providerSlug);
      removeGuestProvider(providerSlug);
      setAccountConfirmed(false);
      toast.message('Removed from My Insurance');
      setManageOpen(false);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const saved = Boolean(local) || accountConfirmed;
  const disclosure = accountConfirmed && mi?.user && !mi.loading
    ? 'Saved to your Insurance account'
    : accountUnavailable
      ? 'Saved on this device — account sync unavailable'
      : 'Saved on this device';

  return (
    <>
      <div className={cn('relative inline-flex flex-col items-stretch gap-1', className)}>
        <Button
          type="button"
          variant={saved ? 'secondary' : variant}
          size={compact ? 'sm' : 'sm'}
          onClick={handlePrimaryClick}
          disabled={busy}
          aria-busy={busy}
          className={cn('gap-1.5 min-h-11', compact && 'text-xs')}
          aria-pressed={saved}
          aria-describedby={saved ? disclosureId : undefined}
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
        {saved ? <p id={disclosureId} role="status" className="max-w-64 text-xs">{disclosure}</p> : null}
        {saveError ? <p role="alert" className="max-w-64 text-sm text-red-700">{saveError}</p> : null}

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
