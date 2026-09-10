#!/usr/bin/env python3
"""VA-INS-001 — public snapshot from acquired SCC tables + 2025 statistical-report PDFs."""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "va-ins-001"
LIB = ROOT / "lib" / "virginia-intelligence"
LIB.mkdir(parents=True, exist_ok=True)
SPINE = ROOT / "data" / "reports" / "ins-insurer-006-identity-index.json"
RAW = ART / "raw.json"

VERSION = "insurance-va-state-intel-v1"


def sha(obj: object) -> str:
    body = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def parse_companies(text: str, category: str) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    for match in re.finditer(r"(?<![0-9])(\d{5})\s+([A-Za-z][^\n]{1,90})", text):
        prev = text[max(0, match.start() - 40) : match.start()].lower()
        if "number of companies" in prev:
            continue
        rest = match.group(2)
        if re.match(r"^(totals|number)\b", rest, re.I):
            continue
        name = re.split(r"\s{2,}|\s+[\d$,(\-]", rest)[0].strip(" .,-")
        if len(name) < 3:
            continue
        naic = match.group(1)
        if naic in seen:
            continue
        seen.add(naic)
        rows.append({"naic": naic, "company": name, "category": category})
    return rows


def load_spine() -> set[str]:
    data = json.loads(SPINE.read_text(encoding="utf-8"))
    return {str(row["naic_cocode"]).zfill(5) for row in data["insurers"]}


def xwalk(naics: list[str], spine: set[str]) -> dict:
    distinct = sorted({n for n in naics if re.fullmatch(r"\d{5}", n)})
    matched = [n for n in distinct if n in spine]
    unmatched = [n for n in distinct if n not in spine]
    return {
        "SOURCE_DISTINCT_NAIC": len(distinct),
        "EXACT_EXISTING_LEGAL_INSURER_MATCHES": len(matched),
        "UNMATCHED_NAIC": len(unmatched),
        "unmatched_naic": unmatched,
        "read_only": True,
        "graph_write": False,
        "exact_match_is_not_enrichment": True,
        "exact_match_is_not_profile_attachment": True,
    }


