'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { saveResearchSessionAction } from '@/actions/my-insurance';
import { saveGuestResearchSession } from '@/lib/my-insurance/session-storage';
import { stashPendingSaveAction } from '@/lib/my-insurance/guest-storage';
import type { ResearchSessionInput } from '@/lib/my-insurance/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SaveResearchSessionButton({
  session,
  className,
  label = 'Save research session',
}: {
  session: ResearchSessionInput;
  className?: string;
  label?: string;
}) {
  const mi = useMyInsuranceOptional();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      saveGuestResearchSession(session);
      if (mi?.user) {
        const res = await saveResearchSessionAction(session, { sendEmail: true });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success('Research session saved', {
          description: 'In your research passport · Insurance HQ',
          action: { label: 'Open HQ', onClick: () => { window.location.href = '/my-insurance'; } },
        });
      } else {
        stashPendingSaveAction({ type: 'research_session', payload: session });
        mi?.openAuth({ redirectPath: '/my-insurance' });
        toast.success('Saved on this device', {
          description: 'Sign in to sync this research session to Insurance HQ',
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('min-h-11 gap-1.5', className)}
      onClick={() => void handleClick()}
      disabled={busy || mi?.loading}
    >
      <Bookmark className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
