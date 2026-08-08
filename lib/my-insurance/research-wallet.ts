/**
 * Phase 11 — Research wallet (coverage shortlists for cross-device continuity).
 * Guest: localStorage. Signed-in: optional cloud JSON blob (Supabase).
 * Not a claims portal; not sold as leads.
 */

import { newId, nowIso } from '@/lib/my-insurance/plan-types';

export const RESEARCH_WALLET_KEY = 'ith:research-wallet:v1';
export const RESEARCH_WALLET_EVENT = 'ith-research-wallet';

export type WalletSavedPlan = {
  id: string;
  planId: string;
  planYear: number;
  name: string;
  issuerName: string;
  metalLevel?: string | null;
  planType?: string | null;
  premiumMonthly?: number | null;
  xrayPath: string;
  zip?: string | null;
  savedAt: string;
  source: string;
  notes?: string | null;
};

export type WalletSavedDoctor = {
  id: string;
  npi: string;
  name: string;
  specialty?: string | null;
  marketZip?: string | null;
  savedAt: string;
};

export type WalletSavedDrug = {
  id: string;
  rxcui: string;
  name: string;
  strength?: string | null;
  savedAt: string;
};

export type WalletPreferences = {
  zip?: string | null;
  year?: number | null;
  scenario?: string | null;
  countyPath?: string | null;
  stateCode?: string | null;
  countyName?: string | null;
  customCare?: {
    primaryCareVisits?: number;
    specialistVisits?: number;
    erVisits?: number;
    genericRxMonths?: number;
    brandRxMonths?: number;
    imagingOrProcedure?: boolean;
  } | null;
};

export type ResearchWallet = {
  version: 1;
  updatedAt: string;
  plans: WalletSavedPlan[];
  doctors: WalletSavedDoctor[];
  drugs: WalletSavedDrug[];
  preferences: WalletPreferences;
  notes: string;
};

const MAX_PLANS = 40;
const MAX_DOCTORS = 20;
const MAX_DRUGS = 30;
const MAX_NOTES = 2000;

function emptyWallet(): ResearchWallet {
  return {
    version: 1,
    updatedAt: nowIso(),
    plans: [],
    doctors: [],
    drugs: [],
    preferences: {},
    notes: '',
  };
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function dispatchChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(RESEARCH_WALLET_EVENT));
}

function normalizeWallet(raw: unknown): ResearchWallet {
  if (!raw || typeof raw !== 'object') return emptyWallet();
  const o = raw as Partial<ResearchWallet>;
  return {
    version: 1,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : nowIso(),
    plans: Array.isArray(o.plans) ? o.plans.slice(0, MAX_PLANS) : [],
    doctors: Array.isArray(o.doctors) ? o.doctors.slice(0, MAX_DOCTORS) : [],
    drugs: Array.isArray(o.drugs) ? o.drugs.slice(0, MAX_DRUGS) : [],
    preferences:
      o.preferences && typeof o.preferences === 'object' ? o.preferences : {},
    notes: typeof o.notes === 'string' ? o.notes.slice(0, MAX_NOTES) : '',
  };
}

export function loadResearchWallet(): ResearchWallet {
  if (!isBrowser()) return emptyWallet();
  try {
    const raw = localStorage.getItem(RESEARCH_WALLET_KEY);
    if (!raw) return emptyWallet();
    return normalizeWallet(JSON.parse(raw));
  } catch {
    return emptyWallet();
  }
}

export function saveResearchWallet(
  wallet: ResearchWallet
): { ok: true } | { ok: false; error: string } {
  if (!isBrowser()) return { ok: false, error: 'Not in browser' };
  try {
    const next = normalizeWallet({ ...wallet, updatedAt: nowIso() });
    localStorage.setItem(RESEARCH_WALLET_KEY, JSON.stringify(next));
    dispatchChange();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save wallet on this device' };
  }
}

