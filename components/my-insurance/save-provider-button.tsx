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
  readInsuranceParentPending,
  stashInsuranceParentPending,
} from '@/lib/my-insurance/parent-pending-storage';
import {
  handoffForm,
  markHandoffSent,
  readHandoff,
  rememberHandoff,
  resumeDecision,
  type StoredHandoff,
} from '@/lib/my-insurance/handoff-form';
import { recoverParentPending } from '@/lib/my-insurance/handoff-session';
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
   * Present on directory and profile cards.
   * Parent identity is resolved on the server. This value is not sent.
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
  const [keepOpen, setKeepOpen] = useState(false);
  const [local, setLocal] = useState<SavedProvider | null>(null);
  const [fullPanel, setFullPanel] = useState<SavedProvider[] | null>(null);

  const submitTicket = useCallback((ticket: StoredHandoff) => {
    const form = handoffForm(ticket.target, ticket.continuationRef, ticket.intent);
    if (!form || document.visibilityState === 'hidden') return false;
    markHandoffSent(sessionStorage, ticket);
    const element = document.createElement('form');
    element.method = 'POST';
    element.action = form.action;
    element.target = '_top';
    for (const [name, value] of [['continuationRef', form.continuationRef], ['intent', form.intent]] as const) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      element.append(input);
    }
    document.body.append(element);
    element.submit();
    return true;
  }, []);

  const refresh = useCallback(() => {
    setLocal(findLocalProvider(providerSlug));
  }, [providerSlug]);

  useEffect(() => {
    refresh();
    const onStore = () => refresh();
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => window.removeEventListener('ith-my-insurance-store', onStore);
  }, [refresh]);

  useEffect(() => {
    const abandon = () => clearInsuranceParentPending(providerSlug);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') abandon();
    };
    const decision = recoverParentPending({
      pending: readInsuranceParentPending(providerSlug),
      now: Date.now(),
      pageOpen: document.visibilityState === 'visible',
      locallySaved: Boolean(findLocalProvider(providerSlug)),
    });
    if (decision === 'abandon') abandon();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', abandon);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', abandon);
    };
  }, [providerSlug]);

  useEffect(() => {
    const resume = () => {
      const ticket = readHandoff(sessionStorage, providerSlug, Date.now());
      if (resumeDecision(ticket, document.visibilityState) === 'submit' && ticket) submitTicket(ticket);
    };
    resume();
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [providerSlug, submitTicket]);

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

  async function stageParentIntent(generation: number, intent: 'save' | 'unsave') {
    setKeepOpen(true);
    try {
      const pageOpen = document.visibilityState === 'visible';
      const handoff = await prepareInsuranceParentHandoffAction({
        providerSlug,
        intent,
        pageOpen,
      });
      const current = findLocalProvider(providerSlug);
      const stale =
        generation !== intentGeneration.current ||
        (intent === 'save' ? !current : Boolean(current));
      if (stale || !pageOpen || !handoff.ok) {
        clearInsuranceParentPending(providerSlug);
        return;
      }
      if (handoff.mode === 'continue') {
        const ticket: StoredHandoff = {
          slug: providerSlug,
          target: handoff.target,
          continuationRef: handoff.continuationRef,
          intent: handoff.intent,
          phase: 'staged',
          expiresAt: handoff.expiresAt,
        };
        rememberHandoff(sessionStorage, ticket);
        if (document.visibilityState === 'visible') submitTicket(ticket);
        return;
      }
      stashInsuranceParentPending(providerSlug, handoff.pending);
    } catch {
      if (generation === intentGeneration.current) {
        clearInsuranceParentPending(providerSlug);
      }
    } finally {
      setKeepOpen(false);
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
      void stageParentIntent(generation, 'save');
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
        const generation = intentGeneration.current + 1;
        intentGeneration.current = generation;
        void stageParentIntent(generation, 'unsave');
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
      void stageParentIntent(generation, 'save');
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
        {keepOpen ? (
          <p className="mt-1 text-xs text-zinc-600" role="status">Keep this page open</p>
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
