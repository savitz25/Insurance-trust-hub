#!/usr/bin/env python3
"""CA-INS-001 publication invariants."""
from __future__ import annotations

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


def main() -> None:
    snap = json.loads((ROOT / "lib/california-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
    acq = json.loads((ROOT / "artifacts/ca-ins-001/acquisition-report.json").read_text(encoding="utf-8"))
    ui = (ROOT / "components/california/ca-state-page.tsx").read_text(encoding="utf-8")
    pub = (ROOT / "lib/california-intelligence/publication.ts").read_text(encoding="utf-8")
    sitemap = (ROOT / "app/sitemap.ts").read_text(encoding="utf-8")
    footer = (ROOT / "lib/design/insurance-design-system.ts").read_text(encoding="utf-8")
    jsonld = (ROOT / "lib/california-intelligence/jsonld.ts").read_text(encoding="utf-8")
    page = ROOT / "app/california/page.tsx"
    inv = ROOT / "public/california-dmhc-enforcement.json"

    check("01_route", page.exists())
    check("02_indexable", snap["publication"]["indexable"] is True and snap["publication"]["robots"] == "index,follow")
    check("03_canonical", snap["publication"]["canonical"] == "https://www.insurancetrusthub.com/california")
    check("04_sitemap", "'/california'" in sitemap or '"/california"' in sitemap)
    check("05_fingerprint", snap["fingerprint"] in pub and len(snap["fingerprint"]) == 64)
    check("06_footer", "/california" in footer)

    e = snap["enforcement"]
    check("07_enf_rows", e["rows"] == 5435 == acq["enforcement"]["rows"])
    check("08_loa", e["action_counts"]["Letter of Agreement"] == 4212)
    check("09_settlement", e["action_counts"]["Settlement Agreement"] == 606)
    check("10_cd", e["action_counts"]["Cease and Desist Order"] == 240)
    check("11_accusation", e["action_counts"]["Accusation"] == 53)
    check("12_all_classes", sum(e["action_counts"].values()) == 5435)
    check("13_dates", e["date_min"] == "2000-07-03" and e["date_max"] == "2026-05-22")
    check("14_no_name_attach", e["identity_bar"] == "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH" and e["profile_links"] == 0)
    check("15_loa_ne_settlement", e["letter_of_agreement_is_not_settlement"] is True)
    check("16_no_rank", e["no_enforcement_ranking"] is True)
    check("17_inventory", inv.exists() and inv.stat().st_size > 100_000)

    imr = snap["imr"]
    check("18_imr_rows", imr["rows"] == 42749)
    check("19_imr_ne_complaint", imr["imr_is_not_complaint"] is True and "IMR is not a complaint" in ui)
    check("20_imr_sum", sum(imr["determination_counts"].values()) == 42749)
    check("21_no_plan_rates", imr["no_plan_rates"] is True and imr["has_plan_identifier"] is False)

    cdi = snap["cdi_health_list"]
    check("22_cdi_count", cdi["row_count"] == 28)
    check("23_phones", cdi["phone_count"] == 28)
    check("24_sites", cdi["website_count"] == 27)
    check("25_not_universe", cdi["not_complete_admitted_universe"] is True)
    check("26_cdi_ne_dmhc", snap["regulators"]["dmhc_is_not_cdi"] is True and "DMHC is not CDI" in ui)
    check("27_no_combined", "not the complete" in ui.lower() and snap["cdi_admitted"]["complete_count"] is None)

    check("28_fair_residual", snap["fair_plan"]["not_typical_market"] is True)
    check("29_complaint_ne_violation", snap["complaints"]["complaint_is_not_violation"] is True)
    check("30_naic", snap["federal_national"]["naic_is_not_california_authorization"] is True)
    check("31_findings", len(snap["findings"]) >= 3)
    check("32_no_trust", "No Trust Score" in ui and snap["no_trust_score"] is True)
    check("33_jsonld", "WebPage" in jsonld and "BreadcrumbList" in jsonld and "Dataset" in jsonld)
    check("34_no_rating_schema", "AggregateRating" not in jsonld and "Review" not in jsonld)
    check("35_no_counties", snap["no_california_county_pages"] is True)
    check("36_nj_untouched", (ROOT / "app/new-jersey/page.tsx").exists())
    check("37_fl_untouched", (ROOT / "app/florida/page.tsx").exists())
    check("38_missing_ne_zero", "Unknown is not zero" in ui)

    if failed:
        raise SystemExit(f"{failed} checks failed")
    print("ca-ins-001-tests PASS", snap["fingerprint"])


if __name__ == "__main__":
    main()