export function clearResearchWalletLocal(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(RESEARCH_WALLET_KEY);
  dispatchChange();
}

/** Merge remote over local by updatedAt for lists (union by identity keys). */
export function mergeWallets(
  local: ResearchWallet,
  remote: ResearchWallet
): ResearchWallet {
  const planMap = new Map<string, WalletSavedPlan>();
  for (const p of [...remote.plans, ...local.plans]) {
    const key = `${p.planYear}:${p.planId}`;
    const prev = planMap.get(key);
    if (!prev || (p.savedAt || '') > (prev.savedAt || '')) planMap.set(key, p);
  }
  const docMap = new Map<string, WalletSavedDoctor>();
  for (const d of [...remote.doctors, ...local.doctors]) {
    const prev = docMap.get(d.npi);
    if (!prev || (d.savedAt || '') > (prev.savedAt || '')) docMap.set(d.npi, d);
  }
  const drugMap = new Map<string, WalletSavedDrug>();
  for (const d of [...remote.drugs, ...local.drugs]) {
    const prev = drugMap.get(d.rxcui);
    if (!prev || (d.savedAt || '') > (prev.savedAt || '')) drugMap.set(d.rxcui, d);
  }

  const remoteNewer = (remote.updatedAt || '') >= (local.updatedAt || '');
  return {
    version: 1,
    updatedAt: nowIso(),
    plans: [...planMap.values()]
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      .slice(0, MAX_PLANS),
    doctors: [...docMap.values()]
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      .slice(0, MAX_DOCTORS),
    drugs: [...drugMap.values()]
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      .slice(0, MAX_DRUGS),
    preferences: remoteNewer
      ? { ...local.preferences, ...remote.preferences }
      : { ...remote.preferences, ...local.preferences },
    notes: remoteNewer
      ? remote.notes || local.notes
      : local.notes || remote.notes,
  };
}

export function upsertWalletPlan(
  plan: Omit<WalletSavedPlan, 'id' | 'savedAt'> & { id?: string; savedAt?: string }
): ResearchWallet {
  const w = loadResearchWallet();
  const row: WalletSavedPlan = {
    id: plan.id || newId(),
    planId: plan.planId,
    planYear: plan.planYear,
    name: plan.name,
    issuerName: plan.issuerName,
    metalLevel: plan.metalLevel,
    planType: plan.planType,
    premiumMonthly: plan.premiumMonthly,
    xrayPath: plan.xrayPath,
    zip: plan.zip,
    source: plan.source || 'plan_explorer',
    notes: plan.notes,
    savedAt: plan.savedAt || nowIso(),
  };
  const rest = w.plans.filter(
    (p) => !(p.planId === row.planId && p.planYear === row.planYear)
  );
  const next = { ...w, plans: [row, ...rest].slice(0, MAX_PLANS) };
  saveResearchWallet(next);
  return next;
}

export function removeWalletPlan(id: string): ResearchWallet {
  const w = loadResearchWallet();
  const next = { ...w, plans: w.plans.filter((p) => p.id !== id) };
  saveResearchWallet(next);
  return next;
}

export function upsertWalletDoctor(
  doc: Omit<WalletSavedDoctor, 'id' | 'savedAt'> & { id?: string; savedAt?: string }
): ResearchWallet {
  const w = loadResearchWallet();
  const row: WalletSavedDoctor = {
    id: doc.id || newId(),
    npi: doc.npi.replace(/\D/g, ''),
    name: doc.name,
    specialty: doc.specialty,
    marketZip: doc.marketZip,
    savedAt: doc.savedAt || nowIso(),
  };
  if (row.npi.length !== 10) return w;
  const rest = w.doctors.filter((d) => d.npi !== row.npi);
  const next = { ...w, doctors: [row, ...rest].slice(0, MAX_DOCTORS) };
  saveResearchWallet(next);
  return next;
}

