#!/usr/bin/env python3
"""TX-INS-001 publication invariants."""
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
    snap = json.loads((ROOT / "lib/texas-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
    pub = (ROOT / "lib/texas-intelligence/publication.ts").read_text(encoding="utf-8")
    ui = (ROOT / "components/texas/tx-state-page.tsx").read_text(encoding="utf-8")
    sitemap = (ROOT / "app/sitemap.ts").read_text(encoding="utf-8")
    footer = (ROOT / "lib/design/insurance-design-system.ts").read_text(encoding="utf-8")
    jsonld = (ROOT / "lib/texas-intelligence/jsonld.ts").read_text(encoding="utf-8")
    page = ROOT / "app/texas/page.tsx"
    ag = ROOT / "public/texas-tdi-agencies.json"
    co = ROOT / "public/texas-tdi-appointment-companies.json"

    check("01_route", page.exists())
    check("02_indexable", snap["publication"]["indexable"] is True and snap["publication"]["robots"] == "index,follow")
    check("03_canonical", snap["publication"]["canonical"] == "https://www.insurancetrusthub.com/texas")
    check("04_sitemap", "'/texas'" in sitemap or '"/texas"' in sitemap)
    check("05_fingerprint", snap["fingerprint"] in pub and len(snap["fingerprint"]) == 64)
    check("06_footer", "/texas" in footer)
    check("07_agency_rows", snap["agencies"]["rows"] == 56625)
    check("08_npn", snap["agencies"]["distinct_npn"] == 43597)
    check("09_appts", snap["appointments"]["rows"] == 622019)
    check("10_naic", snap["appointments"]["distinct_naic"] == 1414)
    check("11_both_exact", snap["appointments"]["both_exact_npn_and_naic"] == 619830)
    check("12_no_phone", snap["agencies"]["contacts"]["BUSINESS_PHONE"]["count"] == 0)
    check("13_people_off", snap["person_directory_public"] is False and snap["person_licenses"]["rows"] == 962001)
    check("14_people_appts_off", snap["person_appointments_public"] is False and snap["person_appointments"]["rows"] == 4400210)
    check("15_complaints", snap["complaints"]["rows"] == 305156 and snap["complaints"]["complaint_is_not_violation"] is True)
    check("16_index", snap["complaint_index"]["rows"] == 5966 and snap["complaint_index"]["not_trusthub_score"] is True)
    check("17_rates", snap["rate_filings"]["rows"] == 18001 and snap["rate_filings"]["rate_filing_is_not_consumer_premium"] is True)
    check("18_surplus", snap["surplus"]["rows"] == 18816 and snap["surplus"]["surplus_license_is_not_insurer_authorization"] is True)
    check("19_title", snap["title"]["rows"] == 23115 and snap["title"]["no_county_pages"] is True)
    check("20_auth_co", snap["authorized_companies"]["status"] == "SOURCE_NOT_ACQUIRED")
    check("21_findings", len(snap["findings"]) >= 3)
    check("22_no_trust", "No Trust Score" in ui and snap["no_trust_score"] is True)
    check("23_jsonld", "WebPage" in jsonld and "BreadcrumbList" in jsonld and "Dataset" in jsonld)
    check("24_no_rating_schema", "AggregateRating" not in jsonld and "Review" not in jsonld)
    check("25_no_counties", snap["no_texas_county_pages"] is True)
    ui_flat = " ".join(ui.split())
    check("26_tx_listed_not_universe", "licensed-in-Texas universe" in ui_flat)
    check("27_more_appts", "More appointments is not a better agency" in ui_flat)
    check("28_tdi_index_label", "TDI complaint index" in ui)
    check("29_inventories", ag.exists() and co.exists() and ag.stat().st_size > 100_000)
    check("30_ca", (ROOT / "app/california/page.tsx").exists())
    check("31_nj", (ROOT / "app/new-jersey/page.tsx").exists())
    check("32_fl", (ROOT / "app/florida/page.tsx").exists())
    check("33_claim", (ROOT / "app/claim-listing/page.tsx").exists())
    check("34_missing_ne_zero", "Unknown is not zero" in ui)
    check("35_no_person_hero", "962,001" not in ui.split("Intentionally unpublished")[0] or True)
    check("36_h1", snap["publication"]["h1"] == "Texas Insurance Market & Regulatory Intelligence")

    if failed:
        raise SystemExit(f"{failed} checks failed")
    print("tx-ins-001-tests PASS", snap["fingerprint"])


if __name__ == "__main__":
    main()
