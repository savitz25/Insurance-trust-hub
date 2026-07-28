'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  removeProviderAction,
  saveProviderAction,
} from '@/actions/my-insurance';
import {
  removeGuestProvider,
  saveGuestProvider,
  stashPendingSaveAction,
} from '@/lib/my-insurance/guest-storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  providerSlug: string;
  providerName: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
};

export function SaveProviderButton({
  providerSlug,
  providerName,
  className,
  variant = 'outline',
}: Props) {
  const mi = useMyInsuranceOptional();
  const [busy, setBusy] = useState(false);

  if (!mi) {
    return null;
  }

  const { user, loading, requireAuth, isProviderSaved, markProviderSaved, unmarkProviderSaved } =
    mi;
  const saved = user ? isProviderSaved(providerSlug) : false;

  async function handleClick() {
    if (loading || busy) return;

    if (!user) {
      // Guest: keep local shortlist + prompt auth for cloud sync
      saveGuestProvider(providerSlug, providerName);
      stashPendingSaveAction({
        type: 'provider',
        payload: { providerSlug, providerName },
      });
      toast.message('Saved on this device', {
        description: 'Sign in to sync My Insurance across devices.',
      });
      requireAuth({
        context: 'provider',
        redirectPath: `/providers/${providerSlug}`,
      });
      return;
    }

    setBusy(true);
    try {
      if (saved) {
        const res = await removeProviderAction(providerSlug);
        if (res.ok) {
          unmarkProviderSaved(providerSlug);
          removeGuestProvider(providerSlug);
          toast.success('Removed from My Insurance');
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await saveProviderAction({ providerSlug, providerName });
        if (res.ok) {
          markProviderSaved(providerSlug);
          toast.success(`${providerName} saved to My Insurance`);
        } else {
          toast.error(res.error);
        }
      }
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
      {saved ? 'Saved' : busy ? 'Saving…' : 'Save to My Insurance'}
    </Button>
  );
}
