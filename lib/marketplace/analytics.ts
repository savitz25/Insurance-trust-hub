/**
 * Lightweight research-tool events (Phase 8).
 * Prefers dataLayer when present; never blocks UI.
 */

export type MarketplaceEventName =
  | 'doctor_added'
  | 'doctor_match_run'
  | 'prescription_added'
  | 'prescription_match_run'
  | 'plan_detail_with_match'
  | 'save_doctors_drugs_workspace'
  | 'confirm_official_source_click'
  | 'scenario_selected'
  | 'custom_scenario_used'
  | 'sort_by_yearly_cost'
  | 'plan_detail_with_cost'
  | 'compare_with_yearly_cost';

export function trackMarketplaceEvent(
  name: MarketplaceEventName,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = { event: `ith_marketplace_${name}`, ...props };
    const w = window as Window & { dataLayer?: unknown[] };
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(payload);
    }
  } catch {
    // ignore
  }
}
