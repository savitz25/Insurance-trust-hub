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
  listSavedProviderSlugsAction,
  mergeGuestProvidersAction,
  saveCalculatorResultAction,
  saveDrugBasketAction,
  saveProviderAction,
} from '@/actions/my-insurance';
import {
  clearGuestSavedProviders,
  consumePendingSaveAction,
  getGuestSavedProviders,
} from '@/lib/my-insurance/guest-storage';
import { toast } from 'sonner';

type AuthContext = 'provider' | 'general';

type MyInsuranceContextValue = {
  user: User | null;
  loading: boolean;
  authOpen: boolean;
  authContext: AuthContext;
  redirectPath: string;
  savedProviderSlugs: Set<string>;
  openAuth: (opts?: { context?: AuthContext; redirectPath?: string }) => void;
  closeAuth: () => void;
  requireAuth: (opts?: { context?: AuthContext; redirectPath?: string }) => boolean;
  isProviderSaved: (slug: string) => boolean;
  markProviderSaved: (slug: string) => void;
  unmarkProviderSaved: (slug: string) => void;
  refreshSaved: () => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const MyInsuranceContext = createContext<MyInsuranceContextValue | null>(null);

export function MyInsuranceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authContext, setAuthContext] = useState<AuthContext>('general');
  const [redirectPath, setRedirectPath] = useState('/my-insurance');
  const [savedProviderSlugs, setSavedProviderSlugs] = useState<Set<string>>(new Set());

  const refreshSaved = useCallback(async () => {
    const slugs = await listSavedProviderSlugsAction();
    setSavedProviderSlugs(new Set(slugs));
  }, []);

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
      if (res.ok) toast.success('Calculator result saved to Insurance HQ');
      else toast.error(res.error);
      return;
    }

    if (pending.type === 'drug_basket') {
      const res = await saveDrugBasketAction({
        items: pending.payload.items,
        basketName: pending.payload.basketName,
        sendEmail: true,
      });
      if (res.ok) toast.success('Prescription list saved to Insurance HQ');
      else toast.error(res.error);
    }
  }, []);

  const mergeGuests = useCallback(async () => {
    const guests = getGuestSavedProviders();
    if (!guests.length) return;
    const res = await mergeGuestProvidersAction(guests);
    if (res.ok && res.merged > 0) {
      clearGuestSavedProviders();
      toast.success(
        `Synced ${res.merged} saved agent${res.merged === 1 ? '' : 's'} from this device`
      );
      await refreshSaved();
    }
  }, [refreshSaved]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
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
        void refreshSaved();
        void executePending();
        void mergeGuests();
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
        await mergeGuests();
        await refreshSaved();
      }
      if (event === 'SIGNED_OUT') {
        setSavedProviderSlugs(new Set());
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [executePending, mergeGuests, refreshSaved]);

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
          next.delete(slug);
          return next;
        }),
      refreshSaved,
      signOutLocal: async () => {
        const supabase = createBrowserSupabaseClient();
        await supabase?.auth.signOut();
        setUser(null);
        setSavedProviderSlugs(new Set());
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
