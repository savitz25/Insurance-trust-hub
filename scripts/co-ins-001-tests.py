#!/usr/bin/env python3
"""CO-INS-001 publication invariants."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
failed = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global failed
    if cond:
        print("PASS", name, detail)
    else:
        failed += 1
        print("FAIL", name, detail)


def fingerprint(payload: dict) -> str:
    body = {k: v for k, v in payload.items() if k != "fingerprint"}
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def main() -> None:
    snap = json.loads((ROOT / "lib/colorado-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
    ui = (ROOT / "components/colorado/co-state-page.tsx").read_text(encoding="utf-8")
    pub = (ROOT / "lib/colorado-intelligence/publication.ts").read_text(encoding="utf-8")
    sitemap = (ROOT / "app/sitemap.ts").read_text(encoding="utf-8")
    footer = (ROOT / "lib/design/insurance-design-system.ts").read_text(encoding="utf-8")
    jsonld = (ROOT / "lib/colorado-intelligence/jsonld.ts").read_text(encoding="utf-8")
    page = ROOT / "app/colorado/page.tsx"
    metrics = json.loads((ROOT / "data/home/insurance-network-metrics-v1.json").read_text(encoding="utf-8"))
    metrics_src = (ROOT / "lib/metrics/compute-insurance-network-metrics.ts").read_text(encoding="utf-8")

    check("01_route", page.exists())
    check("02_indexable", snap["publication"]["indexable"] is True and snap["publication"]["robots"] == "index,follow")
    check("03_canonical", snap["publication"]["canonical"] == "https://www.insurancetrusthub.com/colorado")
    check("04_sitemap", "'/colorado'" in sitemap)
    check("05_no_nested", "/colorado/" not in sitemap)
    check("06_fingerprint", snap["fingerprint"] in pub and len(snap["fingerprint"]) == 64)
    check("07_footer", "/colorado" in footer)
    check("08_directory", snap["statistical_report"]["naic_companies_tab"]["company_directory_rows"] == 1839)
    check("09_distinct", snap["statistical_report"]["naic_companies_tab"]["distinct_naic"] == 1839)
    check("10_one_to_one", snap["statistical_report"]["naic_companies_tab"]["one_to_one"] is True)
    check("11_not_roster", snap["statistical_report"]["not_a_live_roster"] is True)
    check("12_producer", snap["producer_roster"]["CO_PRODUCER_BULK_ROSTER"] == "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY")
    check("13_agency", snap["agency_roster"]["CO_AGENCY_BULK_ROSTER"] == "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY")
    check("14_no_counts", snap["producer_roster"]["count"] is None and snap["agency_roster"]["count"] is None)
    check("15_no_scrape", snap["source_access"]["producer_agency_lookup"]["scraped"] is False)
    check("16_surplus", snap["surplus_lines"]["eligible_identities"] == 259)
    check("17_surplus_split", snap["surplus_lines"]["naic_cocode_identities"] == 225 and snap["surplus_lines"]["alien_aa_identities"] == 34)
    check("18_surplus_not_admitted", snap["surplus_lines"]["eligible_is_not_admitted"] is True)
    check("19_alien_not_naic", snap["surplus_lines"]["alien_aa_is_not_naic_cocode"] is True)
    check("20_certs_not_all", snap["domestic_certificates"]["not_all_authorized_insurers"] is True)
    check("20b_certs_entries_vs_heading_hrefs", snap["domestic_certificates"]["named_company_entries"] == 49)
    check("20c_certs_company_links", snap["domestic_certificates"]["company_document_links"] == 49)
    check("20d_certs_total_hrefs", snap["domestic_certificates"]["total_list_item_hrefs"] == 50)
    check("20e_certs_entry_ne_total_href", snap["domestic_certificates"]["named_company_entries"] != snap["domestic_certificates"]["total_list_item_hrefs"])
    check("20f_surplus_current_window", snap["surplus_lines"]["effective_from"] == "2026-07-01" and snap["surplus_lines"]["effective_through"] == "2027-06-30")
    check("20g_prior_expired", snap["surplus_lines"]["prior_2025_2026_list"]["effective_through"] == "2026-06-30" and snap["surplus_lines"]["prior_2025_2026_list"]["period_ended"] is True)
    check("20h_expired_ne_current", snap["surplus_lines"]["prior_2025_2026_list"]["effective_through"] != snap["surplus_lines"]["effective_through"])
    check("20i_complaint_index_not_score", snap["complaints"]["complaint_index_is_not_trusthub_score"] is True)
    check("20j_ratio_received", snap["complaints"]["ratio_and_index_use_received_complaints"] is True)
    check("20k_total_ne_confirmed", snap["complaints"]["total_complaints_are_not_confirmed_complaints"] is True)
    check("20l_complaint_ne_violation", snap["complaints"]["complaint_is_not_violation"] is True)
    check("20m_std_rows", snap["complaints"]["standard_ratio_index"]["company_line_rows"] == 415)
    check("20n_std_naic", snap["complaints"]["standard_ratio_index"]["exact_naic_on_detail_link"] is True)
    check("20o_name_only_unsafe", snap["complaints"]["name_only_adverse_attach"] == "UNSAFE")
    check("20p_alias_not_id", snap["complaints"]["alias_parenthetical_is_not_identity_key"] is True)
    check("20q_row_ne_insurer", snap["complaints"]["standard_ratio_index"]["complaint_report_row_is_not_legal_insurer_identity"] is True)
    check("20r_crosswalk", snap["naic_crosswalk"]["CROSSWALK_STATUS"] == "EXECUTED")
    check("20s_stat_match", snap["naic_crosswalk"]["statistical_report"]["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == 1834)
    check("20t_stat_unmatched", snap["naic_crosswalk"]["statistical_report"]["UNMATCHED_NAIC"] == 5)
    check("20u_surplus_match", snap["naic_crosswalk"]["surplus_lines"]["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == 223)
    check("20v_alien_not_xw", snap["naic_crosswalk"]["surplus_lines"]["alien_aa_not_crosswalked"] == 34)
    check("20w_match_ne_enrich", snap["expansion_ledger"]["EXACT_IDENTITY_MATCH_IS_NOT_ENRICHMENT"] is True)
    check("20x_enriched_zero", snap["expansion_ledger"]["EXISTING_ORGANIZATIONS_ENRICHED"] == 0)
    check("20y_no_profile_attach", snap["expansion_ledger"]["EXACT_PROFILE_ATTACHMENTS"] == 0)
    check("20z_closed_mixed", snap["complaints"]["annual"]["closed_figure_is_not_complaint_only"] is True)
    a = snap["complaints"]["annual"]
    check("20ad_official_recoveries", a["recoveries_total_usd"] == 17607341)
    check("20ae_pc_lh_subtotal", a["recoveries_displayed_pc_lh_subtotal_usd"] == 17607088)
    check("20af_pc_plus_lh", a["recoveries_property_casualty_usd"] + a["recoveries_life_health_usd"] == 17607088)
    check("20ag_residual_253", a["recoveries_unattributed_difference_usd"] == 253)
    check("20ah_lines_ne_official", a["recoveries_displayed_pc_lh_subtotal_usd"] != a["recoveries_total_usd"])
    check("20ai_no_false_equation", a["recoveries_property_casualty_usd"] + a["recoveries_life_health_usd"] != a["recoveries_total_usd"])
    check("20aj_do_not_reconcile_flag", a["recoveries_displayed_lines_do_not_equal_official_total"] is True)
    check("20ak_ui_no_false_sum", "= $17,607,341" not in ui and "life/health = $17,607,341" not in ui)
    check("20al_ui_states_residual", "$17,607,088" in ui and "$253" in ui)
    check("20am_current_surplus_metric_2026", "Official 2026–2027 eligible non-admitted insurer list" in metrics_src)
    check("20an_current_surplus_trace_2026", "on the 2026–2027 list" in metrics_src)
    surplus_metric = next(m for m in metrics["metrics"] if m["key"] == "co_surplus_lines_eligible_identities")
    check("20aq_json_denom_2026", surplus_metric["denominator"] == "Official 2026–2027 eligible non-admitted insurer list")
    check("20ar_json_trace_2026", "2026–2027" in surplus_metric["trace"]["counts"])
    check("20as_json_value_259", surplus_metric["value"] == 259)
    check("20at_json_not_2025_current", "2025–2026" not in surplus_metric["denominator"] and "2025–2026" not in surplus_metric["trace"]["counts"])
    check("20ao_historical_247_stays_2025", snap["surplus_lines"]["prior_2025_2026_list"]["eligible_identities"] == 247)
    check("20ap_lists_not_swapped", snap["surplus_lines"]["eligible_identities"] != snap["surplus_lines"]["prior_2025_2026_list"]["eligible_identities"])
    check("20aa_ui_period", "2026–2027" in ui or "2026-07-01" in ui)
    check("20ab_ui_complaint_index", "Complaint Index" in ui and "TrustHub score" in ui)
    check("20ac_ui_no_current_bare", "currently eligible" not in ui.lower())
    check("21_domicile_not_auth", "Domicile is not Colorado authority" in ui or "domicile is not" in ui.lower())
    check("22_orders_unsafe", snap["disciplinary_actions"]["name_only"] == "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH")
    check("23_rate_search", snap["rate_filings"]["RATE_FILINGS"] == "OPEN_SEARCH_ONLY")
    check("24_cms", snap["federal_overlays"]["cms_marketplace_colorado_projection"] == "SOURCE_NOT_SPLIT / NOT_USED")
    check("25_findings", len(snap["findings"]) >= 3)
    check("26_no_trust", snap["no_trust_score"] is True and "Trust Score" in ui)
    check("27_jsonld", "WebPage" in jsonld and "BreadcrumbList" in jsonld and "Dataset" in jsonld and "Organization" in jsonld)
    check("28_no_rating", "AggregateRating" not in jsonld)
    check("29_no_counties", snap["no_colorado_county_pages"] is True and snap["no_denver_route"] is True)
    check("30_ledger_orgs", snap["expansion_ledger"]["NET_NEW_CANONICAL_LEGAL_INSURERS"] == 0)
    check("31_ledger_agencies", snap["expansion_ledger"]["NET_NEW_CANONICAL_AGENCIES"] == 0)
    check("32_tx", (ROOT / "app/texas/page.tsx").exists())
    check("33_ca", (ROOT / "app/california/page.tsx").exists())
    check("34_wa", (ROOT / "app/washington/page.tsx").exists())
    check("35_nj", (ROOT / "app/new-jersey/page.tsx").exists())
    check("36_fl", (ROOT / "app/florida/page.tsx").exists())
    check("37_missing", "Unknown is not zero" in ui)
    check("38_no_denver", "/colorado/denver" not in ui and "/colorado/denver" not in sitemap)
    check("39_recursive_fp", fingerprint(snap) == snap["fingerprint"])
    check("40_no_1844_hero", snap["hero"]["universe_value"] == 1839)
    check("41_1844_rejected", snap["rejected_totals"]["official_pdf_1844_as_hero_universe"]["status"] == "REJECTED")
    check("42_national_agencies", metrics["nationalGraph"]["agencies"] == 82071)
    check("43_national_persons", metrics["nationalGraph"]["persons"] == 1029860)
    check("44_national_legal", metrics["nationalGraph"]["legalInsurers"] == 6185)
    check("45_state_pages", "/colorado" in metrics["publication"]["publishedStateIntelligencePaths"])
    check("46_six_pages", len(metrics["publication"]["publishedStateIntelligencePaths"]) == 8 and "/virginia" in metrics["publication"]["publishedStateIntelligencePaths"] and "/new-york" in metrics["publication"]["publishedStateIntelligencePaths"])
    check("47_no_az", "/arizona" not in metrics["publication"]["publishedStateIntelligencePaths"])
    check("48_surplus_ne_directory", snap["surplus_lines"]["eligible_identities"] != snap["statistical_report"]["naic_companies_tab"]["company_directory_rows"])
    check("49_directory_ne_national", snap["statistical_report"]["naic_companies_tab"]["company_directory_rows"] != 6185)
    check("50_certs_ne_domicile", snap["domestic_certificates"]["named_company_entries"] != snap["statistical_report"]["naic_companies_tab"]["colorado_domicile_distinct_naic"])
    man = json.loads((ROOT / "artifacts/co-ins-001/hash-manifest.json").read_text(encoding="utf-8"))
    check("51_manifest_fp", man.get("snapshot_fingerprint") == snap["fingerprint"])
    check("52_local_no", snap["local_county_decision"]["break_statewide_first"] is False)
    check("53_no_clock", "generatedAt" not in snap and "generated_at" not in snap)
    check("54_search_only_copy", "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY" in ui)

    if failed:
        raise SystemExit(f"{failed} checks failed")
    print("co-ins-001-tests PASS", snap["fingerprint"])


if __name__ == "__main__":
    main()
