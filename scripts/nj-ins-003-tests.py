#!/usr/bin/env python3
"""NJ-INS-003 publication invariants (network-free)."""
from __future__ import annotations

import json
import re
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


def main() -> None:
    page = ROOT / "app" / "new-jersey" / "page.tsx"
    snap_path = ROOT / "lib" / "new-jersey-intelligence" / "accepted-snapshot.json"
    sitemap = (ROOT / "app" / "sitemap.ts").read_text(encoding="utf-8")
    ui = (ROOT / "components" / "new-jersey" / "nj-state-page.tsx").read_text(encoding="utf-8")
    pub = (ROOT / "lib" / "new-jersey-intelligence" / "publication.ts").read_text(encoding="utf-8")
    footer = (ROOT / "lib" / "design" / "insurance-design-system.ts").read_text(encoding="utf-8")
    crib_doc = (ROOT / "docs" / "nj-ins-003-crib-publication-review.md").read_text(encoding="utf-8")
    s001 = json.loads((ROOT / "data" / "reports" / "nj-ins-001-summary.json").read_text(encoding="utf-8"))
    s002 = json.loads((ROOT / "data" / "reports" / "nj-ins-002-summary.json").read_text(encoding="utf-8"))
    snap = json.loads(snap_path.read_text(encoding="utf-8"))
    fl_intel = (ROOT / "lib" / "national" / "fl-state-intel.ts").read_text(encoding="utf-8")
    bail = (ROOT / "lib" / "directory" / "bail-bond-publication.ts").read_text(encoding="utf-8")

    check("01_route_exists", page.exists())
    check("02_indexable", snap["publication"]["indexable"] is True and "index,follow" in snap["publication"]["robots"])
    check("03_canonical", snap["publication"]["canonical"] == "https://www.insurancetrusthub.com/new-jersey")
    check("04_sitemap", "'/new-jersey'" in sitemap or '"/new-jersey"' in sitemap)
    check("05_fingerprint", isinstance(snap["fingerprint"], str) and len(snap["fingerprint"]) == 64)

    check("06_admitted_reconciles", snap["authorization"]["admitted"] == s001["carriers"]["source_rows"] == 1370)
    check("07_admitted_ne_surplus", snap["authorization"]["admitted_is_not_surplus"] is True and snap["authorization"]["surplus_lines_eligible"] is None)
    check("08_legal_entity_grain", snap["authorization"]["grain"] == "legal_entity")
    check("09_group_ne_company", snap["authorization"]["group_is_not_company"] is True)
    check("10_license_ne_appointment", snap["authorization"]["license_is_not_appointment"] is True)

    e = snap["enforcement"]
    check("11_grain_separation", e["events"] != e["unique_orders"] != snap["document_depth"]["unique_hashes"])
    check("12_bfd_consent", e["bfd"]["events"] == 2241 and e["bfd"]["class_counts"]["CONSENT_ORDER"] == 2241)
    check("13_sanction_ne_instrument", set(e["action_class_counts"]) != set(e["class_counts"]))
    check("14_unresolved_not_attached", e["unresolved_not_profile_attached"] is True)
    check("15_individual_not_copied", e["individual_not_copied_to_agency"] is True)
    check("16_absence_ne_clean", e["absence_is_not_clean_history"] is True and e["doi_2008_coverage_state"] == "SOURCE_NOT_ACQUIRED")
    check("17_no_enforcement_ranking", e["no_enforcement_ranking"] is True)

    check("18_mc_ne_financial", snap["market_conduct"]["reports"] != snap["financial_exams"]["reports"])
    check("19_exam_ne_enforcement", snap["market_conduct"]["converted_to_enforcement"] == 0 and snap["financial_exams"]["converted_to_enforcement"] == 0)
    check("20_financial_exact_naic", snap["financial_exams"]["exact_naic"] == 117)
    check("21_mc_withheld", snap["market_conduct"]["withheld_from_profiles"] is True and snap["market_conduct"]["exact_naic"] == 0)
    check("22_no_exam_score", snap["market_conduct"]["exam_score"] is None and snap["financial_exams"]["exam_score"] is None)

    ac = snap["auto_complaints"]
    check("23_complaint_ne_violation", ac["complaint_is_not_violation"] is True)
    check("24_valid_ne_all", ac["valid_complaint_is_not_all_complaints"] is True)
    check("25_group_grain", ac["group_grain_rows"] == 31)
    check("26_not_copied_subsidiary", ac["copied_to_legal_entities"] is False and ac["group_is_not_copied_to_subsidiary"] is True)
    check("27_no_complaint_ranking", ac["no_complaint_ranking"] is True and ac["leaderboard_created"] is False)

    check("28_ihc_ne_seh", snap["ihc"]["ihc_is_not_seh"] is True and snap["ihc"]["carriers"] != snap["seh"]["carriers"])
    check("29_marketplace_ne_endorsement", snap["get_covered"]["marketplace_is_not_endorsement"] is True)
    check("30_rate_ne_premium", snap["ihc"]["average_rate_change_is_not_consumer_premium"] is True)
    check("31_missing_quarter_ne_zero", snap["ihc"]["missing_quarter_is_not_zero"] is True and snap["ihc"]["enrollment_total"] is None)

    codes = [p["code"] for p in snap["residuals"]["programs"]]
    by = {p["code"]: p for p in snap["residuals"]["programs"]}
    check("32_njiua_ne_voluntary", by["NJIUA_FAIR"]["not_a_voluntary_insurer"] is True)
    check("33_paip_ne_caip", "PAIP" in codes and "CAIP" in codes and by["CAIP"]["separate_from"] == "PAIP")
    check("34_saip_ne_insurer", by["SAIP"]["not_a_carrier"] is True)
    check("35_residual_ne_quality", all(p.get("not_a_quality_flag") is True for p in snap["residuals"]["programs"]))

    check("36_crib_terms", snap["crib"]["publication_allowed"] is False and "redistribution" in crib_doc.lower())
    check("37_crib_not_rendered", snap["crib"]["rows_rendered"] == 0 and snap["crib"]["downloadable_dataset"] is False)
    check("38_no_employer_profiles", snap["crib"]["employer_profiles_created"] is False)

    check("39_serff_blocked_ne_zero", snap["serff"]["filings_displayed"] is None and snap["serff"]["coverage_state"] == "SOURCE_ACCESS_BLOCKED")
    check("40_filed_ne_approved", snap["serff"]["filed_is_not_approved"] is True)
    check("41_rehab_official_only", snap["rehab"]["inferred_insolvency"] is False and snap["rehab"]["entities"] == 12)

    check("42_florida_route", (ROOT / "app" / "florida" / "page.tsx").exists() and 'FLORIDA_ROUTE = \'/florida\'' in fl_intel)
    check("43_national_insurer_identity", (ROOT / "lib" / "national" / "legal-insurer-identity.ts").exists())
    check("44_examination_spine", "EXAMINATION_NOT_ENFORCEMENT" in (ROOT / "lib" / "national" / "legal-insurer-examination.ts").read_text(encoding="utf-8"))
    check("45_cms_marketplace", (ROOT / "scripts" / "check-ins-nat-011.ts").exists())
    check("46_public_insurer_profiles", "publishedProfileSitemapPaths" in sitemap)
    check("47_bail_firewall", "excludeFromConsumerDirectory" in bail)
    check("48_ask_customer", (ROOT / "scripts" / "check-insurance-ask.ts").exists())
    hubs = snap["existing_nj_agency_hubs"]
    check("49_existing_nj_hubs", all((ROOT / "app" / "hubs").exists() for _ in [1]) and "/hubs/new-jersey/north-new-jersey" in hubs)
    check("50_no_public_person", snap["profile_modules"]["no_public_person_profile"] is True)
    check("51_no_ranking", snap["publication"]["rankings"] is False and "Trust Score" in ui)
    check("52_no_trust_score_product", snap["publication"]["trust_scores"] is False and re.search(r"not a ranking[\s\S]*Trust Score", ui, re.I) is not None)

    check("no_county_routes", snap["publication"]["county_routes"] is False and not any((ROOT / "app" / "new-jersey").glob("*/page.tsx")))
    check("florida_canonical_untouched", "FLORIDA_INDEXABLE = true" in fl_intel)
    check("footer_discovery", "/new-jersey" in footer)
    check("five_noun_hero", "Universe" in ui and "Current" in ui and "Observations" in ui and "Geography" in ui and "As-of" in ui)
    check("trace_this_number", "Trace this number" in (ROOT / "components" / "new-jersey" / "trace.tsx").read_text(encoding="utf-8"))
    blob = (ui + json.dumps(snap)).lower()
    check("no_every_consumer", "not a count of companies serving every" in blob and "companies serving every new jersey consumer." not in ui.lower())
    check("no_zero_serff_metric", "0 filings" not in ui.lower())
    check("ui_interpolates", "s.authorization.admitted" in ui and "1370" not in ui)
    check("gate_path", "/new-jersey" in pub)
    check("hubs_preserved", (ROOT / "lib" / "hubs" / "data" / "north-new-jersey-agents.ts").exists())
    check("no_vercel_project", not (ROOT / ".vercel" / "project.json").exists())
    check("reconcile_events", e["events"] == s001["enforcement"]["events"])
    check("reconcile_ihc_obs", snap["ihc"]["rate_change_observations"] == s002["ihc"]["rate_change_observations"])

    if failed:
        print("FAILED", failed)
        raise SystemExit(1)
    print("PASS nj-ins-003-tests")


if __name__ == "__main__":
    main()
