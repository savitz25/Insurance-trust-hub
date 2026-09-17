#!/usr/bin/env python3
"""PA-INS-001 — Pennsylvania insurance snapshot from committed PID artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/pennsylvania/pa-ins-001"
ART = ROOT / "lib/pennsylvania-intelligence/accepted-snapshot.json"
GENERATION_KEYS = frozenset({"generated_at", "fingerprint"})

EXPECTED_NAIC = 1722
EXPECTED_LETTER_ROWS = 1724
EXPECTED_PA_DOMICILE = 211
EXPECTED_SURPLUS = 233
EXPECTED_ENFORCEMENT_ACTIONS = 3232
EXPECTED_MARKET_CONDUCT = 450
EXPECTED_CCRC = 24
EXPECTED_ENFORCEMENT_DOCS = 3706
EXPECTED_FINANCIAL = 494
EXPECTED_LIQ = 95
EXPECTED_COMPLAINT_ROWS = 595
EXPECTED_COMPLAINT_NAMES = 500
EXPECTED_COMPLAINT_SUM = 9209


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(obj: object) -> str:
    return hashlib.sha256(dumps(obj).encode("utf-8")).hexdigest()


def semantic(obj: dict) -> dict:
    return {k: v for k, v in obj.items() if k not in GENERATION_KEYS}


def build_body(generated_at: str) -> dict:
    companies = json.loads((DATA / "licensed-companies.json").read_text(encoding="utf-8"))
    surplus = json.loads((DATA / "surplus-lines.json").read_text(encoding="utf-8"))
    enf = json.loads((DATA / "enforcement-summary.json").read_text(encoding="utf-8"))
    fin = json.loads((DATA / "financial-exam-summary.json").read_text(encoding="utf-8"))
    liq = json.loads((DATA / "liquidation-summary.json").read_text(encoding="utf-8"))
    complaints = json.loads((DATA / "complaints-summary.json").read_text(encoding="utf-8"))
    if companies["distinctNaic"] != EXPECTED_NAIC:
        raise SystemExit(f"company NAIC drifted {companies['distinctNaic']}")
    if companies["letterRows"] != EXPECTED_LETTER_ROWS:
        raise SystemExit("company letter rows drifted")
    if companies["paDomicileDistinctNaic"] != EXPECTED_PA_DOMICILE:
        raise SystemExit("PA domicile drifted")
    if surplus["distinctNaic"] != EXPECTED_SURPLUS:
        raise SystemExit("surplus drifted")
    if enf["enforcementActions"] != EXPECTED_ENFORCEMENT_ACTIONS:
        raise SystemExit("enforcement drifted")
    if enf["marketConductActions"] != EXPECTED_MARKET_CONDUCT:
        raise SystemExit("market conduct drifted")
    if enf["ccrcReports"] != EXPECTED_CCRC:
        raise SystemExit("ccrc drifted")
    if enf["documentRows"] != EXPECTED_ENFORCEMENT_DOCS:
        raise SystemExit("enforcement docs drifted")
    if fin["documentRows"] != EXPECTED_FINANCIAL:
        raise SystemExit("financial drifted")
    if liq["documentRows"] != EXPECTED_LIQ:
        raise SystemExit("liquidation drifted")
    if complaints["row_total_2025"] != EXPECTED_COMPLAINT_ROWS:
        raise SystemExit("complaint rows drifted")
    if complaints["distinct_names_2025"] != EXPECTED_COMPLAINT_NAMES:
        raise SystemExit("complaint names drifted")
    powers = companies["powerCounts"]
    return {
        "version": "insurance-pa-state-intel-v1",
        "ticket": "PA-INS-001",
        "as_of": "2026-09-14",
        "source_as_of": "2026-09-14",
        "source_as_of_state": "KNOWN",
        "retrieved_at": companies["retrievedAt"],
        "generated_at": generated_at,
        "snapshot_as_of": "2026-09-17",
        "source_clock": "PID company information current as of 2026-09-14 (weekly refresh cadence is not that date). Business-entity and individual producer lookup clocks: Wednesday, September 16, 2026. Complaint Comparison Tool reporting year 2025 (2024 comparison harvested). Enforcement, market-conduct, financial-exam, and liquidation catalogs retrieved 2026-09-17. generatedAt is excluded from the semantic fingerprint.",
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_pennsylvania_local_pages": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/pennsylvania",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/pennsylvania",
            "h1": "Pennsylvania Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "Pennsylvania Insurance Department",
            "short": "PID",
            "url": "https://www.pa.gov/agencies/insurance",
            "company_lookup": "https://www.pid.pa.gov/dsf/gfsearch.html",
            "producer_lookup": "https://apps02.ins.pa.gov/producer/ilist1.asp",
            "agency_lookup": "https://apps02.ins.pa.gov/producer/alist1.asp",
            "surplus_lines": "https://www.pid.pa.gov/dsf/slasearch.html",
            "complaints": "https://www.pid.pa.gov/scrpts/cmpln_tool",
            "file_complaint": "https://www.pa.gov/agencies/insurance/consumer-help-center/complaints-questions-help",
            "enforcement": "https://www.pa.gov/agencies/insurance/resources/consumer-resources/enforcement-actions-search",
            "financial_exams": "https://www.pa.gov/agencies/insurance/posted-filings-reports-company-orders/posted-reports/financial-examination-reports.html",
            "liquidation": "https://www.pa.gov/agencies/insurance/resources/consumer-resources/liquidated-rehabilitated-discharged-insurance-companies",
            "search_tools": "https://www.pa.gov/agencies/insurance/resources/search-tool-library",
        },
        "hero": {
            "universe_value": EXPECTED_NAIC,
            "universe_label": "PID licensed companies (distinct NAIC)",
            "universe_hint": "A–Z Licensed Company Search. Letter rows 1,724 / distinct NAIC 1,722. Not agencies, not producers, not surplus lines, not the liquidation catalog. Company information current as of 2026-09-14.",
            "actions_value": EXPECTED_ENFORCEMENT_ACTIONS,
            "actions_label": "PID Enforcement Actions documents",
            "actions_hint": "Source facet Enforcement Actions only. Market Conduct Actions and CCRC Reports are separate grains. A document is not a unique matter. Name-only attachment is unsafe.",
            "current_value": "Search only",
            "current_label": "Agency / producer bulk roster",
            "current_hint": "Licensed Business Entity and Licensed Individual Search require a name, city, or license number. Search-only is not zero. License information current as of Wednesday, September 16, 2026.",
            "geography_value": "Pennsylvania",
            "as_of_value": "2026-09-14",
            "as_of_label": "company information current as of",
        },
        "company_lookup": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "count": EXPECTED_LETTER_ROWS,
            "distinct_naic": EXPECTED_NAIC,
            "pa_domicile_distinct_naic": EXPECTED_PA_DOMICILE,
            "source_as_of": "2026-09-14",
            "retrieved_at": companies["retrievedAt"],
            "weekly_refresh_note": companies["weeklyRefreshNote"],
            "weekly_cadence_is_not_source_as_of": True,
            "search_only_is_not_zero": True,
            "not_derived_from_orders": True,
            "not_derived_from_complaints": True,
            "not_derived_from_exams": True,
            "not_derived_from_liquidation": True,
            "not_surplus_lines": True,
            "identity_namespace": "NAIC 5-digit",
            "power_counts": {
                "Accident and Health": powers["Accident and Health"],
                "Life and Annuities": powers["Life and Annuities"],
                "Auto Liability": powers["Auto Liability"],
                "Property and Allied Lines": powers["Property and Allied Lines"],
                "Workers Compensation": powers["Workers Compensation"],
                "HMO Authority": powers["HMO Authority"],
                "Title": powers["Title"],
            },
            "property_and_allied_lines_is_not_homeowners": True,
            "auto_liability_is_not_consumer_auto_product": True,
            "line_is_not_consumer_product_unless_proven": True,
        },
        "producer_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "distinct_npns": None,
            "source_as_of": "2026-09-16",
            "search_only_is_not_zero": True,
            "individual_is_not_agency": True,
            "npn_is_not_pa_license_number_unless_source_says_so": True,
            "npn_is_not_insurer_certificate": True,
            "source": "https://apps02.ins.pa.gov/producer/ilist1.asp",
        },
        "agency_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "distinct_ids": None,
            "source_as_of": "2026-09-16",
            "search_only_is_not_zero": True,
            "agency_is_not_insurer": True,
            "agency_is_not_producer": True,
            "source": "https://apps02.ins.pa.gov/producer/alist1.asp",
        },
        "appointments": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "license_is_not_appointment": True,
        },
        "surplus_lines": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "count": EXPECTED_SURPLUS,
            "distinct_naic": EXPECTED_SURPLUS,
            "retrieved_at": surplus["retrievedAt"],
            "surplus_is_not_admitted_company": True,
            "source": "https://www.pid.pa.gov/dsf/slasearch.html",
        },
        "enforcement": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "source": "https://www.pa.gov/agencies/insurance/resources/consumer-resources/enforcement-actions-search",
            "retrieved_at": enf["retrievedAt"],
            "document_rows": EXPECTED_ENFORCEMENT_DOCS,
            "enforcement_actions": EXPECTED_ENFORCEMENT_ACTIONS,
            "market_conduct_actions": EXPECTED_MARKET_CONDUCT,
            "ccrc_reports": EXPECTED_CCRC,
            "unique_titles": enf["uniqueTitles"],
            "unique_uris": enf["uniqueUris"],
            "unique_matters": None,
            "naic_populated": 0,
            "docket_populated": 0,
            "name_only": True,
            "document_is_not_matter": True,
            "enforcement_is_not_complaint": True,
            "enforcement_is_not_exam": True,
            "ccrc_is_not_company_enforcement": True,
        },
        "complaints": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "year": 2025,
            "source": complaints["officialUrl"],
            "retrieved_at": complaints["retrievedAt"],
            "row_total": EXPECTED_COMPLAINT_ROWS,
            "distinct_names": EXPECTED_COMPLAINT_NAMES,
            "sum_complaints": EXPECTED_COMPLAINT_SUM,
            "line_rows": complaints["line_rows_2025"],
            "line_total_complaints": complaints["line_total_complaints_2025"],
            "denominator": complaints["denominator"],
            "index_label": complaints["index_label"],
            "index_is_not_trust_score": True,
            "complaint_is_not_violation": True,
            "complaint_is_not_enforcement": True,
            "complaint_is_not_finding": True,
            "name_only": True,
            "not_sorted_best_to_worst": True,
        },
        "market_conduct": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "document_rows": EXPECTED_MARKET_CONDUCT,
            "distinct_insurers": None,
            "exam_is_not_discipline": True,
            "exam_is_not_enforcement_action": True,
            "name_only": True,
            "source": "https://www.pa.gov/agencies/insurance/resources/consumer-resources/enforcement-actions-search",
            "facet": "Market Conduct Actions",
        },
        "financial_exams": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "document_rows": EXPECTED_FINANCIAL,
            "unique_titles": fin["uniqueTitles"],
            "distinct_insurers": None,
            "naic_populated": 0,
            "financial_exam_is_not_market_conduct": True,
            "exam_is_not_enforcement": True,
            "name_only": True,
            "source": "https://www.pa.gov/agencies/insurance/posted-filings-reports-company-orders/posted-reports/financial-examination-reports.html",
            "retrieved_at": fin["retrievedAt"],
        },
        "liquidation": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "document_rows": EXPECTED_LIQ,
            "unique_titles": liq["uniqueTitles"],
            "statuses": liq["statuses"],
            "liquidation_is_not_current_census": True,
            "rehab_is_not_liquidation": True,
            "discharge_is_not_current_license": True,
            "name_only": True,
            "source": "https://www.pa.gov/agencies/insurance/resources/consumer-resources/liquidated-rehabilitated-discharged-insurance-companies",
            "retrieved_at": liq["retrievedAt"],
        },
        "specialized_classes": {
            "ccrc": {
                "coverage": "PUBLIC_RESEARCH_PATH",
                "enforcement_hub_reports": EXPECTED_CCRC,
                "not_licensed_company": True,
                "source": "https://www.pid.pa.gov/dsf/ccfsearch.html",
            },
            "tpa": {"coverage": "PUBLIC_RESEARCH_PATH", "source": "https://www.pid.pa.gov/dsf/tpasearch.html"},
            "premium_finance": {"coverage": "PUBLIC_RESEARCH_PATH", "source": "https://www.pid.pa.gov/dsf/pfasearch.html"},
            "qualified_unlicensed_reinsurers": {"coverage": "PUBLIC_RESEARCH_PATH", "source": "https://www.pid.pa.gov/dsf/qursearch.html"},
            "risk_retention_groups": {"coverage": "PUBLIC_RESEARCH_PATH", "source": "https://www.pid.pa.gov/dsf/rrsearch.html"},
            "risk_purchasing_groups": {"coverage": "PUBLIC_RESEARCH_PATH", "source": "https://www.pid.pa.gov/dsf/rpsearch.html"},
            "viatical_settlements": {"coverage": "PUBLIC_RESEARCH_PATH", "source": "https://www.pid.pa.gov/dsf/vspsearch.html"},
        },
        "identity": {
            "preferred_producer": "NPN when source-native",
            "preferred_insurer": "NAIC number when source-native",
            "pa_license_is_not_npn": True,
            "naic_is_not_npn": True,
            "company_is_not_agency": True,
            "person_is_not_agency": True,
            "appointment_is_not_license": True,
            "name_only": "UNSAFE",
        },
        "enforcement_attachment": {
            "EXACT_COMPANY_ENFORCEMENT_ASSOCIATIONS": 0,
            "EXACT_PRODUCER_ENFORCEMENT_ASSOCIATIONS": 0,
            "EXACT_COMPANY_COMPLAINT_ASSOCIATIONS": 0,
            "EXACT_COMPANY_EXAM_BRIDGES": 0,
            "REVIEW_REQUIRED_ASSOCIATIONS": 0,
            "REJECTED_NAME_ONLY_ASSOCIATIONS": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "research_association_is_not_profile_attachment": True,
        },
        "claim_eligibility": {"broadened": False},
        "expansion_ledger": {
            "PA_LICENSED_COMPANY_LETTER_ROWS": EXPECTED_LETTER_ROWS,
            "PA_LICENSED_COMPANY_DISTINCT_NAIC": EXPECTED_NAIC,
            "PA_PA_DOMICILE_DISTINCT_NAIC": EXPECTED_PA_DOMICILE,
            "PA_COMPANY_LOOKUP_COVERAGE": "ACQUIRED_CURRENT_SNAPSHOT",
            "PA_AGENCY_ROSTER": "OPEN_SEARCH_ONLY",
            "PA_AGENCY_ROWS": None,
            "PA_PRODUCER_ROSTER": "OPEN_SEARCH_ONLY",
            "PA_PRODUCER_ROWS": None,
            "PA_PRODUCER_DISTINCT_NPNS": None,
            "PA_SURPLUS_LINES_DISTINCT_NAIC": EXPECTED_SURPLUS,
            "PA_COMPLAINT_DATA_COVERAGE": "ACQUIRED_CURRENT_SNAPSHOT",
            "PA_COMPLAINT_ROWS": EXPECTED_COMPLAINT_ROWS,
            "PA_COMPLAINT_DISTINCT_NAMES": EXPECTED_COMPLAINT_NAMES,
            "PA_ENFORCEMENT_ACTION_DOCUMENTS": EXPECTED_ENFORCEMENT_ACTIONS,
            "PA_MARKET_CONDUCT_ACTION_DOCUMENTS": EXPECTED_MARKET_CONDUCT,
            "PA_CCRC_REPORTS": EXPECTED_CCRC,
            "PA_FINANCIAL_EXAM_DOCUMENTS": EXPECTED_FINANCIAL,
            "PA_LIQUIDATION_CATALOG_DOCUMENTS": EXPECTED_LIQ,
            "PA_UNIQUE_REGULATORY_MATTERS": None,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "EXACT_COMPANY_EXAM_BRIDGES": 0,
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
        print("pa snapshot check ok", current["fingerprint"])
        return
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print("wrote", ART, "fingerprint", fp)


if __name__ == "__main__":
    main()
