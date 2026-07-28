import {
  COMPARE_TRAY_KEY,
  MAX_COMPARE_PROVIDERS,
} from '@/lib/my-insurance/constants';

export type CompareTrayItem = {
  slug: string;
  name: string;
};

export function getCompareTray(): CompareTrayItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_TRAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareTrayItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.slug === 'string' && typeof p.name === 'string')
      .slice(0, MAX_COMPARE_PROVIDERS);
  } catch {
    return [];
  }
}

export function setCompareTray(items: CompareTrayItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      COMPARE_TRAY_KEY,
      JSON.stringify(items.slice(0, MAX_COMPARE_PROVIDERS))
    );
    window.dispatchEvent(new CustomEvent('ith-compare-tray'));
  } catch {
    /* ignore quota */
  }
}

export function addToCompareTray(item: CompareTrayItem): {
  ok: boolean;
  reason?: string;
  items: CompareTrayItem[];
} {
  const current = getCompareTray();
  if (current.some((c) => c.slug === item.slug)) {
    return { ok: true, items: current };
  }
  if (current.length >= MAX_COMPARE_PROVIDERS) {
    return {
      ok: false,
      reason: `You can compare up to ${MAX_COMPARE_PROVIDERS} agencies.`,
      items: current,
    };
  }
  const next = [...current, item];
  setCompareTray(next);
  return { ok: true, items: next };
}

export function removeFromCompareTray(slug: string): CompareTrayItem[] {
  const next = getCompareTray().filter((c) => c.slug !== slug);
  setCompareTray(next);
  return next;
}

export function clearCompareTray(): void {
  setCompareTray([]);
}

export function isInCompareTray(slug: string): boolean {
  return getCompareTray().some((c) => c.slug === slug);
}
