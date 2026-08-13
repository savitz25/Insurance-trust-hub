'use client';

import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { saveCalculatorResultAction } from '@/actions/my-insurance';
import {
  addToolSnapshot,
  getLastSaveError,
} from '@/lib/my-insurance/storage';
import {
  stashPendingSaveAction,
  stashPostLoginRedirect,
} from '@/lib/my-insurance/guest-storage';
import { MY_INSURANCE_PATH } from '@/lib/my-insurance/constants';
import type {
  CalculatorSnapshot,
  CalculatorToolId,
} from '@/lib/my-insurance/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  calculatorId: CalculatorToolId;
  title: string;
  snapshot: CalculatorSnapshot;
  className?: string;
  size?: 'default' | 'sm';
  onSaved?: () => void;
  /**
   * When true, signed-out users also get the auth modal after a local save.
   * Default false — browse/tools stay usable; sign-in is optional for cloud.
   */
  requireSignInForCloud?: boolean;
  /** Best-effort research summary email after cloud save (default true when signed in) */
  sendEmail?: boolean;
};

/**
 * Save a calculator / Marketplace research snapshot to My Insurance.
 * Guest: device plan + optional auth for cloud. Signed-in: cloud + device.
 */
export function SaveCalculatorButton({
  calculatorId,
  title,
  snapshot,
  className,
  size = 'default',
  onSaved,
  requireSignInForCloud = false,
  sendEmail = true,
}: Props) {
  const mi = useMyInsuranceOptional();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function saveLocalDevice() {
    const summary =
      snapshot.summaryText ||
      (typeof snapshot.outputs === 'object'
        ? 'Educational calculator result saved to plan'
        : 'Educational calculator result');
    const snap = addToolSnapshot({
      toolId: calculatorId,
      title,
      summary,
      href: snapshot.sourcePath || '/tools',
      payload: {
        inputs: snapshot.inputs,
        outputs: snapshot.outputs,
        marketplaceResearch: snapshot.marketplaceResearch,
      },
    });
    const err = getLastSaveError();
    if (!snap || err) {
      toast.error(err || 'Could not save on this device');
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (saved || saving) return;

    if (mi?.loading) {
      toast.message('Checking sign-in…', {
        description: 'Try again in a moment.',
      });
      return;
    }

    setSaving(true);
    try {
      if (!saveLocalDevice()) return;

      if (!mi?.user) {
        stashPendingSaveAction({
          type: 'calculator',
          payload: { calculatorId, title, snapshot },
        });
        stashPostLoginRedirect(MY_INSURANCE_PATH);
        setSaved(true);
        onSaved?.();
        if (requireSignInForCloud && mi?.openAuth) {
          mi.openAuth({ context: 'general', redirectPath: MY_INSURANCE_PATH });
          toast.message('Sign in to sync this research', {
            description: 'A copy is already on this device.',
          });
          return;
        }
        toast.success('Saved to My Insurance', {
          description: 'On this device. Sign in anytime to sync across devices.',
          action: {
            label: 'Open HQ',
            onClick: () => {
              window.location.href = MY_INSURANCE_PATH;
            },
          },
        });
        return;
      }

      if (mi?.user) {
        const res = await saveCalculatorResultAction({
          calculatorId,
          title,
          snapshot,
          sendEmail,
        });
        if (!res.ok) {
          toast.error(res.error || 'Cloud save failed', {
            description: 'Result is still on this device under your coverage plan.',
          });
          return;
        }
        setSaved(true);
        onSaved?.();
        toast.success('Saved to Insurance HQ', {
          description: sendEmail
            ? 'In My Insurance · summary email when Resend is configured'
            : 'In My Insurance · your account',
          action: {
            label: 'View HQ',
            onClick: () => {
              window.location.href = MY_INSURANCE_PATH;
            },
          },
        });
        return;
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size === 'sm' ? 'sm' : 'default'}
      className={cn(
        'gap-2 border-[#0284C7]/30 bg-white text-[#0A2540] hover:bg-[#E0F2FE]',
        size === 'default' && 'h-11 min-h-[44px]',
        className
      )}
      onClick={() => void handleSave()}
      disabled={saving || saved}
      aria-label={
        saved ? 'Result saved to My Insurance' : 'Save this research to My Insurance'
      }
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : saved ? (
        <Check className="h-4 w-4 text-[#0284C7]" aria-hidden />
      ) : (
        <BookmarkPlus className="h-4 w-4" aria-hidden />
      )}
      {saved
        ? 'Saved to Insurance HQ'
        : saving
          ? 'Saving…'
          : 'Save to My Insurance'}
    </Button>
  );
}
