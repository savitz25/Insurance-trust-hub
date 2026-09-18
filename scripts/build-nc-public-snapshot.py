#!/usr/bin/env python3
"""NC-INS-001 freeze. Frontend artifact only. No graph writes."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/north-carolina/nc-ins-001"
ART = ROOT / "lib/north-carolina-intelligence/accepted-snapshot.json"
GENERATION_KEYS = frozenset({"generated_at", "fingerprint"})

# Frozen harvest contracts (must match committed summaries / txt extracts).
EXPECTED_ACTION_ROWS = 2874
EXPECTED_ACTION_DOCKETS = 404
EXPECTED_ACTION_NPN = 2398
EXPECTED_PRODUCER_ACTIONS = 1717
EXPECTED_BE_ACTIONS = 255
EXPECTED_ADJUSTER_ACTIONS = 72
EXPECTED_MARKET_EXAMS = 138
EXPECTED_MARKET_EXAM_TITLES = 137
EXPECTED_FIN_EXAMS = 158
EXPECTED_HOMEOWNERS_ROWS = 199
EXPECTED_FEDERAL_FLOOD_ROWS = 25
EXPECTED_PRIVATE_FLOOD_ROWS = 125
EXPECTED_PPA_ROWS = 190
EXPECTED_COMM_AUTO_ROWS = 510
EXPECTED_WC_ROWS = 423
EXPECTED_MS_FILES = 102


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(obj: object) -> str:
    return hashlib.sha256(dumps(obj).encode("utf-8")).hexdigest()


def semantic(obj: dict) -> dict:
    return {k: v for k, v in obj.items() if k not in GENERATION_KEYS}


def parse_line(path: Path, pattern: str) -> tuple[int, int]:
    text = path.read_text(encoding="utf-8")
    codes = re.findall(pattern, text)
    return len(codes), len(set(codes))


def build_body(generated_at: str) -> dict:
    actions = json.loads((DATA / "licensing-actions-summary.json").read_text(encoding="utf-8"))
    market = json.loads((DATA / "market-exams.json").read_text(encoding="utf-8"))["summary"]
    financial = json.loads((DATA / "financial-exams.json").read_text(encoding="utf-8"))["summary"]
    ms_index = json.loads((DATA / "market-share-2025-index.json").read_text(encoding="utf-8"))
    pdf = DATA / "pdf"
    ho_rows, ho_naic = parse_line(pdf / "homeowners.txt", r"2025\s+\d+\.\s+Homeowners multiple peril\s+(\d{5})\s+[A-Z]")
    ff_rows, ff_naic = parse_line(pdf / "federal_flood.txt", r"2025\s+[\d.]+\s+Federal flood\s+(\d{5})\s+[A-Z]")
    pf_rows, pf_naic = parse_line(pdf / "private_flood.txt", r"2025\s+[\d.]+\s+Private flood\s+(\d{5})\s+[A-Z]")
    ppa_rows, ppa_naic = parse_line(pdf / "ppa.txt", r"2025\s+(\d{5})\s+[A-Z]")
    ca_rows, ca_naic = parse_line(pdf / "comm_auto.txt", r"2025\s+(\d{5})\s+[A-Z]")
    wc_rows, wc_naic = parse_line(pdf / "wc.txt", r"2025\s+[\d.]+\s+Workers. Compensation\s+(\d{5})\s+[A-Z]")
    if wc_rows == 0:
        wc_rows, wc_naic = parse_line(pdf / "wc.txt", r"2025\s+\d+\.\s+[A-Za-z][^0-9]{0,70}?(\d{5})\s+[A-Z]")
    if actions["document_rows"] != EXPECTED_ACTION_ROWS:
        raise SystemExit(f"action rows {actions['document_rows']}")
    if actions["distinct_dockets"] != EXPECTED_ACTION_DOCKETS:
        raise SystemExit("dockets")
    if actions["exact_npn_rows"] != EXPECTED_ACTION_NPN:
        raise SystemExit("npn rows")
    if actions["producer_rows"] != EXPECTED_PRODUCER_ACTIONS:
        raise SystemExit("producer actions")
    if actions["business_entity_rows"] != EXPECTED_BE_ACTIONS:
        raise SystemExit("be actions")
    if actions["adjuster_rows"] != EXPECTED_ADJUSTER_ACTIONS:
        raise SystemExit("adjuster actions")
    if market["report_rows"] != EXPECTED_MARKET_EXAMS:
        raise SystemExit("market exams")
    if market["distinct_titles"] != EXPECTED_MARKET_EXAM_TITLES:
        raise SystemExit("market titles")
    if financial["report_rows"] != EXPECTED_FIN_EXAMS:
        raise SystemExit("financial exams")
    if ho_rows != EXPECTED_HOMEOWNERS_ROWS:
        raise SystemExit(f"homeowners rows {ho_rows}")
    if ff_rows != EXPECTED_FEDERAL_FLOOD_ROWS:
        raise SystemExit(f"federal flood {ff_rows}")
    if pf_rows != EXPECTED_PRIVATE_FLOOD_ROWS:
        raise SystemExit(f"private flood {pf_rows}")
    if ppa_rows != EXPECTED_PPA_ROWS:
        raise SystemExit(f"ppa {ppa_rows}")
    if ca_rows != EXPECTED_COMM_AUTO_ROWS:
        raise SystemExit(f"comm auto {ca_rows}")
    if wc_rows != EXPECTED_WC_ROWS:
        raise SystemExit(f"wc {wc_rows}")
    if len(ms_index["files"]) != EXPECTED_MS_FILES:
        raise SystemExit("market share files")
    retrieved = actions["retrieved_at"]
    return {
        "version": "insurance-nc-state-intel-v1",
        "ticket": "NC-INS-001",
        "as_of": "2026-09-18",
        "source_as_of": "2026-09-18",
        "source_as_of_state": "KNOWN",
        "retrieved_at": retrieved,
        "generated_at": generated_at,
        "snapshot_as_of": "2026-09-18",
        "source_clock": "NCDOI Licensing Actions catalog retrieved 2026-09-18T03:20:41Z (116 pages). Market Regulation and Financial Examination indexes retrieved the same clock. 2025 market-share report family index (102 files) and key-line PDFs for homeowners, federal flood, private flood, private-passenger auto, commercial auto, and workers compensation. Receivership estate index retrieved 2026-09-18. Agency/producer/company bulk rosters remain live SBS lookup. generatedAt is excluded from the semantic fingerprint.",
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_north_carolina_local_pages": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/north-carolina",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/north-carolina",
            "h1": "North Carolina Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "North Carolina Department of Insurance",
            "short": "NCDOI",
            "url": "https://www.ncdoi.gov/",
            "company_licensing": "https://www.ncdoi.gov/licensees/company-licensing-and-registration",
            "sbs_lookup": "https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NC",
            "business_entity_licensing": "https://www.ncdoi.gov/licensees/insurance-business-entity-licensing/obtain-insurance-business-license",
            "licensing_actions": "https://www.ncdoi.gov/licaction",
            "market_exams": "https://www.ncdoi.gov/market-regulation-examination-report",
            "financial_exams": "https://www.ncdoi.gov/financial-examination-report",
            "receiverships": "https://www.ncdoi.gov/insurance-industry/receiverships",
            "market_share": "https://www.ncdoi.gov/insurance-industry/financial-analysis/insurance-company-market-share-and-premium-information",
            "surplus_lines": "https://www.ncdoi.gov/licensees/company-licensing-and-registration/surplus-lines-insurers",
            "surplus_lines_lookup": "https://external-lookup-web.prod.naic.org/",
            "complaints": "https://www.ncdoi.gov/how-can-we-help-you",
        },
        "hero": {
            "universe_value": 2874,
            "universe_label": "NCDOI Licensing Action catalog rows",
            "universe_hint": "Mixed license-class catalog. Not a producer census, not complaints, not a unique-matter count. A row is not a unique docket. Bail-bond and collection-agency rows are not insurance-producer discipline.",
            "actions_value": 1717,
            "actions_label": "Insurance Producer licensing-action rows",
            "actions_hint": "Source-native license type Insurance Producer. Business Entity, Public Adjuster, Company/Independent Firm Adjuster, bail-bond, and collection-agency rows are separate.",
            "current_value": "Search only",
            "current_label": "Licensed company / agency / producer bulk roster",
            "current_hint": "NCDOI/SBS licensee lookup is live search. No complete free public statewide roster was acquired. Search-only is not zero.",
            "geography_value": "North Carolina",
            "as_of_value": "2026-09-18",
            "as_of_label": "catalog retrieved",
        },
        "company_lookup": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "count": None,
            "distinct_naic": None,
            "rows_missing_naic": None,
            "nc_domicile_distinct_naic": None,
            "source_as_of": None,
            "retrieved_at": retrieved,
            "search_only_is_not_zero": True,
            "not_derived_from_market_share": True,
            "not_derived_from_exams": True,
            "not_derived_from_receivership": True,
            "not_surplus_lines": True,
            "identity_namespace": "NAIC Company Code when source-native",
            "source": "https://www.ncdoi.gov/licensees/company-licensing-and-registration",
        },
        "domestic_insurers": {
            "coverage": "MARKET_SHARE_P6_PC_ACTIVITY_NOT_CENSUS",
            "count": None,
            "distinct_naic": None,
            "pc_market_share_2025_distinct_naic": 49,
            "note": "2025 P&C domestics market-share PDF is North Carolina-domiciled P&C market activity, not the complete licensed domestic-company census and not all lines.",
        },
        "producer_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "distinct_npns": None,
            "distinct_license_ids": None,
            "source_as_of": None,
            "search_only_is_not_zero": True,
            "individual_is_not_agency": True,
            "npn_is_not_nc_license_number_unless_source_says_so": True,
            "npn_is_not_naic": True,
            "source": "https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NC",
        },
        "agency_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "distinct_ids": None,
            "distinct_npns": None,
            "source_as_of": None,
            "search_only_is_not_zero": True,
            "agency_is_not_insurer": True,
            "agency_is_not_producer": True,
            "business_entity_license_has_no_line_of_authority": True,
            "drlp_is_not_full_producer_roster": True,
            "existing_phase13_fixture_is_not_statewide_census": True,
            "source": "https://www.ncdoi.gov/licensees/insurance-business-entity-licensing/obtain-insurance-business-license",
        },
        "existing_nc_agency_corpus": {
            "rows": 11,
            "distinct_identities": 10,
            "identity_type": "fixture license_number + NPN in scripts/nc/fixtures/nc-agencies-sample.csv",
            "source": "Phase 13 launch-market fixture (not SBS bulk export)",
            "source_as_of": None,
            "public_profiles": "launch-market directory pipeline; not this state-intel census",
            "not_complete_statewide_licensure": True,
        },
        "surplus_lines": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "count": None,
            "distinct_naic": None,
            "rows_missing_naic": None,
            "retrieved_at": retrieved,
            "surplus_is_not_admitted_company": True,
            "surplus_insurer_is_not_surplus_lines_business_entity": True,
            "alien_iid_list_is_separate": True,
            "source": "https://www.ncdoi.gov/licensees/company-licensing-and-registration/surplus-lines-insurers",
            "lookup": "https://external-lookup-web.prod.naic.org/",
        },
        "market_share": {
            "coverage": "ACQUIRED_2025_REPORT_FAMILY_AND_KEY_LINES",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "year": 2025,
            "report_files": 102,
            "company_line_rows_complete_family": None,
            "distinct_naic_complete_family": None,
            "distinct_line_files": 102,
            "rows_missing_naic": 0,
            "homeowners_multiple_peril_rows": ho_rows,
            "homeowners_distinct_naic": ho_naic,
            "federal_flood_rows": ff_rows,
            "federal_flood_distinct_naic": ff_naic,
            "private_flood_rows": pf_rows,
            "private_flood_distinct_naic": pf_naic,
            "private_passenger_auto_company_rows": ppa_rows,
            "private_passenger_auto_distinct_naic": ppa_naic,
            "commercial_auto_company_rows": ca_rows,
            "commercial_auto_distinct_naic": ca_naic,
            "workers_compensation_rows": wc_rows,
            "workers_compensation_distinct_naic": wc_naic,
            "premium_is_not_authorization": True,
            "market_share_is_not_quality": True,
            "company_line_is_not_agency_product": True,
            "do_not_sum_incompatible_lines": True,
            "source": "https://www.ncdoi.gov/insurance-industry/financial-analysis/insurance-company-market-share-and-premium-information",
            "retrieved_at": retrieved,
        },
        "licensing_actions": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "source": "https://www.ncdoi.gov/licaction",
            "retrieved_at": retrieved,
            "catalog_status": "ACQUIRED_CURRENT_SNAPSHOT",
            "document_rows": 2874,
            "distinct_dockets": 404,
            "unique_matters": None,
            "producer_rows": 1717,
            "business_entity_rows": 255,
            "adjuster_rows": 72,
            "other_rows": 830,
            "exact_npn_rows": 2398,
            "rows_without_exact_id": 444,
            "exact_profile_attachments": 0,
            "review_required": 0,
            "by_class": actions["by_class"],
            "document_is_not_matter": True,
            "producer_action_is_not_agency_action": True,
            "agency_action_is_not_insurer_action": True,
            "adjuster_action_is_not_producer_action": True,
            "collection_agency_is_not_insurance_agency": True,
            "bail_bond_is_not_insurance_producer": True,
            "voluntary_surrender_is_not_conviction": True,
            "fine_is_not_revocation": True,
            "order_is_not_complaint": True,
            "licensing_action_is_not_complaint": True,
            "name_only_unsafe": True,
        },
        "complaints": {
            "coverage": "INTAKE_AVAILABLE / BULK_NOT_PUBLIC",
            "classification": "SEARCH_ONLY",
            "count": None,
            "search_only_is_not_zero": True,
            "intake_is_not_census": True,
            "exam_complaint_templates_are_not_public_census": True,
            "mcas_is_not_trust_score": True,
            "source": "https://www.ncdoi.gov/how-can-we-help-you",
        },
        "market_conduct": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "document_rows": 138,
            "distinct_titles": 137,
            "distinct_companies": None,
            "exact_naic_attachments": 0,
            "exam_is_not_complaint": True,
            "exam_is_not_licensing_action": True,
            "exam_finding_is_not_conviction": True,
            "exam_completed_is_not_fine": True,
            "name_only": True,
            "source": "https://www.ncdoi.gov/market-regulation-examination-report",
            "retrieved_at": retrieved,
        },
        "financial_exams": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "document_rows": 158,
            "distinct_titles": 158,
            "distinct_companies": None,
            "exact_naic_attachments": 0,
            "financial_exam_is_not_market_conduct": True,
            "exam_is_not_enforcement": True,
            "exam_is_not_complaint": True,
            "exam_existence_is_not_insolvency": True,
            "name_only": True,
            "source": "https://www.ncdoi.gov/financial-examination-report",
            "retrieved_at": retrieved,
        },
        "receiverships": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "named_current_estates": 6,
            "accordion_groups": 3,
            "liquidation_entities": 4,
            "rehabilitation_entities": 1,
            "receivership_status_entities": 1,
            "admin_supervision_entities": 0,
            "document_hrefs": 126,
            "exact_naic_attachments": 0,
            "estates": [
                {"name": "Friday Health Plans of North Carolina, Inc.", "status": "receivership"},
                {"name": "Southland National Insurance Corporation", "status": "liquidation"},
                {"name": "Colorado Bankers Life Insurance Company", "status": "liquidation"},
                {"name": "Bankers Life Insurance Company", "status": "liquidation"},
                {"name": "Southland National Reinsurance Corporation", "status": "rehabilitation"},
                {"name": "North Carolina Mutual Life Insurance Company", "status": "liquidation"},
            ],
            "rehabilitation_is_not_liquidation": True,
            "liquidation_is_not_admin_supervision": True,
            "historic_receivership_is_not_current_authorization": True,
            "name_only_unsafe": True,
            "source": "https://www.ncdoi.gov/insurance-industry/receiverships",
            "retrieved_at": retrieved,
        },
        "identity": {
            "preferred_insurer": "NAIC Company Code when source-native",
            "preferred_agency": "NPN or NCDOI business-entity license number when source-native",
            "preferred_producer": "NPN when source-native",
            "nc_license_is_not_npn_unless_source_equates": True,
            "naic_is_not_npn": True,
            "company_is_not_agency": True,
            "person_is_not_agency": True,
            "name_only": "UNSAFE",
        },
        "attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "EXACT_MARKET_SHARE_NAIC_BRIDGES": 0,
            "EXACT_MARKET_EXAM_NAIC_ATTACHMENTS": 0,
            "EXACT_FINANCIAL_EXAM_NAIC_ATTACHMENTS": 0,
            "EXACT_RECEIVERSHIP_NAIC_ATTACHMENTS": 0,
            "REVIEW_REQUIRED": 0,
            "research_association_is_not_profile_attachment": True,
        },
        "claim_eligibility": {"broadened": False},
        "expansion_ledger": {
            "NC_LICENSED_COMPANY_ROSTER_STATUS": "OPEN_SEARCH_ONLY",
            "NC_LICENSED_COMPANY_ROWS": None,
            "NC_LICENSED_COMPANY_DISTINCT_NAIC_CODES": None,
            "NC_DOMESTIC_INSURER_ROWS": None,
            "NC_DOMESTIC_INSURER_DISTINCT_NAIC_CODES": None,
            "NC_AGENCY_ROSTER_STATUS": "OPEN_SEARCH_ONLY",
            "NC_AGENCY_ROWS": None,
            "NC_AGENCY_DISTINCT_LICENSE_IDS": None,
            "NC_AGENCY_DISTINCT_NPNS": None,
            "NC_PRODUCER_ROSTER_STATUS": "OPEN_SEARCH_ONLY",
            "NC_PRODUCER_ROWS": None,
            "NC_PRODUCER_DISTINCT_LICENSE_IDS": None,
            "NC_PRODUCER_DISTINCT_NPNS": None,
            "NC_SURPLUS_LINES_ROSTER_STATUS": "OPEN_SEARCH_ONLY",
            "NC_SURPLUS_LINES_ROWS": None,
            "NC_SURPLUS_LINES_DISTINCT_NAIC_CODES": None,
            "NC_MARKET_SHARE_YEAR": 2025,
            "NC_MARKET_SHARE_REPORT_FILES": 102,
            "NC_MARKET_SHARE_COMPANY_LINE_ROWS": None,
            "NC_HOMEOWNERS_MARKET_ROWS": ho_rows,
            "NC_FEDERAL_FLOOD_MARKET_ROWS": ff_rows,
            "NC_PRIVATE_FLOOD_MARKET_ROWS": pf_rows,
            "NC_PRIVATE_PASSENGER_AUTO_MARKET_ROWS": ppa_rows,
            "NC_COMMERCIAL_AUTO_MARKET_ROWS": ca_rows,
            "NC_WORKERS_COMP_MARKET_ROWS": wc_rows,
            "NC_LICENSING_ACTION_ROWS": 2874,
            "NC_LICENSING_ACTION_UNIQUE_MATTERS": None,
            "NC_LICENSING_ACTION_DISTINCT_DOCKETS": 404,
            "NC_MARKET_EXAM_REPORT_ROWS": 138,
            "NC_FINANCIAL_EXAM_REPORT_ROWS": 158,
            "NC_RECEIVERSHIP_NAMED_ESTATES": 6,
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
    if args.check:
        current = json.loads(ART.read_text(encoding="utf-8"))
        if sha(semantic(current)) != current["fingerprint"]:
            raise SystemExit("stored fingerprint drifted")
        expected = sha(semantic({**body, "generated_at": current["generated_at"]}))
        # Compare semantic without generated_at
        if sha(semantic(current)) != sha(semantic(body)):
            raise SystemExit("semantic snapshot drifted")
        print("nc-ins-001 snapshot check pass", current["fingerprint"][:12])
        return
    body["fingerprint"] = sha(semantic(body))
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print("wrote", ART, body["fingerprint"])


if __name__ == "__main__":
    main()
