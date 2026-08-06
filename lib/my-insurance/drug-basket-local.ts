/**
 * Device mirror of the account drug basket after a successful cloud save.
 * Used so HQ can show the list immediately even if RSC cache is stale,
 * and so the tool can reload the last saved account list for edit.
 * Source of truth when signed in remains Supabase drug_baskets / drug_basket_items.
 */

import type { DrugBasketItemInput } from '@/lib/my-insurance/types';

export const ACCOUNT_DRUG_BASKET_KEY = 'ith:my-insurance-drug-basket:v1';

export type LocalAccountDrugBasket = {
  userId: string;
  basketName: string;
  items: DrugBasketItemInput[];
  updatedAt: string;
  basketId?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function saveLocalAccountDrugBasket(basket: LocalAccountDrugBasket): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(ACCOUNT_DRUG_BASKET_KEY, JSON.stringify(basket));
    window.dispatchEvent(new CustomEvent('ith-my-insurance-drug-basket'));
  } catch {
    /* private mode / quota */
  }
}

export function loadLocalAccountDrugBasket(
  userId?: string | null
): LocalAccountDrugBasket | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_DRUG_BASKET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalAccountDrugBasket;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (userId && parsed.userId && parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalAccountDrugBasket(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(ACCOUNT_DRUG_BASKET_KEY);
    window.dispatchEvent(new CustomEvent('ith-my-insurance-drug-basket'));
  } catch {
    /* ignore */
  }
}
