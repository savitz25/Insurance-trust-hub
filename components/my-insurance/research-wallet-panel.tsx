'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Pill,
  Stethoscope,
  Trash2,
  Cloud,
  CloudOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import {
  clearResearchWalletLocal,
  loadResearchWallet,
  mergeWallets,
  removeWalletDoctor,
  removeWalletDrug,
  removeWalletPlan,
  RESEARCH_WALLET_EVENT,
  saveResearchWallet,
  type ResearchWallet,
  updateWalletNotes,
  walletExplorerRestoreHref,
  walletSummary,
} from '@/lib/my-insurance/research-wallet';
import {
  deleteResearchWalletCloudAction,
  getResearchWalletCloudAction,
  saveResearchWalletCloudAction,
} from '@/actions/my-insurance';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';
import { toast } from 'sonner';

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}/mo`;
}

/**
 * Phase 11 research wallet — plans, doctors, Rx, market prefs.
 * Guest localStorage; optional cloud sync when signed in (magic link).
 */
export function ResearchWalletPanel() {
  const mi = useMyInsuranceOptional();
  const user = mi?.user ?? null;
  const openAuth = mi?.openAuth;
  const [wallet, setWallet] = useState<ResearchWallet | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setWallet(loadResearchWallet());
  }, []);

  useEffect(() => {
    refresh();
    trackMarketplaceEvent('wallet_opened', {});
    const onStore = () => refresh();
    window.addEventListener(RESEARCH_WALLET_EVENT, onStore);
    window.addEventListener('storage', onStore);
    return () => {
      window.removeEventListener(RESEARCH_WALLET_EVENT, onStore);
      window.removeEventListener('storage', onStore);
    };
  }, [refresh]);

  // Merge cloud on sign-in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setSyncing(true);
      try {
        const res = await getResearchWalletCloudAction();
        if (cancelled || !res.ok) return;
        if (res.payload) {
          const local = loadResearchWallet();
          const merged = mergeWallets(local, res.payload as ResearchWallet);
          saveResearchWallet(merged);
          await saveResearchWalletCloudAction(merged);
          if (!cancelled) {
            setWallet(merged);
            trackMarketplaceEvent('wallet_restore', { source: 'cloud_merge' });
          }
        } else {
          // Push local to cloud if any content
          const local = loadResearchWallet();
          if (
            local.plans.length ||
            local.doctors.length ||
            local.drugs.length ||
            local.notes
          ) {
            await saveResearchWalletCloudAction(local);
          }
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function syncToCloud() {
    if (!user) {
      openAuth?.({
        redirectPath: '/my-insurance',
        context: 'general',
      });
      trackMarketplaceEvent('wallet_magic_link_requested', { reason: 'sync' });
      return;
    }
    setSyncing(true);
    try {
      const local = loadResearchWallet();
      const res = await saveResearchWalletCloudAction(local);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Research wallet synced to your account');
    } finally {
      setSyncing(false);
    }
  }

  async function clearAll() {
    if (
      !window.confirm(
        'Delete all research wallet items on this device? Signed-in cloud copy will also be cleared if available.'
      )
    ) {
      return;
    }
    clearResearchWalletLocal();
    if (user) {
      await deleteResearchWalletCloudAction();
    }
    refresh();
    trackMarketplaceEvent('wallet_item_deleted', { scope: 'all' });
    toast.message('Research wallet cleared');
  }

  if (!wallet) {
    return (
      <div className="animate-pulse rounded-2xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
        Loading research wallet…
      </div>
    );
  }

  const empty =
    !wallet.plans.length &&
    !wallet.doctors.length &&
    !wallet.drugs.length &&
    !wallet.preferences.zip;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Research wallet</h2>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-xl">
            Personal coverage research only — shortlisted plans, doctors, and prescriptions for{' '}
            <em>your</em> continuity. Not sold as leads. Not shared with agencies. Explorer works
            without signing in; magic link is only for restore on another device.
          </p>
          <p className="mt-1 text-xs text-slate-500">{walletSummary(wallet)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!empty ? (
            <Button asChild size="sm" variant="trust" className="gap-1">
              <Link
                href={walletExplorerRestoreHref(wallet)}
                onClick={() =>
                  trackMarketplaceEvent('continue_from_wallet_to_explorer', {})
                }
              >
                <Compass className="h-3.5 w-3.5" />
                Continue in Explorer
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={syncing}
            onClick={() => void syncToCloud()}
          >
            {user ? (
              <Cloud className="h-3.5 w-3.5" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            {user ? (syncing ? 'Syncing…' : 'Sync cloud') : 'Magic link to sync'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1 text-destructive"
            onClick={() => void clearAll()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear wallet
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#0284C7]/20 bg-[#E0F2FE]/30 px-3 py-2 text-xs text-slate-700 leading-relaxed">
        <strong className="text-slate-900">Privacy:</strong> Wallet contents stay private for your
        research. We do not sell shortlists. You can delete anytime. Contact-an-agency flows are
        separate from Save to My Insurance.
      </div>

      {empty ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-900">Nothing saved yet</p>
            <p>
              Use Plan Explorer, Plan X-Ray, or doctor/Rx lists and choose{' '}
              <strong>Save to My Insurance</strong> when you want continuity — no forced account
              wall to research first.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/tools/aca-plan-explorer">Open Plan Explorer</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Saved plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!wallet.plans.length ? (
                <p className="text-xs text-muted-foreground">No plans shortlisted</p>
              ) : (
                wallet.plans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-2 rounded-lg border px-2 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={p.xrayPath}
                        className="font-medium text-[#0284C7] hover:underline line-clamp-2"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.issuerName}
                        {p.metalLevel ? ` · ${p.metalLevel}` : ''}
                        {p.premiumMonthly != null ? ` · ${money(p.premiumMonthly)}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => {
                        removeWalletPlan(p.id);
                        refresh();
                        void syncToCloudQuiet(user);
                        trackMarketplaceEvent('wallet_item_deleted', { type: 'plan' });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Doctors / facilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!wallet.doctors.length ? (
                <p className="text-xs text-muted-foreground">None saved</p>
              ) : (
                wallet.doctors.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-2 rounded-lg border px-2 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        NPI {d.npi}
                        {d.specialty ? ` · ${d.specialty}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removeWalletDoctor(d.id);
                        refresh();
                        void syncToCloudQuiet(user);
                        trackMarketplaceEvent('wallet_item_deleted', { type: 'doctor' });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!wallet.drugs.length ? (
                <p className="text-xs text-muted-foreground">None saved</p>
              ) : (
                wallet.drugs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-2 rounded-lg border px-2 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        RxCUI {d.rxcui}
                        {d.strength ? ` · ${d.strength}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removeWalletDrug(d.id);
                        refresh();
                        void syncToCloudQuiet(user);
                        trackMarketplaceEvent('wallet_item_deleted', { type: 'drug' });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Market &amp; notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Last market:{' '}
                <strong className="text-foreground">
                  {wallet.preferences.zip
                    ? `ZIP ${wallet.preferences.zip}`
                    : 'Not set'}
                </strong>
                {wallet.preferences.year ? ` · year ${wallet.preferences.year}` : ''}
                {wallet.preferences.scenario
                  ? ` · scenario ${wallet.preferences.scenario}`
                  : ''}
              </p>
              {wallet.preferences.countyPath ? (
                <Link
                  href={wallet.preferences.countyPath}
                  className="inline-flex items-center gap-1 text-[#0284C7] hover:underline text-xs"
                >
                  County intelligence
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
              <Textarea
                className="min-h-[80px] text-sm"
                placeholder="Optional research notes (stays private)"
                value={wallet.notes}
                maxLength={2000}
                onChange={(e) => {
                  updateWalletNotes(e.target.value);
                  refresh();
                }}
                onBlur={() => {
                  if (user) void syncToCloudQuiet(user);
                }}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Updated {new Date(wallet.updatedAt).toLocaleString()}
                {syncing ? ' · syncing…' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

async function syncToCloudQuiet(
  user: { id: string } | null
): Promise<void> {
  if (!user) return;
  try {
    await saveResearchWalletCloudAction(loadResearchWallet());
  } catch {
    // local remains source of truth
  }
}
