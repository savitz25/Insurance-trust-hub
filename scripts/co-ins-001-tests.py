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
    check("16_surplus", snap["surplus_lines"]["eligible_identities"] == 247)
    check("17_surplus_split", snap["surplus_lines"]["naic_cocode_identities"] == 215 and snap["surplus_lines"]["alien_aa_identities"] == 32)
    check("18_surplus_not_admitted", snap["surplus_lines"]["eligible_is_not_admitted"] is True)
    check("19_alien_not_naic", snap["surplus_lines"]["alien_aa_is_not_naic_cocode"] is True)
    check("20_certs_not_all", snap["domestic_certificates"]["not_all_authorized_insurers"] is True)
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
    check("46_six_pages", len(metrics["publication"]["publishedStateIntelligencePaths"]) == 6)
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
