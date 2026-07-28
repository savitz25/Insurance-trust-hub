'use client';

import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { saveDrugBasketAction } from '@/actions/my-insurance';
import { stashPendingSaveAction } from '@/lib/my-insurance/guest-storage';
import type { DrugBasketItemInput } from '@/lib/my-insurance/types';
import { DRUG_BASKET_PATH } from '@/lib/my-insurance/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  items: DrugBasketItemInput[];
  basketName?: string;
  className?: string;
  disabled?: boolean;
};

export function SaveDrugBasketButton({
  items,
  basketName = 'My prescriptions',
  className,
  disabled,
}: Props) {
  const mi = useMyInsuranceOptional();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (saved || saving || disabled) return;
    if (!items.length) {
      toast.error('Add at least one medication first');
      return;
    }

    if (!mi?.user) {
      stashPendingSaveAction({
        type: 'drug_basket',
        payload: { basketName, items },
      });
      mi?.openAuth({ context: 'general', redirectPath: DRUG_BASKET_PATH });
      toast.message('Sign in to save your drug list to My Insurance');
      return;
    }

    setSaving(true);
    try {
      const res = await saveDrugBasketAction({
        items,
        basketName,
        sendEmail: true,
      });
      if (res.ok) {
        setSaved(true);
        toast.success('Prescription list saved to Insurance HQ');
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
      className={cn(
        'h-11 min-h-[44px] gap-2 rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700',
        className
      )}
      onClick={() => void handleSave()}
      disabled={disabled || saving || saved || items.length === 0}
      aria-label={saved ? 'Drug list saved' : 'Save drug list to My Insurance'}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : saved ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <BookmarkPlus className="h-4 w-4" aria-hidden />
      )}
      {saved
        ? 'Saved to My Insurance'
        : saving
          ? 'Saving…'
          : 'Save to My Insurance'}
    </Button>
  );
}
