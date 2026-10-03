'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  removeProviderAction,
  saveProviderAction,
} from '@/actions/my-insurance';
import { prepareInsuranceParentHandoffAction } from '@/actions/insurance-parent-handoff';
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
import {
  SAVE_ACKNOWLEDGEMENT,
  SAVE_CONTROL_OFF,
  SAVE_CONTROL_ON,
  UNSAVE_ACKNOWLEDGEMENT,
} from '@/lib/my-insurance/parent-adapter';
import {
  clearInsuranceParentPending,
  stashInsuranceParentPending,
} from '@/lib/my-insurance/parent-pending-storage';
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
  /**
   * Published providers.id from the server render.
   * The parent handoff re-reads the row and rejects a mismatch.
   */
  providerId?: string | null;
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
 * Device-first agency Save toggle.
 * ♡ Save → ♥ Saved → ♡ Save. Saving does not create a Watch.
 * Ask parent sync stays off; a resolved identity is only staged on this device.
 */
export function SaveProviderButton({
  providerSlug,
  providerName,
  providerId,
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
  const intentGeneration = useRef(0);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<SavedProvider | null>(null);
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

  function handleResult(result: UpsertSavedProviderResult) {
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
    toast.success(SAVE_ACKNOWLEDGEMENT);
    refresh();
  }

  async function stageParentIntent(generation: number) {
    try {
      const handoff = await prepareInsuranceParentHandoffAction({
        providerSlug,
        clientSuppliedId: providerId ?? null,
      });
      if (generation !== intentGeneration.current || !findLocalProvider(providerSlug)) {
        clearInsuranceParentPending(providerSlug);
        return;
      }
      if (handoff.ok) {
        stashInsuranceParentPending(providerSlug, handoff.pending);
      } else {
        clearInsuranceParentPending(providerSlug);
      }
    } catch {
      if (generation === intentGeneration.current) {
        clearInsuranceParentPending(providerSlug);
      }
    }
  }

  async function saveWithStatus(status: ProviderResearchStatus) {
    if (busy) return;
    setBusy(true);
    try {
      const result = upsertSavedProvider({
        ...baseInput,
        status,
        shortlistPolicy: 'block',
      });
      if (!result.ok) {
        setFullPanel(result.shortlisted);
        return;
      }
      const err = getLastSaveError();
      if (err) {
        toast.error(err);
        refresh();
        return;
      }
      if (mi?.user) {
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
      const generation = intentGeneration.current + 1;
      intentGeneration.current = generation;
      void stageParentIntent(generation);
      toast.success(SAVE_ACKNOWLEDGEMENT);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const saved = Boolean(local) || (mi?.user ? mi.isProviderSaved(providerSlug) : false);

  async function handlePrimaryClick() {
    if (busy) return;
    if (saved) {
      setBusy(true);
      try {
        if (mi?.user) {
          await removeProviderAction(providerSlug);
          mi.unmarkProviderSaved(providerSlug);
        }
        removeProviderFromPlan(providerSlug);
        removeGuestProvider(providerSlug);
        intentGeneration.current += 1;
        clearInsuranceParentPending(providerSlug);
        toast.message(UNSAVE_ACKNOWLEDGEMENT);
        refresh();
      } finally {
        setBusy(false);
      }
      return;
    }
    await saveWithStatus(defaultStatus);
  }

  function finishPanelSave(result: UpsertSavedProviderResult) {
    if (result.ok && !getLastSaveError()) {
      const generation = intentGeneration.current + 1;
      intentGeneration.current = generation;
      void stageParentIntent(generation);
    }
    handleResult(result);
  }

  return (
    <>
      <div className={cn('relative inline-flex flex-col items-stretch gap-1', className)}>
        <Button
          type="button"
          variant={saved ? 'secondary' : variant}
          size="sm"
          onClick={handlePrimaryClick}
          disabled={busy || mi?.loading}
          className={cn('gap-1.5 min-h-11', compact && 'text-xs')}
          aria-pressed={saved}
          aria-label={saved ? SAVE_CONTROL_ON : SAVE_CONTROL_OFF}
        >
          {saved ? SAVE_CONTROL_ON : SAVE_CONTROL_OFF}
        </Button>
      </div>

      {fullPanel ? (
        <ShortlistFullPanel
          shortlisted={fullPanel}
          incomingName={providerName}
          onCancel={() => setFullPanel(null)}
          onDemoteOldest={() => {
            const result = shortlistWithDemoteOldest({ ...baseInput, status: 'shortlisted' });
            setFullPanel(null);
            void finishPanelSave(result);
          }}
          onReplace={(slug) => {
            const result = shortlistReplacing({ ...baseInput, status: 'shortlisted' }, slug);
            setFullPanel(null);
            void finishPanelSave(result);
          }}
          onSaveAsResearching={() => {
            const result = saveAsResearching({ ...baseInput });
            setFullPanel(null);
            void finishPanelSave(result);
          }}
        />
      ) : null}
    </>
  );
}
