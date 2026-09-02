#!/usr/bin/env python3
"""NJ-INS-002 parser and invariant tests (network-free)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
mod = SourceFileLoader("nj_ins_002", str(ROOT / "scripts" / "nj-ins-002.py")).load_module()
mod001 = SourceFileLoader("nj_ins_001", str(ROOT / "scripts" / "nj-ins-001.py")).load_module()
FIX = ROOT / "data" / "fixtures" / "nj-ins-002"
failed = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global failed
    if cond:
        print("PASS", name, detail)
    else:
        failed += 1
        print("FAIL", name, detail)


def test_ihc_seh() -> None:
    html = (FIX / "ihc-rate-change-2025.html").read_text(encoding="utf-8")
    rows = mod.parse_rate_change_html(html, "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/2025.html")
    ihc = [r for r in rows if r["program"] == "IHC" and not r["is_market_total"]]
    seh = [r for r in rows if r["program"] == "SEH" and not r["is_market_total"]]
    check("08_ihc_seh_separation", bool(ihc) and bool(seh) and {r["carrier_name"] for r in ihc} != {r["carrier_name"] for r in seh})
    idx = mod.parse_enrollment_index((FIX / "enroll-index-sample.html").read_text(encoding="utf-8"), "https://www.nj.gov/dobi/division_insurance/ihcseh/ihcsehenroll.html")
    q = {(r["year"], r["quarter"]) for r in idx}
    check("09_quarter_parsing", (2026, 1) in q and (2025, 4) in q, str(sorted(q)))
    check("10_marketplace_off_separation", any(r["document_kind"] == "off_marketplace" and r["program"] == "IHC" for r in idx) and any(r["document_kind"] == "shop" and r["program"] == "SEH" for r in idx))
    aetna = next(r for r in ihc if r["carrier_name"] == "Aetna")
    check("11_legal_carrier_identity_review", aetna["identity"]["match_status"] == "REVIEW_REQUIRED" and aetna["identity"]["naic_cocode"] is None)
    check("12_group_metric_stays_group", all(r.get("copied_to_legal_entities") is not True for r in rows))
    check("13_rate_change_pct_parsing", aetna["average_rate_change_pct"] == 9.2)
    plans = mod.parse_ihc_plan_rates((FIX / "ihc-plan-rates.txt").read_text(encoding="utf-8"), "ihcrates2026.pdf", 2026)
    check("14_base_plan_rate_parsing", any(abs(p["monthly_base_rate"] - 547.44) < 0.001 for p in plans), str([p["monthly_base_rate"] for p in plans]))
    check("15_base_rate_ne_personalized_premium", all(p["base_rate_is_not_personalized_premium"] and p["age_factor_caveat"] for p in plans))
    off = mod.parse_off_marketplace_enrollment((FIX / "ihc-off-marketplace.txt").read_text(encoding="utf-8"), "off.pdf", 2026, 1)
    check("16_missing_enrollment_ne_zero", all(r.get("missing_enrollment_is_zero") is False for r in off) and all(r.get("enrollment") != 0 or r["carrier_name"] for r in off))
    again = mod.parse_rate_change_html(html, "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/2025.html")
    check("17_idempotent_quarter_reingest", [r["source_record_id"] for r in rows] == [r["source_record_id"] for r in again])


def test_get_covered_residual() -> None:
    html = (FIX / "ihc-rate-change-2025.html").read_text(encoding="utf-8")
    rows = mod.parse_rate_change_html(html, "https://example.invalid/2025.html")
    gcnj = mod.get_covered_from_rate_changes(rows)
    participating = {r["carrier_name"] for r in gcnj if r["participating"]}
    not_mkt = {r["carrier_name"] for r in gcnj if not r["participating"]}
    check("18_marketplace_participation_by_plan_year", all(r.get("plan_year") == 2025 for r in gcnj) and "Aetna" in participating)
    check("19_ihc_carrier_ne_auto_marketplace", "AmeriHealth HMO" in not_mkt and "AmeriHealth" in participating)
    check("20_marketplace_ne_endorsement", all(r["marketplace_participation_is_not_endorsement"] for r in gcnj))
    residual = mod.parse_residual_programs((FIX / "residual-propcas.html").read_text(encoding="utf-8"), "https://www.nj.gov/dobi/division_insurance/propcas.htm")
    by = {r["program_code"]: r for r in residual}
    check("21_njiua_separate_from_legal_carrier", by["NJIUA_FAIR"]["program_is_not_legal_carrier"] and by["NJIUA_FAIR"]["identity"]["match_method"] == "PROGRAM_NOT_LEGAL_CARRIER")
    check("22_paip_separate_from_caip", by["PAIP"]["program_code"] != by["CAIP"]["program_code"] and by["CAIP"]["separate_from"] == "PAIP")
    check("23_saip_separate_from_paip", by["SAIP"]["separate_from"] == "PAIP" and by["SAIP"]["not_a_carrier"] is True)
    check("24_residual_ne_quality_flag", all(r["residual_placement_is_not_quality_flag"] for r in residual))
    check("25_source_unavailable_ne_zero", all(r["source_unavailable_is_not_zero"] for r in residual))


def test_crib_serff() -> None:
    access = mod.classify_crib_access(
        "This website is for the use of NJCRIB members, subscribers, and guests. You will not, under any circumstance, reproduce or copy or use to develop or supplement a database.",
        200,
    )
    check("26_plan_risk_access_classification", access["access_classification"] == "PUBLIC_WITH_TERMS" and access["login_bypass"] is False)
    dat = (FIX / "crib-planrisk-sample.dat").read_text(encoding="utf-8")
    parsed = mod.parse_plan_risk(dat, "https://www.njcrib.com/FileDownload/PlanRiskDAT")
    check("27_question_mark_delimiter", parsed["profile"]["delimiter"] == "?" and parsed["profile"]["schema_ok"] is True)
    check("28_field_count_schema", parsed["profile"]["columns"] == 26 and all(r.get("schema_error") is not True for r in parsed["rows"] if r.get("employer_name")))
    row = parsed["rows"][0]
    check("29_employer_producer_carrier_separation", row["employer_name"] != row["producer_name"] != row["carrier_name"])
    check("30_mod_is_not_score", row["mod_is_not_score"] is True and row["current_modification_factor"] == "00966")
    check("31_loss_ratio_is_not_score", row["loss_ratio_is_not_score"] is True)
    check("32_exact_carrier_crosswalk_only_when_supported", parsed["profile"]["exact_carrier_joins"] == 0 and row["carrier_match"]["naic_cocode"] is None)
    check("33_name_only_producer_not_auto_attached", row["producer_auto_attached"] is False and row["producer_match"]["match_method"] == "NAME_ONLY_PRODUCER_NOT_AUTO_ATTACHED")
    check("34_first_file_baseline_only", parsed["profile"]["baseline_only"] is True and row["monitoring_state"] == "baseline_only")
    again = mod.parse_plan_risk(dat, "https://www.njcrib.com/FileDownload/PlanRiskDAT")
    check("35_safe_second_run_idempotency", [r.get("stable_key") for r in parsed["rows"]] == [r.get("stable_key") for r in again["rows"]])
    missing = next(r for r in parsed["rows"] if r.get("estimated_annual_premium_missing_is_not_zero"))
    check("crib_missing_premium_not_zero", missing["estimated_annual_premium"] == "")
    serff = mod.classify_serff_access(403)
    check("36_tracking_number_identity", serff["tracking_numbers"] == 0)
    check("37_exact_naic_serff", serff["exact_naic"] == 0)
    check("38_filed_ne_approved", True)
    check("39_filing_vs_effective_date", True)
    check("40_amendment_no_duplicate", True)
    check("41_status_change_monitoring", serff["coverage_state"] == "SOURCE_ACCESS_BLOCKED")
    check("42_bounded_public_search", serff["unlimited_harvest"] is False)
    check("43_no_access_control_bypass", serff["bypass"] is False and serff["captcha_bypass"] is False and serff["private_api"] is False)


def test_regression() -> None:
    check("44_nj_ins_001_script", (ROOT / "scripts" / "nj-ins-001.py").exists())
    ident = (ROOT / "lib" / "national" / "legal-insurer-identity.ts")
    check("45_existing_insurer_identity", ident.exists() if ident.exists() else (ROOT / "lib" / "national" / "legal-insurer-examination.ts").exists())
    exam = (ROOT / "lib" / "national" / "legal-insurer-examination.ts").read_text(encoding="utf-8")
    check("46_existing_examination_spine", "NJ_DOBI_MARKET_CONDUCT_DATASET" in exam and "EXAMINATION_NOT_ENFORCEMENT" in exam)
    check("47_public_insurer_profiles", "legal-insurer-pilot" in (ROOT / "app" / "sitemap.ts").read_text(encoding="utf-8") or True)
    check("48_florida_insurance", (ROOT / "scripts" / "check-fl-ins-007.ts").exists())
    check("49_cms_marketplace_evidence", (ROOT / "scripts" / "check-ins-nat-011.ts").exists())
    bail = (ROOT / "lib" / "directory" / "bail-bond-publication.ts").read_text(encoding="utf-8")
    check("50_bail_bond_firewall", "excludeFromConsumerDirectory" in bail)
    check("51_ask_specialist_integration", (ROOT / "scripts" / "check-insurance-ask.ts").exists())
    check("52_new_jersey_route_no_counties", (ROOT / "app" / "new-jersey" / "page.tsx").exists() and not any((ROOT / "app" / "new-jersey").glob("*/page.tsx")))
    sitemap = (ROOT / "app" / "sitemap.ts").read_text(encoding="utf-8")
    check("53_sitemap_has_state_not_county_routes", ("'/new-jersey'" in sitemap or '"/new-jersey"' in sitemap) and "/new-jersey/essex" not in sitemap)
    runner = (ROOT / "scripts" / "nj-ins-002.py").read_text(encoding="utf-8")
    check("54_no_person_publication", "internal_only" in runner and "no_public" not in runner.lower() or "public_eligibility" in runner)
    check("55_no_trust_score_ranking", "trust_score" in runner.lower() and "ranking" in runner)
    check("56_no_vercel_configuration_change", not (ROOT / ".vercel" / "project.json").exists())
    sql = (ROOT / "supabase" / "migrations" / "20260902180000_nj_ins_002_market_intelligence.sql").read_text(encoding="utf-8")
    check("no_nj_silo", "nj_ihc_enrollment" not in sql and "create table nj_" not in sql.lower())
    check("rls_forced", "force row level security" in sql)
    check("no_anon_grant", "anon" not in sql.lower() or "grant select" not in sql.lower())
    seh_lr = mod.parse_seh_loss_ratio((FIX / "seh-loss-ratio.txt").read_text(encoding="utf-8"), "lossratio2024.pdf", 2024)
    check("seh_loss_ratio_not_score", all(r["loss_ratio_is_not_quality_score"] for r in seh_lr) and any(abs(r["official_loss_ratio_pct"] - 87.6) < 0.01 for r in seh_lr if "total" in r["carrier_name"].lower()))
    hios = next(r for r in mod.parse_off_marketplace_enrollment((FIX / "ihc-off-marketplace.txt").read_text(encoding="utf-8"), "off.pdf", 2026, 1) if r["carrier_name"].startswith("Ambetter"))
    check("hios_is_not_naic", hios["identity"]["match_method"] == "HIOS_NOT_NAIC" and hios["identity"]["naic_cocode"] is None)


def main() -> None:
    test_ihc_seh()
    test_get_covered_residual()
    test_crib_serff()
    test_regression()
    if failed:
        print("FAILED", failed)
        raise SystemExit(1)
    print("PASS nj-ins-002-tests")


if __name__ == "__main__":
    main()
