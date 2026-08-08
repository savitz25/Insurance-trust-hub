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
  | 'compare_with_yearly_cost'
  | 'plan_xray_opened'
  | 'county_intelligence_opened'
  | 'explorer_prefill_from_county'
  | 'outbound_official_exchange_click'
  | 'save_plan_from_xray'
  | 'wallet_save_plan'
  | 'wallet_save_doctor'
  | 'wallet_save_drug'
  | 'wallet_restore'
  | 'wallet_magic_link_requested'
  | 'wallet_opened'
  | 'continue_from_wallet_to_explorer'
  | 'wallet_item_deleted'
  | 'medicare_county_opened'
  | 'medicare_plan_intelligence_opened'
  | 'medicare_tool_handoff'
  | 'outbound_medicare_gov_click'
  | 'medicare_save_intent'
  | 'carrier_page_opened'
  | 'carrier_to_aca_explorer'
  | 'carrier_to_medicare_county'
  | 'carrier_to_contract'
  | 'outbound_official_source_click'

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