export function removeWalletDoctor(id: string): ResearchWallet {
  const w = loadResearchWallet();
  const next = { ...w, doctors: w.doctors.filter((d) => d.id !== id) };
  saveResearchWallet(next);
  return next;
}

export function upsertWalletDrug(
  drug: Omit<WalletSavedDrug, 'id' | 'savedAt'> & { id?: string; savedAt?: string }
): ResearchWallet {
  const w = loadResearchWallet();
  const row: WalletSavedDrug = {
    id: drug.id || newId(),
    rxcui: drug.rxcui.replace(/\D/g, ''),
    name: drug.name,
    strength: drug.strength,
    savedAt: drug.savedAt || nowIso(),
  };
  if (!row.rxcui) return w;
  const rest = w.drugs.filter((d) => d.rxcui !== row.rxcui);
  const next = { ...w, drugs: [row, ...rest].slice(0, MAX_DRUGS) };
  saveResearchWallet(next);
  return next;
}

export function removeWalletDrug(id: string): ResearchWallet {
  const w = loadResearchWallet();
  const next = { ...w, drugs: w.drugs.filter((d) => d.id !== id) };
  saveResearchWallet(next);
  return next;
}

export function updateWalletPreferences(
  prefs: Partial<WalletPreferences>
): ResearchWallet {
  const w = loadResearchWallet();
  const next = {
    ...w,
    preferences: { ...w.preferences, ...prefs },
  };
  saveResearchWallet(next);
  return next;
}

export function updateWalletNotes(notes: string): ResearchWallet {
  const w = loadResearchWallet();
  const next = { ...w, notes: notes.slice(0, MAX_NOTES) };
  saveResearchWallet(next);
  return next;
}

/** Snapshot Explorer session into wallet (doctors, drugs, market, scenario). */
export function saveExplorerSessionToWallet(input: {
  zip?: string | null;
  year?: number | null;
  scenario?: string | null;
  countyPath?: string | null;
  doctors?: Array<{
    npi: string;
    name: string;
    specialty?: string | null;
  }>;
  drugs?: Array<{ rxcui: string; name: string; strength?: string | null }>;
  customCare?: WalletPreferences['customCare'];
}): ResearchWallet {
  let w = loadResearchWallet();
  w = {
    ...w,
    preferences: {
      ...w.preferences,
      zip: input.zip ?? w.preferences.zip,
      year: input.year ?? w.preferences.year,
      scenario: input.scenario ?? w.preferences.scenario,
      countyPath: input.countyPath ?? w.preferences.countyPath,
      customCare: input.customCare ?? w.preferences.customCare,
    },
  };
  saveResearchWallet(w);

  for (const d of input.doctors ?? []) {
    upsertWalletDoctor({
      npi: d.npi,
      name: d.name,
      specialty: d.specialty,
      marketZip: input.zip,
    });
  }
  for (const d of input.drugs ?? []) {
    upsertWalletDrug({
      rxcui: d.rxcui,
      name: d.name,
      strength: d.strength,
    });
  }
  return loadResearchWallet();
}

export function walletExplorerRestoreHref(wallet?: ResearchWallet): string {
  const w = wallet ?? loadResearchWallet();
  const params = new URLSearchParams();
  params.set('restore', 'wallet');
  if (w.preferences.zip) params.set('zip', w.preferences.zip);
  if (w.preferences.year) params.set('year', String(w.preferences.year));
  if (w.preferences.scenario && w.preferences.scenario !== 'none') {
    params.set('scenario', w.preferences.scenario);
  }
  return `/tools/aca-plan-explorer?${params.toString()}`;
}

export function walletSummary(wallet: ResearchWallet): string {
  const parts = [
    wallet.plans.length ? `${wallet.plans.length} plan(s)` : null,
    wallet.doctors.length ? `${wallet.doctors.length} doctor(s)` : null,
    wallet.drugs.length ? `${wallet.drugs.length} Rx` : null,
    wallet.preferences.zip ? `ZIP ${wallet.preferences.zip}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Empty research wallet';
}
