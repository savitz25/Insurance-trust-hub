'use client';

import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  saveExplorerSessionToWallet,
  upsertWalletPlan,
  type WalletSavedPlan,
} from '@/lib/my-insurance/research-wallet';
import { saveResearchWalletCloudAction } from '@/actions/my-insurance';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SessionProps = {
  mode: 'session';
  zip?: string | null;
  year?: number | null;
  scenario?: string | null;
  countyPath?: string | null;
  doctors?: Array<{ npi: string; name: string; specialty?: string | null }>;
  drugs?: Array<{ rxcui: string; name: string; strength?: string | null }>;
  customCare?: {
    primaryCareVisits?: number;
    specialistVisits?: number;
    erVisits?: number;
    genericRxMonths?: number;
    brandRxMonths?: number;
    imagingOrProcedure?: boolean;
  } | null;
  className?: string;
  size?: 'default' | 'sm';
  label?: string;
};

type PlanProps = {
  mode: 'plan';
  plan: Omit<WalletSavedPlan, 'id' | 'savedAt'>;
  className?: string;
  size?: 'default' | 'sm';
  label?: string;
};

type Props = SessionProps | PlanProps;

/**
 * Explicit save into research wallet (guest local; cloud when signed in).
 * Never a forced gate to use Explorer.
 */
export function SaveResearchWalletButton(props: Props) {
  const mi = useMyInsuranceOptional();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (saving || saved) return;
    setSaving(true);
    try {
      if (props.mode === 'session') {
        saveExplorerSessionToWallet({
          zip: props.zip,
          year: props.year,
          scenario: props.scenario,
          countyPath: props.countyPath,
          doctors: props.doctors,
          drugs: props.drugs,
          customCare: props.customCare,
        });
        if (props.doctors?.length) {
          trackMarketplaceEvent('wallet_save_doctor', { count: props.doctors.length });
        }
        if (props.drugs?.length) {
          trackMarketplaceEvent('wallet_save_drug', { count: props.drugs.length });
        }
        trackMarketplaceEvent('wallet_save_plan', { type: 'session' });
      } else {
        upsertWalletPlan(props.plan);
        trackMarketplaceEvent('wallet_save_plan', { planId: props.plan.planId });
      }

      if (mi?.user) {
        const { loadResearchWallet } = await import('@/lib/my-insurance/research-wallet');
        await saveResearchWalletCloudAction(loadResearchWallet());
      }

      setSaved(true);
      toast.success('Saved to My Insurance research wallet', {
        description: mi?.user
          ? 'Synced to your account when cloud is available'
          : 'On this device — sign in with magic link to restore on another device',
        action: {
          label: 'Open wallet',
          onClick: () => {
            window.location.href = '/my-insurance';
          },
        },
      });
    } finally {
      setSaving(false);
    }
  }

  const size = props.size ?? 'sm';
  const label =
    props.label ||
    (props.mode === 'plan' ? 'Save plan to wallet' : 'Save research to wallet');

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(
        'gap-1.5 border-[#0284C7]/30 bg-white text-[#0A2540] hover:bg-[#E0F2FE]',
        props.className
      )}
      disabled={saving || saved}
      onClick={() => void handleSave()}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5 text-[#0284C7]" />
      ) : (
        <BookmarkPlus className="h-3.5 w-3.5" />
      )}
      {saved ? 'Saved to wallet' : saving ? 'Saving…' : label}
    </Button>
  );
}