def main() -> int:
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    spine = load_spine()
    if len(spine) != 6185:
        raise SystemExit(f"spine {len(spine)} != 6185")

    companies: list[dict] = []
    by_cat: dict[str, int] = {}
    for name in [
        "health",
        "life",
        "pc",
        "title",
        "burial",
        "legal_service",
        "lgsip",
        "mutual_lt10m",
        "mutual_gt10m",
    ]:
        text = (ART / f"{name}.txt").read_text(encoding="utf-8")
        rows = parse_companies(text, name)
        by_cat[name] = len(rows)
        companies.extend(rows)

    # Distinct NAIC across categories (a company can appear in one class).
    distinct_map: dict[str, dict] = {}
    for row in companies:
        distinct_map.setdefault(row["naic"], row)
    distinct = list(distinct_map.values())

    actions = raw["actions"]
    market = raw["market_conduct"]
    exams = raw["financial_exams"]
    action_cases = sorted({row["case"] for row in actions if row.get("case")})
    action_naics = [row["naic"] for row in actions]
    mc_naics = [row["naic"] for row in market]
    exam_naics = [row["naic"] for row in exams if row.get("naic")]

    stat_x = xwalk([row["naic"] for row in distinct], spine)
    act_x = xwalk(action_naics, spine)
    mc_x = xwalk(mc_naics, spine)
    ex_x = xwalk(exam_naics, spine)

    snapshot = {
        "version": VERSION,
        "ticket": "VA-INS-001",
        "as_of": None,
        "source_as_of": None,
        "source_as_of_state": "UNKNOWN",
        "period_end": "2025-12-31",
        "reported_as_of": "2026-06-01",
        "retrieved_at": raw["retrieved_at"],
        "generated_at": raw["retrieved_at"],
        "snapshot_as_of": raw["retrieved_at"][:10],
        "source_clock": (
            "Virginia SCC 2025 Insurance Company Statistical Report: year ended 2025-12-31, "
            "data reported as of 2026-06-01. Regulatory Actions and Market Conduct tables retrieved "
            f"{raw['retrieved_at'][:10]}. Retrieval is not current authorization."
        ),
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_virginia_county_pages": True,
        "no_richmond_route": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/virginia",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/virginia",
            "h1": "Virginia Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "Virginia State Corporation Commission Bureau of Insurance",
            "short": "SCC BOI",
            "url": "https://www.scc.virginia.gov/regulated-industries/companies/",
            "financial_reporting": "https://www.scc.virginia.gov/regulated-industries/companies/for-insurance-companies/company-financial-reporting/",
            "regulatory_actions": "https://www.scc.virginia.gov/regulated-industries/companies/for-insurance-companies/regulatory-actions/",
            "market_conduct": "https://www.scc.virginia.gov/regulated-industries/companies/for-insurance-companies/market-conduct-examination-reports/",
            "company_search": "https://www.scc.virginia.gov/pages/Look-Up-a-Company",
        },
        "hero": {
            "universe_value": len(distinct),
            "universe_label": "2025 statistical-report company observations (distinct NAIC)",
            "universe_hint": "Company-level rows from 2025 financial-data PDFs. Year ended 2025-12-31, reported as of 2026-06-01. Not a September 2026 live authorized-insurer roster.",
            "actions_value": len(actions),
            "actions_label": "Regulatory Action company observations",
            "actions_hint": "Bounded official table. Observation rows are not unique cases and not unique insurers.",
            "exams_value": len(market),
            "exams_label": "Market Conduct Examination observations",
            "exams_hint": "Bounded official table. An examination is not a finding of wrongdoing.",
            "geography_value": "Virginia",
            "as_of_value": "2025-12-31",
            "as_of_label": "statistical-report period end",
        },
        "statistical_report": {
            "period_end": "2025-12-31",
            "reported_as_of": "2026-06-01",
            "landing": "https://www.scc.virginia.gov/regulated-industries/companies/for-insurance-companies/company-financial-reporting/",
            "not_current_authorization": True,
            "premium_is_not_quality": True,
            "row_is_not_claimable_profile": True,
            "observation_rows": len(companies),
            "distinct_naic": len(distinct),
            "by_category": by_cat,
            "categories_acquired": [
                "health",
                "life",
                "property_casualty",
                "title",
                "burial",
                "legal_service",
                "local_government_self_insurance",
                "mutual_assessment",
            ],
            "workers_comp_group_self_insurance": "NON_NAIC_LICENSE_NUMBERS / NOT_IN_NAIC_UNIVERSE",
            "caveat": "Dated 2025 financial-data company observations. Not current authorization. Categories are not added into one quality ranking.",
        },
        "current_company_verification": {
            "coverage": "OPEN_SEARCH_ONLY",
            "url": "https://www.scc.virginia.gov/pages/Look-Up-a-Company",
            "bulk_acquired": False,
            "count": None,
            "caveat": "Current SCC company search is a live verification path. The 2025 statistical report is not current authorization. Search-only is not zero.",
        },
        "regulatory_actions": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "url": "https://www.scc.virginia.gov/regulated-industries/companies/for-insurance-companies/regulatory-actions/",
            "observation_rows": len(actions),
            "distinct_cases": len(action_cases),
            "distinct_naic": act_x["SOURCE_DISTINCT_NAIC"],
            "action_is_not_conviction": True,
            "case_is_not_violation_count": True,
            "row_is_not_unique_insurer": True,
            "row_is_not_claimable_profile": True,
            "did_not_crawl_case_pdfs": True,
        },
        "market_conduct": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "url": "https://www.scc.virginia.gov/regulated-industries/companies/for-insurance-companies/market-conduct-examination-reports/",
            "observation_rows": len(market),
            "distinct_naic": mc_x["SOURCE_DISTINCT_NAIC"],
            "examination_is_not_violation": True,
            "examination_is_not_enforcement_order": True,
            "row_is_not_claimable_profile": True,
            "did_not_crawl_exam_pdfs": True,
        },
        "financial_exams": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "decision": "GRABBED — EASY SECONDARY",
            "listing_rows": len(exams),
            "distinct_naic": ex_x["SOURCE_DISTINCT_NAIC"],
            "non_naic_source_codes": sum(1 for row in exams if not row.get("naic")),
            "examination_is_not_market_conduct": True,
            "did_not_crawl_exam_pdfs": True,
        },
        "producer_roster": {"count": None, "coverage": "OPEN_SEARCH_ONLY"},
        "agency_roster": {"count": None, "coverage": "OPEN_SEARCH_ONLY"},
        "complaints": {
            "coverage": "PUBLIC_RESEARCH_PATH / SOURCE_NOT_ACQUIRED",
            "count": None,
            "complaint_is_not_violation": True,
            "complaint_ratio_is_not_trusthub_score": True,
        },
        "surplus_lines": {
            "coverage": "SOURCE_NOT_ACQUIRED",
            "count": None,
            "surplus_is_not_admitted": True,
        },
        "identity": {
            "bar": "EXACT_NAIC_ONLY",
            "name_only": "UNSAFE",
            "read_only_naic_match_is_not_enrichment": True,
            "company_is_not_agency": True,
            "company_is_not_producer": True,
            "naic_is_not_npn": True,
        },
        "naic_crosswalk": {
            "CROSSWALK_STATUS": "EXECUTED",
            "spine_source": "data/reports/ins-insurer-006-identity-index.json",
            "spine_legal_insurers": 6185,
            "read_only": True,
            "graph_write": False,
            "statistical_report": stat_x,
            "regulatory_actions": act_x,
            "market_conduct": mc_x,
            "financial_exams": ex_x,
        },
        "profile_attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "graph_write": False,
            "note": "Read-only exact NAIC comparison. Exact identity match is not a graph enrichment write and is not a public profile attachment.",
        },
        "claim_eligibility": {"broadened": False},
        "expansion_ledger": {
            "NEW_VA_MARKET_OBSERVATION_ROWS": len(companies),
            "NEW_VA_DISTINCT_STAT_REPORT_NAIC_IDS": len(distinct),
            "NEW_VA_REGULATORY_ACTION_ROWS": len(actions),
            "NEW_VA_REGULATORY_ACTION_CASES": len(action_cases),
            "NEW_VA_MARKET_CONDUCT_ROWS": len(market),
            "NEW_VA_MARKET_CONDUCT_DISTINCT_NAIC_IDS": mc_x["SOURCE_DISTINCT_NAIC"],
            "NEW_VA_SURPLUS_ROWS": 0,
            "EXACT_NAIC_CROSSWALKS": stat_x["EXACT_EXISTING_LEGAL_INSURER_MATCHES"]
            + act_x["EXACT_EXISTING_LEGAL_INSURER_MATCHES"]
            + mc_x["EXACT_EXISTING_LEGAL_INSURER_MATCHES"],
            "UNMATCHED_NAIC_IDS": stat_x["UNMATCHED_NAIC"] + act_x["UNMATCHED_NAIC"] + mc_x["UNMATCHED_NAIC"],
            "NET_NEW_CANONICAL_LEGAL_INSURERS": 0,
            "NET_NEW_CANONICAL_AGENCIES": 0,
            "NET_NEW_CANONICAL_PERSONS": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "PRE_INGEST_CANONICAL_LEGAL_INSURERS": 6185,
        },
        "juice_squeeze": [
            {
                "source": "2025 Insurance Company Statistical Report financial-data PDFs",
                "decision": "GRABBED — HIGH YIELD",
                "note": "Company-level COCODE observations from Health/Life/P&C/Title/Burial/Legal/Mutual/LGSIP gen PDFs.",
            },
            {
                "source": "SCC Regulatory Actions table",
                "decision": "GRABBED — HIGH YIELD",
                "note": "Bounded HTML table with NAIC, type, order date, case file. Case PDFs not crawled.",
            },
            {
                "source": "SCC Market Conduct Examination Reports table",
                "decision": "GRABBED — HIGH YIELD",
                "note": "Bounded HTML table with NAIC, type, order date. Exam PDFs not crawled.",
            },
            {
                "source": "SCC domestic financial examination listing",
                "decision": "GRABBED — EASY SECONDARY",
                "note": "Same financial-reporting page table. PDF reports not crawled.",
            },
            {
                "source": "Line-of-business premium-profile PDFs (PC_prem etc.)",
                "decision": "LEFT — TOO MUCH WORK FOR CURRENT YIELD",
                "note": "Company-level financial-data PDFs already give the NAIC universe. Premium-line archaeology not required.",
            },
            {
                "source": "Current SCC company search",
                "decision": "LEFT — SEARCH ONLY",
                "note": "No bounded bulk export. Statistical report is not current authorization.",
            },
            {
                "source": "Agent / Agency / Navigator search",
                "decision": "LEFT — SEARCH ONLY",
                "note": "No bulk roster. Producer != agency != legal insurer.",
            },
            {
                "source": "Complaint ratio / case documents",
                "decision": "LEFT — SEARCH ONLY",
                "note": "No clean statewide complaint-ratio table in this ticket.",
            },
            {
                "source": "Surplus-lines eligible list",
                "decision": "LEFT — SEARCH ONLY",
                "note": "No straightforward current dated list found on the financial-reporting page.",
            },
            {
                "source": "Regulatory/market-conduct case PDFs",
                "decision": "LEFT — TOO MUCH WORK FOR CURRENT YIELD",
                "note": "Table metadata is enough.",
            },
            {
                "source": "FOIA / paid SBS-Sircon",
                "decision": "LEFT — REQUEST ONLY",
                "note": "Not requested.",
            },
            {
                "source": "Virginia city/county pages",
                "decision": "LEFT — LOCAL / FUTURE",
                "note": "Statewide only.",
            },
        ],
        "no_combined_denominator": True,
        "unknown_is_not_zero": True,
    }
    snapshot["fingerprint"] = sha({k: v for k, v in snapshot.items() if k != "fingerprint"})
    (LIB / "accepted-snapshot.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    (ART / "accepted-snapshot.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print("fingerprint", snapshot["fingerprint"])
    print("distinct naic", len(distinct), "obs", len(companies), by_cat)
    print("actions", len(actions), "cases", len(action_cases), act_x)
    print("mc", len(market), mc_x)
    print("stat xwalk", stat_x["EXACT_EXISTING_LEGAL_INSURER_MATCHES"], "unmatched", stat_x["UNMATCHED_NAIC"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
