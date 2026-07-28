'use client';

import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { saveCalculatorResultAction } from '@/actions/my-insurance';
import { stashPendingSaveAction } from '@/lib/my-insurance/guest-storage';
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
  /** Compact variant for dense results panels */
  size?: 'default' | 'sm';
};

/**
 * Save a calculator result snapshot to My Insurance (auth prompt + guest pending merge).
 */
export function SaveCalculatorButton({
  calculatorId,
  title,
  snapshot,
  className,
  size = 'default',
}: Props) {
  const mi = useMyInsuranceOptional();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (saved || saving) return;

    if (!mi?.user) {
      stashPendingSaveAction({
        type: 'calculator',
        payload: { calculatorId, title, snapshot },
      });
      mi?.openAuth({
        context: 'general',
        redirectPath: snapshot.sourcePath || '/my-insurance',
      });
      toast.message('Sign in to save this result to My Insurance');
      return;
    }

    setSaving(true);
    try {
      const res = await saveCalculatorResultAction({
        calculatorId,
        title,
        snapshot,
        sendEmail: true,
      });
      if (res.ok) {
        setSaved(true);
        toast.success('Saved to Insurance HQ');
      } else {
        toast.error(res.error);
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
        'gap-2 border-teal-200 bg-white text-teal-900 hover:bg-teal-50',
        size === 'default' && 'h-11 min-h-[44px]',
        className
      )}
      onClick={() => void handleSave()}
      disabled={saving || saved}
      aria-label={saved ? 'Result saved to My Insurance' : 'Save result to My Insurance'}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : saved ? (
        <Check className="h-4 w-4 text-teal-600" aria-hidden />
      ) : (
        <BookmarkPlus className="h-4 w-4" aria-hidden />
      )}
      {saved ? 'Saved to My Insurance' : saving ? 'Saving…' : 'Save to My Insurance'}
    </Button>
  );
}
