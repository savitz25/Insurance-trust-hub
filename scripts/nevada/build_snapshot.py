#!/usr/bin/env python3
"""NV-INS-001: freeze the Nevada public snapshot from the committed NDOI extracts.

Stdlib only. `--check` rebuilds from the committed extracts and fails on any drift (CI path).

Inputs (committed): data/nevada/nv-ins-001/{sources,market-report-census,enforcement-orders-index,
mhpaea-company-reports-index,complaint-data,capability-pages}.json and the national census.
Output: lib/nevada-intelligence/accepted-snapshot.json.

Nothing here writes to the identity graph. No roster is invented: the company, agency and producer bulk
rosters stay count = null (unknown, not zero). Regulator-stated census figures are republished as NDOI's
own statements with NDOI's own clock and are never added together.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/nevada/nv-ins-001"
OUT = ROOT / "lib/nevada-intelligence/accepted-snapshot.json"
CENSUS = ROOT / "data/home/insurance-metric-census-r2-04.json"
VERSION = "insurance-nv-state-intel-v1"
SNAPSHOT_AS_OF = "2026-09-25"
# Observed on the live /api/inventory/health endpoint (verifiedNvCount) during the audit; a directory-layer
# observation from the Phase 14 NDOI firm import, not an NDOI census and not re-counted here.
EXISTING_NV_DIRECTORY = {"verified_listings_observed": 18247, "observed_at": "2026-09-25T17:05:00Z",
                         "source": "https://www.insurancetrusthub.com/api/inventory/health (verifiedNvCount)"}
EXTRACTS = ["market-report-census.json", "enforcement-orders-index.json", "mhpaea-company-reports-index.json",
            "complaint-data.json", "capability-pages.json"]


def need(cond: bool, message: str) -> None:
    if not cond:
        sys.exit(f"NV-INS-001 build: {message}")


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha_obj(obj: object) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def main() -> None:
    check = "--check" in sys.argv
    sources = read(SRC / "sources.json")
    x = {name: read(SRC / name) for name in EXTRACTS}
    for name in EXTRACTS:
        need(sha_obj(x[name]) == sources["extract_sha256"][name], f"{name} differs from the hash recorded at extraction")
    census = read(CENSUS)["nationalGraph"]
    need("NV" not in census["credentialsByJurisdiction"], "national graph now holds NV credentials; reconcile before publishing")

    mr, enf, mh, cd, cap = (x[n] for n in EXTRACTS)
    caps = sources["captures"]
    retrieved = sorted(v["retrieved_at"] for k, v in caps.items() if not k.startswith("di-"))
    lic, comp = mr["licensees"], mr["companies"]
    y = cd["years_acquired"]

    body = {
        "version": VERSION,
        "ticket": "NV-INS-001",
        "snapshot_as_of": SNAPSHOT_AS_OF,
        "source_as_of": None,
        "source_clock_note": "No single Nevada source clock: the market-report census is as of October 2024, complaint rows run through 2024-12-31 and the one listed order is dated 2026-06-26.",
        "retrieved_at": retrieved[-1],
        "generated_at": None,
        "publication": {"path": "/nevada", "robots_index": True, "sitemap": True,
                        "h1": "Nevada insurance regulatory research"},
        "regulator": {
            "agency": "Nevada Division of Insurance",
            "short": "NDOI",
            "department": "Department of Business and Industry",
            "home_url": "https://doi.nv.gov/",
            "license_lookup_url": cap["license_lookup"]["url"],
            "self_serve_lists_url": cap["self_serve_lists"]["url"],
            "enforcements_url": enf["page"],
            "complaint_url": cap["complaint_intake"]["url"],
            "complaint_data_url": cd["page"],
            "serff_url": cap["serff"]["url"],
            "captive_url": cap["captive"]["url"],
            "public_records_url": cap["public_records"]["url"],
        },
        "market_report_census": {
            "document": mr["document"],
            "figures_as_of_statement": mr["figures_as_of_statement"],
            "figures_as_of_month": mr["figures_as_of"],
            "regulator_statement_not_our_count": True,
            "licensees": lic,
            "companies": comp,
            "consumer_services_fy2024": mr["consumer_services_fy2024"],
            "examinations_2022_2023": mr["examinations_2022_2023"],
        },
        "legal_companies": {
            "count": None,
            "coverage": "NOT_ACQUIRED / SEARCH_ONLY_COMPANY_LOOKUP",
            "verification": "KNOWN",
            "regulator_stated_licensed_insurers": comp["licensed_domestic_and_foreign_insurers"],
            "regulator_stated_as_of": mr["figures_as_of"],
            "surplus_lines_visible_in_lookup": cap["license_lookup"]["surplus_lines_visible"],
            "no_public_company_bulk_list_found": True,
            "national_legal_insurer_spine": census["legalInsurers"],
            "national_spine_is_not_nevada_authority": True,
            "nevada_credentials_in_national_graph": 0,
        },
        "naic_crosswalk": {"nevada_company_list": None, "note": "No NDOI company list was acquired, so no NAIC crosswalk was run."},
        "agency_roster": {
            "count": None,
            "coverage": "NOT_ACQUIRED / SELF_SERVE_EXPORT_REJECTED_AUTOMATED_ACCESS",
            "verification": "KNOWN",
            "regulator_stated_agency_licensees": lic["agency_licensees"],
            "regulator_stated_resident": lic["agency_resident"],
            "regulator_stated_non_resident": lic["agency_non_resident"],
            "regulator_stated_as_of": mr["figures_as_of"],
            "existing_nv_directory": EXISTING_NV_DIRECTORY,
            "existing_directory_is_not_ndoi_census": True,
            "existing_directory_clock_differs_from_report": True,
        },
        "producer_roster": {
            "count": None,
            "coverage": "NOT_ACQUIRED / SELF_SERVE_EXPORT_REJECTED_AUTOMATED_ACCESS",
            "verification": "KNOWN",
            "regulator_stated_individual_licensees": lic["individual_licensees"],
            "regulator_stated_resident": lic["individual_resident"],
            "regulator_stated_non_resident": lic["individual_non_resident"],
            "regulator_stated_as_of": mr["figures_as_of"],
            "individual_licensee_is_not_producer_only": True,
            "person_names_published_here": False,
        },
        "company_authority": {
            "instruments": ["Certificate of Authority", "Certificate of Registration", "Certificate of Approval", "Certificate of License"],
            "instrument_source": cap["company_admission_instruments"]["source"],
            "application_types_listed": cap["company_admission_instruments"]["application_types_listed"],
            "instruments_never_collapsed_to_licensed": True,
            "risk_retention_registration_is_not_certificate_of_authority": True,
            "surplus_lines_is_not_admitted": True,
            "captive_is_not_a_traditional_insurer_license": True,
            "company_type_is_not_product_offer": True,
            "workers_comp_authority_lens": "NOT_ACQUIRED",
        },
        "enforcement": {
            "page": enf["page"],
            "list_date": None,
            "listed_orders": enf["listed_orders"],
            "orders": enf["orders"],
            "archived_copies_found": enf["archived_copies_found"],
            "orders_before_current_posting": enf["orders_before_current_posting"],
            "exact_attachments": {"EXACT_NAIC_ATTACHMENTS": 0, "EXACT_NPN_ATTACHMENTS": 0, "NAME_ONLY_ATTACHMENTS": "UNSUPPORTED"},
            "standalone_events": True,
            "consent_order_is_not_a_rating": True,
        },
        "mhpaea_reports": {
            "page": mh["page"],
            "section": mh["section"],
            "company_reports": mh["company_reports"],
            "rows": mh["rows"],
            "pdfs_parsed": False,
            "draft_report_is_not_a_finding": True,
            "exact_naic_attachments": 0,
            "name_only_attachment": "UNSUPPORTED",
        },
        "complaint_data": {
            "page": cd["page"],
            "grain": cd["grain"],
            "period_start": "2022-01-01",
            "period_end": "2024-12-31",
            "years": {k: {kk: vv for kk, vv in v.items()} for k, v in y.items()},
            "rows_2024": y["2024"]["complaint_reason_rows"],
            "earlier_years_published_not_acquired": cd["earlier_years_published_not_acquired"],
            "respondent_names_published_here": False,
            "respondents_include_individual_people": True,
            "respondent_field_is_truncated_at_30_characters": True,
            "identifiers_printed": cd["identifiers_printed"],
            "exact_attachments": 0,
            "name_only_attachment": "UNSUPPORTED",
            "rows_are_not_complaints": True,
            "complaint_is_not_enforcement": True,
            "complaint_count_is_not_quality_score": True,
            "no_company_complaint_ranking": True,
            "fy2024_investigated_statement_is_fiscal_year": True,
        },
        "complaint_intake": {"status": "KNOWN", "url": cap["complaint_intake"]["url"], "portal": cap["complaint_intake"]["online_portal"]},
        "serff": {"status": "KNOWN", "url": cap["serff"]["url"], "statement": cap["serff"]["statement"],
                  "filings_are_not_ratings_or_prices": True, "filings_ingested": 0},
        "self_serve_lists": cap["self_serve_lists"],
        "license_lookup": cap["license_lookup"],
        "capabilities": {
            "legal_company_verification": "KNOWN",
            "legal_company_bulk": "NOT_ACQUIRED",
            "agency_bulk_export": "NOT_ACQUIRED",
            "producer_bulk_export": "NOT_ACQUIRED",
            "regulator_stated_census": "KNOWN",
            "company_authority_instruments": "KNOWN",
            "workers_comp_authority_lens": "NOT_ACQUIRED",
            "enforcement_orders": "PARTIAL",
            "enforcement_archive_before_current": "NOT_ACQUIRED",
            "mhpaea_company_reports_index": "PARTIAL",
            "complaint_intake": "KNOWN",
            "complaint_data_2022_2024": "PARTIAL",
            "complaint_data_2015_2021": "NOT_ACQUIRED",
            "provider_level_complaint_attachment": "UNSUPPORTED",
            "serff_filing_access": "KNOWN",
            "public_records": "REQUEST_ONLY",
            "name_only_adverse_join": "UNSUPPORTED",
            "combined_nevada_insurance_total": "UNSUPPORTED",
            "nevada_local_intelligence": "UNSUPPORTED",
        },
        "profile_attachments": {"EXACT_PROFILE_ATTACHMENTS": 0, "graph_write": False},
        "expansion_ledger": {
            "GRAPH_WRITES": 0,
            "NET_NEW_CANONICAL_AGENCIES": 0,
            "NET_NEW_CANONICAL_LEGAL_INSURERS": 0,
            "NET_NEW_CANONICAL_PERSONS": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "CLAIM_ELIGIBILITY_BROADENED": False,
        },
        "source_extracts": {n: sources["extract_sha256"][n] for n in EXTRACTS},
        "source_captures_sha256": {k: v["sha256"] for k, v in sorted(caps.items())},
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_nevada_local_routes": True,
    }
    body["fingerprint"] = sha_obj({k: v for k, v in body.items() if k not in {"generated_at", "fingerprint"}})

    if check:
        existing = read(OUT)
        need(existing.get("fingerprint") == body["fingerprint"], f"fingerprint drift {existing.get('fingerprint')} != {body['fingerprint']}")
        body["generated_at"] = existing["generated_at"]
        need(existing == body, "snapshot body drift")
    else:
        from datetime import datetime, timezone
        body["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(body, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(body["fingerprint"])


if __name__ == "__main__":
    main()
