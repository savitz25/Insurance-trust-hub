#!/usr/bin/env python3
"""OR-INS-001 — Oregon insurance snapshot from committed DFR artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORDERS = ROOT / "data/oregon/or-ins-001/dfr-insurance-orders.json"
COMPLAINTS = ROOT / "data/oregon/or-ins-001/complaints-2025.json"
EXAMS = ROOT / "data/oregon/or-ins-001/exam-index.json"
ART = ROOT / "lib/oregon-intelligence/accepted-snapshot.json"
GENERATION_KEYS = frozenset({"generated_at", "fingerprint"})

EXPECTED_ORDERS = 738
EXPECTED_CASES = 726
EXPECTED_COMPLAINT_ROWS = 1309
EXPECTED_COMPLAINT_NAMES = 780
EXPECTED_MC = 27
EXPECTED_FIN = 44


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(obj: object) -> str:
    return hashlib.sha256(dumps(obj).encode("utf-8")).hexdigest()


def semantic(obj: dict) -> dict:
    return {k: v for k, v in obj.items() if k not in GENERATION_KEYS}


def build_body(generated_at: str) -> dict:
    orders = json.loads(ORDERS.read_text(encoding="utf-8"))
    complaints = json.loads(COMPLAINTS.read_text(encoding="utf-8"))
    exams = json.loads(EXAMS.read_text(encoding="utf-8"))
    if orders["documentRows"] != EXPECTED_ORDERS:
        raise SystemExit(f"order rows drifted {orders['documentRows']}")
    if orders["distinctCases"] != EXPECTED_CASES:
        raise SystemExit("cases drifted")
    if complaints["row_total"] != EXPECTED_COMPLAINT_ROWS:
        raise SystemExit("complaint rows drifted")
    if complaints["distinct_names_across_lines"] != EXPECTED_COMPLAINT_NAMES:
        raise SystemExit("complaint names drifted")
    if exams["market_conduct"]["report_rows"] != EXPECTED_MC:
        raise SystemExit("mc drifted")
    if exams["financial"]["report_rows"] != EXPECTED_FIN:
        raise SystemExit("financial drifted")
    line_counts = {k: v["rows"] for k, v in complaints["lines"].items()}
    line_complaints = {k: v["sum_total_complaints"] for k, v in complaints["lines"].items()}
    return {
        "version": "insurance-or-state-intel-v1",
        "ticket": "OR-INS-001",
        "as_of": None,
        "source_as_of": None,
        "source_as_of_state": "UNKNOWN",
        "retrieved_at": "2026-09-17T01:20:00Z",
        "generated_at": generated_at,
        "snapshot_as_of": "2026-09-17",
        "source_clock": "DFR AdminOrders insurance-native DFRAction classes retrieved 2026-09-17. Complaint PDFs are DFR 2025 tables (Excel export; PDF metadata dates 2026-04-27/28). Market-conduct and financial exam indexes are the public examination-reports page. Domestic insurer PDF is dated February 1, 2022 and is not a current 2026 roster. Agency/producer/authorized-insurer bulk rosters remain search-only.",
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_oregon_local_pages": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/oregon",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/oregon",
            "h1": "Oregon Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "Oregon Division of Financial Regulation",
            "short": "DFR",
            "unit": "Department of Consumer and Business Services",
            "url": "https://dfr.oregon.gov/",
            "sbs_lookup": "https://sbs.naic.org/solar-external-lookup/",
            "nipr": "https://www.nipr.com/",
            "check_license": "https://dfr.oregon.gov/help/complaints-licenses/Pages/check-license.aspx",
            "agencies": "https://dfr.oregon.gov/business/licensing/insurance/pages/insurance-agencies.aspx",
            "orders": "https://dfr.oregon.gov/laws-rules/Pages/notices-orders.aspx",
            "complaints": "https://dfr.oregon.gov/help/complaints-licenses/pages/complaint-information.aspx",
            "complaint_compare": "https://dfr.oregon.gov/help/complaints-licenses/Pages/complaint-compare-search-tool.aspx",
            "exams": "https://dfr.oregon.gov/business/reg/reports-data/pages/examination-reports-of-insurers.aspx",
            "domestic_list": "https://dfr.oregon.gov/business/reg/insurer/Documents/domestic_list.pdf",
            "receivership": "https://isiteplus.naic.org/grid/gridDisc.jsp",
            "serff": "https://serff-sfa.naic.org/serff/sfa/home/OR",
            "file_complaint": "https://dfr.oregon.gov/help/complaints-licenses/Pages/file-complaint.aspx",
        },
        "hero": {
            "universe_value": None,
            "universe_label": "Current Oregon-authorized insurance companies",
            "universe_hint": "No current bulk insurer roster was acquired. SBS/DFR company lookup is OPEN_SEARCH_ONLY. Search-only is not zero.",
            "actions_value": EXPECTED_ORDERS,
            "actions_label": "DFR insurance-related administrative-order documents",
            "actions_hint": "Source-native insurance DFRAction classes only. A document is not a unique case. Mixed Enforcement/Filing/Mortgage/Securities buckets are not this census.",
            "current_value": "Search only",
            "current_label": "Agency / producer bulk roster",
            "current_hint": "SBS Individual vs Business Entity lookup is OPEN_SEARCH_ONLY. Individual producers are not agencies. Sole proprietors are not the agency business-entity license.",
            "geography_value": "Oregon",
            "as_of_value": "search-only",
            "as_of_label": "current license universes",
        },
        "company_lookup": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "count": None,
            "distinct_ids": None,
            "search_only_is_not_zero": True,
            "not_derived_from_orders": True,
            "not_derived_from_complaints": True,
            "not_derived_from_exams": True,
            "not_derived_from_domestic_list": True,
            "identity_namespace": None,
        },
        "producer_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "distinct_npns": None,
            "search_only_is_not_zero": True,
            "individual_is_not_agency": True,
            "npn_is_oregon_producer_license_number": True,
            "npn_is_not_insurer_certificate": True,
        },
        "agency_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "distinct_ids": None,
            "search_only_is_not_zero": True,
            "agency_is_not_insurer": True,
            "agency_is_not_sole_proprietor": True,
            "loa_depends_on_individual_licenses": True,
        },
        "appointments": {
            "coverage": "OPEN_SEARCH_ONLY",
            "OR_APPOINTMENT_COVERAGE": "OPEN_SEARCH_ONLY",
            "count": None,
            "license_is_not_appointment": True,
            "loa_is_not_appointment": True,
            "affiliation_is_not_carrier_appointment": True,
        },
        "domestic_insurers": {
            "coverage": "HISTORICAL_PDF_NOT_CURRENT_ROSTER",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "count": None,
            "source_as_of": "2022-02-01",
            "source": "https://dfr.oregon.gov/business/reg/insurer/Documents/domestic_list.pdf",
            "pdf_created": "2022-02-03T13:37:17-08:00",
            "domestic_is_not_authorized_universe": True,
            "not_refreshed_by_retrieval_time": True,
        },
        "dfr_orders": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "source": orders["source"],
            "filter": orders["filter"],
            "document_rows": EXPECTED_ORDERS,
            "distinct_cases": EXPECTED_CASES,
            "actions": {k: v for k, v in orders["actions"]},
            "types": {k: v for k, v in orders["types"]},
            "dateMin": orders["dateMin"],
            "dateMax": orders["dateMax"],
            "document_is_not_matter": True,
            "name_only": True,
            "excluded_mixed_buckets": orders["excludedActions"],
            "exact_profile_attachments": 0,
        },
        "complaints": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "year": 2025,
            "source": complaints["source"],
            "row_total": EXPECTED_COMPLAINT_ROWS,
            "distinct_names": EXPECTED_COMPLAINT_NAMES,
            "line_rows": line_counts,
            "line_total_complaints": line_complaints,
            "denominator": "Premium written as published in the DFR table",
            "index_label": "Oregon DFR Complaint Index (source-created)",
            "index_is_not_trust_score": True,
            "complaint_is_not_violation": True,
            "confirmed_is_not_automatically_misconduct": True,
            "name_only": True,
            "not_sorted_best_to_worst": True,
            "aggregate_advocacy_2025_insurance_cases_opened": 3452,
            "aggregate_is_not_insurer_table": True,
        },
        "market_conduct": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "report_rows": EXPECTED_MC,
            "distinct_insurers": exams["market_conduct"]["distinct_names"],
            "exam_is_not_discipline": True,
            "exam_is_not_order": True,
            "name_only": True,
            "source": exams["source"],
        },
        "financial_exams": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "report_rows": EXPECTED_FIN,
            "distinct_insurers": exams["financial"]["distinct_names"],
            "financial_exam_is_not_market_conduct": True,
            "exam_is_not_enforcement": True,
            "name_only": True,
            "source": exams["source"],
        },
        "receivership": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "supervision_order_rows": 17,
            "supervision_is_not_receivership": True,
            "grid_search": "https://isiteplus.naic.org/grid/gridDisc.jsp",
        },
        "serff": {
            "coverage": "FUTURE",
            "not_adverse": True,
            "not_authorization": True,
            "url": "https://serff-sfa.naic.org/serff/sfa/home/OR",
        },
        "identity": {
            "preferred_producer": "NPN when source-native",
            "preferred_insurer": "NAIC number when source-native",
            "naic_is_not_npn": True,
            "company_is_not_agency": True,
            "person_is_not_agency": True,
            "appointment_is_not_license": True,
            "name_only": "UNSAFE",
        },
        "enforcement_attachment": {
            "EXACT_COMPANY_ENFORCEMENT_ASSOCIATIONS": 0,
            "EXACT_PRODUCER_ENFORCEMENT_ASSOCIATIONS": 0,
            "REVIEW_REQUIRED_ASSOCIATIONS": 0,
            "REJECTED_NAME_ONLY_ASSOCIATIONS": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "research_association_is_not_profile_attachment": True,
        },
        "claim_eligibility": {"broadened": False},
        "expansion_ledger": {
            "OR_AGENCY_ROSTER": "OPEN_SEARCH_ONLY",
            "OR_AGENCY_ROWS": None,
            "OR_AGENCY_DISTINCT_IDS": None,
            "OR_AGENCY_CURRENT_DISTINCT_IDS": None,
            "OR_PRODUCER_ROSTER": "OPEN_SEARCH_ONLY",
            "OR_PRODUCER_ROWS": None,
            "OR_PRODUCER_DISTINCT_NPNS": None,
            "OR_AUTHORIZED_INSURER_ROSTER": "OPEN_SEARCH_ONLY",
            "OR_AUTHORIZED_INSURER_ROWS": None,
            "OR_AUTHORIZED_INSURER_DISTINCT_IDS": None,
            "OR_DOMESTIC_INSURER_ROWS": None,
            "OR_APPOINTMENT_COVERAGE": "OPEN_SEARCH_ONLY",
            "OR_COMPLAINT_DATA_COVERAGE": "ACQUIRED_CURRENT_SNAPSHOT",
            "OR_COMPLAINT_ROWS": EXPECTED_COMPLAINT_ROWS,
            "OR_COMPLAINT_DISTINCT_INSURER_IDENTITIES": EXPECTED_COMPLAINT_NAMES,
            "OR_MARKET_CONDUCT_EXAM_ROWS": EXPECTED_MC,
            "OR_MARKET_CONDUCT_DISTINCT_INSURERS": exams["market_conduct"]["distinct_names"],
            "OR_FINANCIAL_EXAM_ROWS": EXPECTED_FIN,
            "OR_FINANCIAL_EXAM_DISTINCT_INSURERS": exams["financial"]["distinct_names"],
            "OR_DFR_INSURANCE_ORDER_ROWS": EXPECTED_ORDERS,
            "OR_DFR_INSURANCE_UNIQUE_MATTERS": EXPECTED_CASES,
            "OR_RECEIVERSHIP_ROWS": None,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "NET_NEW_STATE_RESEARCH_IDENTITIES": 0,
            "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
            "NET_NEW_PUBLIC_INSURANCE_PROFILES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "GRAPH_WRITES": 0,
            "CLAIM_ELIGIBILITY_BROADENED": False,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = build_body(generated_at)
    fp = sha(semantic(body))
    body["fingerprint"] = fp
    if args.check:
        current = json.loads(ART.read_text(encoding="utf-8"))
        if sha(semantic(current)) != current["fingerprint"]:
            raise SystemExit("stored fingerprint does not match semantic hash")
        if sha(semantic(body)) != current["fingerprint"]:
            raise SystemExit(f"semantic drift {sha(semantic(body))} != {current['fingerprint']}")
        print("or snapshot check ok", current["fingerprint"])
        return
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print("wrote", ART, "fingerprint", fp)


if __name__ == "__main__":
    main()
