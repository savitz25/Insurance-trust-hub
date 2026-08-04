'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  removeProviderAction,
  saveProviderAction,
} from '@/actions/my-insurance';
import {
  isProviderSaved,
  removeProviderFromPlan,
  saveProviderToPlan,
} from '@/lib/my-insurance/storage';
import { removeGuestProvider } from '@/lib/my-insurance/guest-storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  providerSlug: string;
  providerName: string;
  city?: string;
  state?: string;
  licenseSummary?: string;
  lines?: string[];
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
};

/**
 * Save to My Insurance plan (guest localStorage or signed-in cloud).
 * Phase A: guest save works without login — research shortlist only.
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
}: Props) {
  const mi = useMyInsuranceOptional();
  const [busy, setBusy] = useState(false);
  const [guestSaved, setGuestSaved] = useState(false);

  const refreshGuest = useCallback(() => {
    setGuestSaved(isProviderSaved(providerSlug));
  }, [providerSlug]);

  useEffect(() => {
    refreshGuest();
    const onStore = () => refreshGuest();
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => window.removeEventListener('ith-my-insurance-store', onStore);
  }, [refreshGuest]);

  if (!mi) {
    // Still allow pure guest save without provider shell
    return (
      <GuestOnlySaveButton
        providerSlug={providerSlug}
        providerName={providerName}
        city={city}
        state={state}
        className={className}
        variant={variant}
      />
    );
  }

  const { user, loading, isProviderSaved: cloudSaved, markProviderSaved, unmarkProviderSaved } =
    mi;
  const saved = user ? cloudSaved(providerSlug) : guestSaved;

  async function handleClick() {
    if (loading || busy) return;

    if (!user) {
      setBusy(true);
      try {
        if (guestSaved) {
          removeProviderFromPlan(providerSlug);
          toast.message('Removed from this device plan');
        } else {
          saveProviderToPlan({
            providerSlug,
            providerName,
            city,
            state,
            licenseSummary,
            lines,
            profilePath: `/providers/${providerSlug}`,
            status: 'shortlisted',
          });
          toast.success('Saved to My Insurance', {
            description: 'Stored on this device · research only',
            action: {
              label: 'Open HQ',
              onClick: () => {
                window.location.href = '/my-insurance';
              },
            },
          });
        }
        refreshGuest();
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (saved) {
        const res = await removeProviderAction(providerSlug);
        if (res.ok) {
          unmarkProviderSaved(providerSlug);
          removeProviderFromPlan(providerSlug);
          removeGuestProvider(providerSlug);
          toast.success('Removed from My Insurance');
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await saveProviderAction({ providerSlug, providerName });
        if (res.ok) {
          markProviderSaved(providerSlug);
          saveProviderToPlan({
            providerSlug,
            providerName,
            city,
            state,
            licenseSummary,
            lines,
            profilePath: `/providers/${providerSlug}`,
            status: 'shortlisted',
          });
          toast.success('Saved to My Insurance', {
            description: providerName,
            action: {
              label: 'Open HQ',
              onClick: () => {
                window.location.href = '/my-insurance';
              },
            },
          });
        } else {
          toast.error(res.error);
        }
      }
      refreshGuest();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : variant}
      size="sm"
      onClick={handleClick}
      disabled={busy || loading}
      className={cn('gap-2', className)}
      aria-pressed={saved}
    >
      {saved ? (
        <BookmarkCheck className="h-4 w-4 text-teal-700" aria-hidden />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden />
      )}
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}

function GuestOnlySaveButton({
  providerSlug,
  providerName,
  city,
  state,
  licenseSummary,
  lines,
  className,
  variant,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isProviderSaved(providerSlug));
    const onStore = () => setSaved(isProviderSaved(providerSlug));
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => window.removeEventListener('ith-my-insurance-store', onStore);
  }, [providerSlug]);

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : variant}
      size="sm"
      disabled={busy}
      className={cn('gap-2', className)}
      aria-pressed={saved}
      onClick={() => {
        setBusy(true);
        try {
          if (saved) {
            removeProviderFromPlan(providerSlug);
            toast.message('Removed from this device plan');
          } else {
            saveProviderToPlan({
              providerSlug,
              providerName,
              city,
              state,
              licenseSummary,
              lines,
              profilePath: `/providers/${providerSlug}`,
            });
            toast.success('Saved to My Insurance', {
              description: 'Stored on this device · research only',
              action: {
                label: 'Open HQ',
                onClick: () => {
                  window.location.href = '/my-insurance';
                },
              },
            });
          }
          setSaved(isProviderSaved(providerSlug));
        } finally {
          setBusy(false);
        }
      }}
    >
      {saved ? (
        <BookmarkCheck className="h-4 w-4 text-teal-700" aria-hidden />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden />
      )}
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
