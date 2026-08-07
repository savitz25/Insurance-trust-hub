'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { saveDrugBasketAction } from '@/actions/my-insurance';
import {
  stashPendingSaveAction,
  stashPostLoginRedirect,
} from '@/lib/my-insurance/guest-storage';
import { saveLocalAccountDrugBasket } from '@/lib/my-insurance/drug-basket-local';
import type { DrugBasketItemInput } from '@/lib/my-insurance/types';
import { DRUG_BASKET_PATH, MY_INSURANCE_PATH } from '@/lib/my-insurance/constants';
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
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function persistToAccount(list: DrugBasketItemInput[]) {
    const res = await saveDrugBasketAction({
      items: list,
      basketName,
      sendEmail: true,
    });
    if (!res.ok) {
      toast.error(res.error || 'Could not save to My Insurance');
      return false;
    }

    if (mi?.user?.id) {
      saveLocalAccountDrugBasket({
        userId: mi.user.id,
        basketName,
        items: list,
        updatedAt: new Date().toISOString(),
        basketId: res.basketId,
      });
    }

    setSaved(true);
    toast.success('Prescription list saved to My Insurance', {
      description: `${list.length} medication${list.length === 1 ? '' : 's'} in your account basket`,
      action: {
        label: 'View in My Insurance',
        onClick: () => {
          router.push(MY_INSURANCE_PATH);
          router.refresh();
        },
      },
    });
    router.refresh();
    return true;
  }

  async function handleSave() {
    if (saved || saving || disabled) return;
    if (!items.length) {
      toast.error('Add at least one medication first');
      return;
    }

    // Wait for auth session to resolve — avoid false "logged out" while loading
    if (mi?.loading) {
      toast.message('Checking sign-in…', {
        description: 'Try again in a moment.',
      });
      return;
    }

    if (!mi?.user) {
      stashPendingSaveAction({
        type: 'drug_basket',
        payload: { basketName, items },
      });
      stashPostLoginRedirect(MY_INSURANCE_PATH);
      if (mi?.openAuth) {
        mi.openAuth({ context: 'general', redirectPath: MY_INSURANCE_PATH });
      } else {
        toast.error('Sign-in is unavailable. Refresh the page and try again.');
        return;
      }
      toast.message('Sign in to save your drug list to My Insurance', {
        description: 'After you sign in, we will finish saving this list.',
      });
      return;
    }

    setSaving(true);
    try {
      await persistToAccount(items);
    } catch (e) {
      console.error('[save-drug-basket]', e);
      toast.error(
        e instanceof Error ? e.message : 'Network error while saving your list'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button
        type="button"
        className={cn(
          'h-11 min-h-[44px] w-full gap-2 rounded-xl bg-[#0284C7] font-semibold text-white hover:bg-[#1E3A8A]'
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
      {saved ? (
        <Link
          href={MY_INSURANCE_PATH}
          className="text-center text-sm font-medium text-[#0284C7] underline-offset-2 hover:underline"
          onClick={() => router.refresh()}
        >
          View in My Insurance →
        </Link>
      ) : (
        <p className="text-center text-[11px] text-slate-500">
          Account save (not just this device).{' '}
          <Link href={DRUG_BASKET_PATH} className="underline-offset-2 hover:underline">
            Draft stays local until you save
          </Link>
          .
        </p>
      )}
    </div>
  );
}
