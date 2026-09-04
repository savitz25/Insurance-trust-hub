#!/usr/bin/env python3
"""WA-INS-001 publication invariants."""
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
    snap = json.loads((ROOT / "lib/washington-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
    acq = json.loads((ROOT / "artifacts/wa-ins-001/acquisition-report.json").read_text(encoding="utf-8"))
    ui = (ROOT / "components/washington/wa-state-page.tsx").read_text(encoding="utf-8")
    pub = (ROOT / "lib/washington-intelligence/publication.ts").read_text(encoding="utf-8")
    sitemap = (ROOT / "app/sitemap.ts").read_text(encoding="utf-8")
    footer = (ROOT / "lib/design/insurance-design-system.ts").read_text(encoding="utf-8")
    jsonld = (ROOT / "lib/washington-intelligence/jsonld.ts").read_text(encoding="utf-8")
    page = ROOT / "app/washington/page.tsx"

    check("01_route", page.exists())
    check("02_indexable", snap["publication"]["indexable"] is True and snap["publication"]["robots"] == "index,follow")
    check("03_canonical", snap["publication"]["canonical"] == "https://www.insurancetrusthub.com/washington")
    check("04_sitemap", "'/washington'" in sitemap)
    check("05_no_nested", "/washington/" not in sitemap)
    check("06_fingerprint", snap["fingerprint"] in pub and len(snap["fingerprint"]) == 64)
    check("07_footer", "/washington" in footer)
    check("08_entities", snap["annual_aggregates"]["regulated_entities"] == 2924 == acq["regulated_entities"])
    check("09_split", snap["annual_aggregates"]["domestic"] == 263)
    check("10_foreign", snap["annual_aggregates"]["foreign"] == 2590)
    check("11_alien", snap["annual_aggregates"]["alien"] == 71)
    check("12_sum", snap["annual_aggregates"]["sum_check"] is True)
    check("13_not_roster", snap["annual_aggregates"]["not_a_live_roster"] is True)
    check("14_producer", snap["producer_roster"]["WA_PRODUCER_BULK_ROSTER"] == "SOURCE_USE_RESTRICTED / SEARCH_ONLY")
    check("15_agency", snap["agency_roster"]["WA_AGENCY_BULK_ROSTER"] == "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY")
    check("16_no_counts", snap["producer_roster"]["count"] is None and snap["agency_roster"]["count"] is None)
    check("17_no_scrape", snap["source_access"]["agent_company_lookup"]["scraped"] is False)
    check("18_no_declaration", snap["source_access"]["lists_of_individuals"]["commercial_declaration_submitted"] is False)
    check("19_orders_unsafe", snap["orders"]["name_only"] == "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH")
    check("20_rate_search", snap["rate_filings"]["RATE_FILINGS"] == "OPEN_SEARCH_ONLY")
    check("21_cms", snap["federal_overlay"]["cms_marketplace_washington_projection"] == "SOURCE_NOT_SPLIT / NOT_USED")
    check("22_findings", len(snap["findings"]) >= 3)
    check("23_no_trust", snap["no_trust_score"] is True and "Trust Score" in ui)
    check("24_jsonld", "WebPage" in jsonld and "BreadcrumbList" in jsonld and "Dataset" in jsonld)
    check("25_no_rating", "AggregateRating" not in jsonld)
    check("26_no_counties", snap["no_washington_county_pages"] is True)
    check("27_ledger_orgs", snap["expansion_ledger"]["NET_NEW_CANONICAL_ORGANIZATIONS"] == 0)
    check("28_ledger_ids", snap["expansion_ledger"]["NET_NEW_STATE_IDENTITIES"] == 0)
    check("29_tx", (ROOT / "app/texas/page.tsx").exists())
    check("30_ca", (ROOT / "app/california/page.tsx").exists())
    check("31_missing", "Unknown is not zero" in ui)
    check("32_nj", (ROOT / "app/new-jersey/page.tsx").exists())
    check("33_fl", (ROOT / "app/florida/page.tsx").exists())
    check("34_hash_manifest", (ROOT / "artifacts/wa-ins-001/hash-manifest.json").exists())
    check("35_no_seattle", "/washington/seattle" not in ui and "Seattle" not in ui)
    man = json.loads((ROOT / "artifacts/wa-ins-001/hash-manifest.json").read_text(encoding="utf-8"))
    check("36_manifest_fp", man.get("snapshot_fingerprint") == snap["fingerprint"])

    if failed:
        raise SystemExit(f"{failed} checks failed")
    print("wa-ins-001-tests PASS", snap["fingerprint"])


if __name__ == "__main__":
    main()
