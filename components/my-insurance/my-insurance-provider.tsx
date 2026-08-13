'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  ensureUserProfileAction,
  getMyInsuranceDashboardData,
  listSavedProviderSlugsAction,
  mergeGuestCalculatorSnapshotsAction,
  mergeGuestProvidersAction,
  saveCalculatorResultAction,
  saveDrugBasketAction,
  saveProviderAction,
} from '@/actions/my-insurance';
import {
  collectLocalProvidersForMerge,
  importCloudProvidersIntoLocal,
  localProviderSlugs,
  snapshotLocalPlans,
} from '@/lib/my-insurance/auth-continuity';
import { consumePendingSaveAction } from '@/lib/my-insurance/guest-storage';
import { toast } from 'sonner';

type AuthContext = 'provider' | 'general';

type MyInsuranceContextValue = {
  user: User | null;
  loading: boolean;
  authOpen: boolean;
  authContext: AuthContext;
  redirectPath: string;
  /** Cloud ∪ local slugs for Save button / badge */
  savedProviderSlugs: Set<string>;
  openAuth: (opts?: { context?: AuthContext; redirectPath?: string }) => void;
  closeAuth: () => void;
  requireAuth: (opts?: { context?: AuthContext; redirectPath?: string }) => boolean;
  isProviderSaved: (slug: string) => boolean;
  markProviderSaved: (slug: string) => void;
  unmarkProviderSaved: (slug: string) => void;
  refreshSaved: () => Promise<void>;
  /** Sync guest → cloud and cloud → guest. Never clears localStorage. */
  syncAuthContinuity: (opts?: { announce?: boolean }) => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const MyInsuranceContext = createContext<MyInsuranceContextValue | null>(null);

function unionSlugs(cloud: string[], local: string[]): Set<string> {
  return new Set([...cloud, ...local]);
}

export function MyInsuranceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authContext, setAuthContext] = useState<AuthContext>('general');
  const [redirectPath, setRedirectPath] = useState('/my-insurance');
  const [savedProviderSlugs, setSavedProviderSlugs] = useState<Set<string>>(new Set());

  const refreshSaved = useCallback(async () => {
    const cloud = user ? await listSavedProviderSlugsAction() : [];
    const local = localProviderSlugs();
    setSavedProviderSlugs(unionSlugs(cloud, local));
  }, [user]);

  const executePending = useCallback(async () => {
    const pending = consumePendingSaveAction();
    if (!pending) return;

    if (pending.type === 'provider') {
      const res = await saveProviderAction(pending.payload);
      if (res.ok) {
        setSavedProviderSlugs((prev) => new Set(prev).add(pending.payload.providerSlug));
        toast.success(`${pending.payload.providerName} saved to My Insurance`);
      }
      return;
    }

    if (pending.type === 'calculator') {
      const res = await saveCalculatorResultAction({
        calculatorId: pending.payload.calculatorId,
        title: pending.payload.title,
        snapshot: pending.payload.snapshot,
        sendEmail: true,
      });
      if (res.ok) {
        toast.success('Saved to Insurance HQ', {
          description: 'Your plan research is in My Insurance',
        });
      } else toast.error(res.error);
      return;
    }

    if (pending.type === 'drug_basket') {
      const res = await saveDrugBasketAction({
        items: pending.payload.items,
        basketName: pending.payload.basketName,
        sendEmail: true,
      });
      if (res.ok) {
        const { saveLocalAccountDrugBasket } = await import(
          '@/lib/my-insurance/drug-basket-local'
        );
        const client = createBrowserSupabaseClient();
        const uid = client
          ? (await client.auth.getUser()).data.user?.id
          : null;
        if (uid) {
          saveLocalAccountDrugBasket({
            userId: uid,
            basketName: pending.payload.basketName || 'My prescriptions',
            items: pending.payload.items,
            updatedAt: new Date().toISOString(),
            basketId: res.basketId,
          });
        }
        toast.success('Prescription list saved to My Insurance', {
          description: `${pending.payload.items.length} medication${
            pending.payload.items.length === 1 ? '' : 's'
          } synced to your account`,
        });
        window.dispatchEvent(new CustomEvent('ith-my-insurance-drug-basket'));
      } else {
        toast.error(res.error);
      }
    }
  }, []);

  /**
   * Guest-first continuity (Phase D multi-plan safe):
   * 1. Snapshot local plans — never drop them if cloud is empty
   * 2. Import local providers → cloud (by slug for cloud table)
   * 3. Import cloud-only rows → active plan as (planId, providerSlug) union
   * 4. Never clear localStorage / plans / compare tray
   * @param opts.announce — toast on explicit sign-in when local had data
   */
  const syncAuthContinuity = useCallback(async (opts?: { announce?: boolean }) => {
    if (typeof window === 'undefined') return;

    const plansBefore = snapshotLocalPlans();
    const localList = collectLocalProvidersForMerge();
    let importedToCloud = 0;
    let importedToLocal = 0;

    // Local → cloud (optional overlay). Empty cloud is fine; we still keep local plans.
    if (localList.length > 0) {
      const res = await mergeGuestProvidersAction(localList);
      if (res.ok && res.merged > 0) {
        importedToCloud = res.merged;
      }
    }

    try {
      const { getToolSnapshots } = await import('@/lib/my-insurance/storage');
      const snaps = getToolSnapshots();
      if (snaps.length > 0) {
        await mergeGuestCalculatorSnapshotsAction(
          snaps.map((s) => ({
            toolId: s.toolId,
            title: s.title,
            summary: s.summary,
            href: s.href,
            payload: s.payload,
          }))
        );
      }
    } catch {
      /* local research remains on device */
    }

    // Cloud → local (additive only onto active plan)
    try {
      const dash = await getMyInsuranceDashboardData();
      const cloudRows = dash?.savedProviders ?? [];
      // Explicit: empty cloud must not rewrite or clear multi-plan library
      if (cloudRows.length > 0) {
        importedToLocal = importCloudProvidersIntoLocal(
          cloudRows.map((p) => ({
            provider_slug: p.provider_slug,
            provider_name: p.provider_name,
          }))
        );
      }
    } catch {
      /* ignore — local remains source of truth */
    }

    const plansAfter = snapshotLocalPlans();
    if (
      plansBefore.planCount > 0 &&
      plansAfter.planCount < plansBefore.planCount &&
      typeof console !== 'undefined'
    ) {
      console.error('[my-insurance] syncAuthContinuity: local plans decreased (bug)', {
        plansBefore,
        plansAfter,
      });
    }

    const cloudSlugs = await listSavedProviderSlugsAction();
    setSavedProviderSlugs(unionSlugs(cloudSlugs, localProviderSlugs()));

    if (opts?.announce && (localList.length > 0 || importedToLocal > 0 || importedToCloud > 0)) {
      toast.success('Restored your saved agencies on this device.');
    }

    window.dispatchEvent(new CustomEvent('ith-my-insurance-store'));
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      // Still seed badge from local guest store
      setSavedProviderSlugs(new Set(localProviderSlugs()));
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
      if (data.user) {
        void ensureUserProfileAction();
        void executePending();
        // Session restore: merge quietly (no toast spam on every page load)
        void syncAuthContinuity({ announce: false });
      } else {
        setSavedProviderSlugs(new Set(localProviderSlugs()));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (event === 'SIGNED_IN' && nextUser) {
        setAuthOpen(false);
        await ensureUserProfileAction();
        await executePending();
        await syncAuthContinuity({ announce: true });
      }
      if (event === 'SIGNED_OUT') {
        // Keep localStorage intact — only drop cloud-only view state
        setSavedProviderSlugs(new Set(localProviderSlugs()));
        window.dispatchEvent(new CustomEvent('ith-my-insurance-store'));
      }
    });

    // Keep slug set in sync when guest store mutates
    const onStore = () => {
      setSavedProviderSlugs((prev) => {
        const local = localProviderSlugs();
        return unionSlugs(Array.from(prev), local);
      });
    };
    window.addEventListener('ith-my-insurance-store', onStore);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('ith-my-insurance-store', onStore);
    };
  }, [executePending, syncAuthContinuity]);

  const openAuth = useCallback(
    (opts?: { context?: AuthContext; redirectPath?: string }) => {
      if (opts?.context) setAuthContext(opts.context);
      if (opts?.redirectPath) setRedirectPath(opts.redirectPath);
      setAuthOpen(true);
    },
    []
  );

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const requireAuth = useCallback(
    (opts?: { context?: AuthContext; redirectPath?: string }) => {
      if (user) return true;
      openAuth(opts);
      return false;
    },
    [openAuth, user]
  );

  const value = useMemo<MyInsuranceContextValue>(
    () => ({
      user,
      loading,
      authOpen,
      authContext,
      redirectPath,
      savedProviderSlugs,
      openAuth,
      closeAuth,
      requireAuth,
      isProviderSaved: (slug) => savedProviderSlugs.has(slug),
      markProviderSaved: (slug) =>
        setSavedProviderSlugs((prev) => new Set(prev).add(slug)),
      unmarkProviderSaved: (slug) =>
        setSavedProviderSlugs((prev) => {
          const next = new Set(prev);
          // Keep local truth: if still in local store, leave marked
          if (localProviderSlugs().includes(slug)) return prev;
          next.delete(slug);
          return next;
        }),
      refreshSaved,
      syncAuthContinuity,
      signOutLocal: async () => {
        const supabase = createBrowserSupabaseClient();
        await supabase?.auth.signOut();
        setUser(null);
        // Never clear ith:my-insurance:v1 or compare tray
        setSavedProviderSlugs(new Set(localProviderSlugs()));
      },
    }),
    [
      user,
      loading,
      authOpen,
      authContext,
      redirectPath,
      savedProviderSlugs,
      openAuth,
      closeAuth,
      requireAuth,
      refreshSaved,
      syncAuthContinuity,
    ]
  );

  return (
    <MyInsuranceContext.Provider value={value}>{children}</MyInsuranceContext.Provider>
  );
}

export function useMyInsurance() {
  const ctx = useContext(MyInsuranceContext);
  if (!ctx) {
    throw new Error('useMyInsurance must be used within MyInsuranceProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent */
export function useMyInsuranceOptional() {
  return useContext(MyInsuranceContext);
}
