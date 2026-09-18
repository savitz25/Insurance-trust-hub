#!/usr/bin/env python3
"""OH-INS-001 freeze. Frontend artifact only. No graph writes."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/ohio/oh-ins-001"
ART = ROOT / "lib/ohio-intelligence/accepted-snapshot.json"
GENERATION_KEYS = frozenset({"generated_at", "generatedAt", "fingerprint"})

EXPECTED_AUTH_ROWS = 1738
EXPECTED_AUTH_NAIC = 1738
EXPECTED_DOMESTIC = 237
EXPECTED_BE_RESIDENT = 5648
EXPECTED_BE_NONRESIDENT = 18274
EXPECTED_BE_UNION = 23922
EXPECTED_LIFE_UNION = 16306
EXPECTED_AH_UNION = 16132
EXPECTED_JOURNAL_ROWS = 496
EXPECTED_JOURNAL_ORDERS = 383
EXPECTED_JOURNAL_NOTICES = 113
EXPECTED_JOURNAL_PERSON = 425
EXPECTED_JOURNAL_COMPANY_NAME = 68
EXPECTED_JOURNAL_EXACT_ID = 487


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(obj: object) -> str:
    return hashlib.sha256(dumps(obj).encode("utf-8")).hexdigest()


def strip_generation(obj: object) -> object:
    if isinstance(obj, dict):
        return {
            k: strip_generation(v)
            for k, v in obj.items()
            if k not in GENERATION_KEYS and not (k == "generatedAt" or k.endswith("generatedAt"))
        }
    if isinstance(obj, list):
        return [strip_generation(v) for v in obj]
    return obj


def build_body(generated_at: str) -> dict:
    auth = json.loads((DATA / "authorized-summary.json").read_text(encoding="utf-8"))
    unions = json.loads((DATA / "final-acquisition.json").read_text(encoding="utf-8"))
    journal = unions["journal"]
    u = unions["unions"]
    a = auth["authList"]
    if a["OH_AUTHORIZED_COMPANY_ROWS"] != EXPECTED_AUTH_ROWS:
        raise SystemExit(f"auth rows {a['OH_AUTHORIZED_COMPANY_ROWS']}")
    if a["OH_AUTHORIZED_DISTINCT_NAIC_CODES"] != EXPECTED_AUTH_NAIC:
        raise SystemExit("auth naic")
    if a["OH_DOMESTIC_DISTINCT_NAIC_CODES"] != EXPECTED_DOMESTIC:
        raise SystemExit("domestic")
    if u["major_lines_be_union_npn"] != EXPECTED_BE_UNION:
        raise SystemExit("be union")
    if u["life_be_union_npn"] != EXPECTED_LIFE_UNION:
        raise SystemExit("life union")
    if u["ah_be_union_npn"] != EXPECTED_AH_UNION:
        raise SystemExit("ah union")
    if journal["OH_ODI_ADMIN_ACTION_ROWS"] != EXPECTED_JOURNAL_ROWS:
        raise SystemExit("journal rows")
    retrieved = a["retrievedAt"] if "retrievedAt" not in auth else auth["retrievedAt"]
    return {
        "version": "insurance-oh-state-intel-v1",
        "ticket": "OH-INS-001",
        "as_of": "2026-09-18",
        "source_as_of": "2026-09-18",
        "source_as_of_state": "KNOWN",
        "retrieved_at": retrieved,
        "generated_at": generated_at,
        "snapshot_as_of": "2026-09-18",
        "source_clock": (
            "ODI complete authorized-company Excel AuthList091820261205.xls retrieved "
            f"{retrieved}. Business-entity Major Lines mailing-list CSVs retrieved 2026-09-18 "
            "(resident/non-resident; LOA is the report filter, not an export column). "
            "Administrative Actions Journal bounded metadata catalog for UI past-12-months "
            "window 2025-10-01 through 2026-09-18 retrieved 2026-09-18T16:13:26Z. "
            "Journal search results may not be comprehensive and exclude most agent CE "
            "noncompliance. Annual financial bulk Excel was not acquired. generatedAt is "
            "excluded from the semantic fingerprint."
        ),
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_ohio_local_intelligence_routes": True,
        "existing_phase10_city_hubs_are_not_this_census": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/ohio",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/ohio",
            "h1": "Ohio Insurance Licensing & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "Ohio Department of Insurance",
            "short": "ODI",
            "url": "https://insurance.ohio.gov/",
            "company_search": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/",
            "auth_list": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=AuthList",
            "mailing_list": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc",
            "agent_locator": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/AgentSearch.mvc/DisplaySearch",
            "journal": "https://gateway.insurance.ohio.gov/UI/ODI.AdministrativeAction.Public.UI/",
            "certified_reinsurers": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=CertifiedReinsurersXLS",
        },
        "hero": {
            "universe_value": EXPECTED_AUTH_NAIC,
            "universe_label": "Distinct NAIC codes on ODI's complete current authorized-company list",
            "universe_hint": "AuthList Excel is the complete current authorized legal-insurer universe. Authorized is not domestic. A NAIC code is not an NPN. This is not agencies and not agents.",
            "actions_value": EXPECTED_JOURNAL_ROWS,
            "actions_label": "ODI Administrative Actions Journal documents (past 12 months, bounded)",
            "actions_hint": "Source warns search results may not be comprehensive and exclude most agent CE noncompliance. A document is not a unique matter. Not a complete adverse census.",
            "current_value": EXPECTED_BE_UNION,
            "current_label": "Major Lines business-entity NPNs (resident + non-resident mailing lists)",
            "current_hint": "Official mailing-list generator, Business Entity + Major Lines, all source LOA filters, residence types Resident and Non-Resident (overlap 0). Not agents. Not every ODI license type. LOA is the report filter, not an export column.",
            "geography_value": "Ohio",
            "as_of_value": "2026-09-18",
            "as_of_label": "authorized-company file / mailing-list reports",
        },
        "authorized_companies": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "complete_current_authorized_universe": True,
            "rows": EXPECTED_AUTH_ROWS,
            "distinct_naic": EXPECTED_AUTH_NAIC,
            "rows_missing_naic": 0,
            "duplicate_naic_rows": 0,
            "types": {"PC": 1069, "LIFE": 498, "FR": 45, "HIC": 45, "TI": 33, "RE": 26, "MPP": 11, "MEWA": 10, "CUSG": 1},
            "source_as_of": "2026-09-18",
            "source_filename": "AuthList091820261205.xls",
            "retrieved_at": retrieved,
            "authorized_is_not_domestic": True,
            "naic_is_not_npn": True,
            "company_is_not_agency": True,
            "financial_is_not_authorization": True,
            "source": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=AuthList",
        },
        "domestic_insurers": {
            "coverage": "DERIVED_FROM_AUTHLIST_DOMICILE_OH",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "rows": EXPECTED_DOMESTIC,
            "distinct_naic": EXPECTED_DOMESTIC,
            "note": "AuthList domicile = OH. Domestic is a subset of authorized, not a second universe and not a quality rank.",
        },
        "agency_roster": {
            "coverage": "ACQUIRED_MAJOR_LINES_BUSINESS_ENTITY_MAILING_LIST",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "license_type": "Major Lines",
            "entity_type": "Business Entity",
            "loa_is_report_filter_not_export_column": True,
            "resident_distinct_npn": EXPECTED_BE_RESIDENT,
            "nonresident_distinct_npn": EXPECTED_BE_NONRESIDENT,
            "certified_distinct_npn": 0,
            "union_distinct_npn": EXPECTED_BE_UNION,
            "residence_overlap_npn": 0,
            "source_as_of": "2026-09-18",
            "agency_is_not_insurer": True,
            "agency_is_not_producer": True,
            "not_all_odi_license_types": True,
            "existing_phase10_city_hubs_are_not_statewide_census": True,
            "source": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc",
        },
        "producer_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "complete_census_published": False,
            "locator_requires_captcha": True,
            "mailing_list_generator_available": True,
            "bounded_resident_major_lines_life_npn_acquired_not_published": 51972,
            "search_only_is_not_zero": True,
            "individual_is_not_agency": True,
            "npn_is_not_ohio_license_number_unless_source_says_so": True,
            "npn_is_not_naic": True,
            "source": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/AgentSearch.mvc/DisplaySearch",
        },
        "line_of_authority": {
            "coverage": "SOURCE_NATIVE_MAILING_LIST_FILTER",
            "export_includes_loa_column": False,
            "no_homeowners_loa": True,
            "no_auto_loa": True,
            "auto_rental_is_not_auto": True,
            "property_casualty_personal_do_not_prove_homeowners_or_auto_inventory": True,
            "life": {
                "loa": "Life",
                "status": "KNOWN_LICENSING_AUTHORITY",
                "resident_distinct_npn": 5102,
                "nonresident_distinct_npn": 11204,
                "union_distinct_npn": EXPECTED_LIFE_UNION,
            },
            "accident_and_health": {
                "loa": "Accident & Health",
                "status": "KNOWN_LICENSING_AUTHORITY",
                "resident_distinct_npn": 4910,
                "nonresident_distinct_npn": 11222,
                "union_distinct_npn": EXPECTED_AH_UNION,
            },
            "property_resident_distinct_npn": 3599,
            "casualty_resident_distinct_npn": 3621,
            "personal_resident_distinct_npn": 1219,
            "licensing_authority_is_not_product_inventory": True,
        },
        "consumer_product_loa": {
            "homeowners": {
                "status": "UNSUPPORTED",
                "reason": "ODI mailing-list Line of Authority options have no Homeowners LOA. Property, Casualty, and Personal authority do not prove an agency currently sells homeowners insurance.",
            },
            "auto": {
                "status": "UNSUPPORTED",
                "reason": "ODI mailing-list Line of Authority options have no Auto LOA. Auto Rental is a different limited line.",
            },
            "life": {
                "status": "KNOWN_LICENSING_AUTHORITY",
                "loa": "Life",
                "note": "Business Entity + Major Lines + Life filter. Licensing authority is not current product inventory.",
            },
            "health": {
                "status": "KNOWN_LICENSING_AUTHORITY",
                "loa": "Accident & Health",
                "note": "Business Entity + Major Lines + Accident & Health filter. Licensing authority is not current product inventory.",
            },
            "flood": {
                "status": "UNSUPPORTED",
                "reason": "No Flood LOA appears in the official mailing-list Line of Authority options.",
            },
        },
        "journal": {
            "coverage": "BOUNDED_METADATA_CATALOG_INCOMPLETE_RETRIEVAL_WARNED",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "status": "BOUNDED_METADATA_CATALOG_INCOMPLETE_RETRIEVAL_WARNED",
            "window": "2025-10-01 through 2026-09-18",
            "document_rows": EXPECTED_JOURNAL_ROWS,
            "distinct_document_ids": EXPECTED_JOURNAL_ROWS,
            "unique_matters": None,
            "orders": EXPECTED_JOURNAL_ORDERS,
            "notices": EXPECTED_JOURNAL_NOTICES,
            "person_name_only_rows": EXPECTED_JOURNAL_PERSON,
            "company_name_only_rows": EXPECTED_JOURNAL_COMPANY_NAME,
            "person_and_company_name_rows": 3,
            "exact_id_rows": EXPECTED_JOURNAL_EXACT_ID,
            "agency_action_rows": None,
            "company_action_rows": None,
            "exact_profile_attachments": 0,
            "completeness_warning_required": True,
            "ce_noncompliance_excluded": True,
            "documents_before_2026_04_24_directly_viewable": True,
            "later_documents_require_email_request": True,
            "document_is_not_matter": True,
            "journal_is_not_complete_adverse_census": True,
            "order_is_not_notice": True,
            "name_only_unsafe": True,
            "agency_vs_company_unsplit": True,
            "source": "https://gateway.insurance.ohio.gov/UI/ODI.AdministrativeAction.Public.UI/",
            "retrieved_at": "2026-09-18T16:13:26Z",
        },
        "financial_data": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "year": None,
            "rows": None,
            "distinct_companies": None,
            "distinct_naic": None,
            "rows_missing_naic": None,
            "bulk_excel_acquired": False,
            "per_company_statement_pdfs_exist_on_legacy_frannuals": True,
            "financial_is_not_authorization": True,
            "financial_rank_is_not_quality": True,
            "search_only_is_not_zero": True,
        },
        "complaints": {
            "coverage": "INTAKE_AVAILABLE / BULK_NOT_PUBLIC",
            "classification": "SEARCH_ONLY",
            "intake_is_not_census": True,
            "complaint_is_not_finding": True,
            "search_only_is_not_zero": True,
        },
        "market_conduct": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "document_rows": None,
            "exam_is_not_journal_action": True,
            "exam_is_not_complaint": True,
            "search_only_is_not_zero": True,
        },
        "financial_exams": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "document_rows": None,
            "financial_exam_is_not_market_conduct": True,
            "exam_existence_is_not_insolvency": True,
            "search_only_is_not_zero": True,
        },
        "receiverships": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "named_current_estates": None,
            "liquidation_is_not_rehabilitation": True,
            "historic_estate_is_not_current_authorization": True,
            "search_only_is_not_zero": True,
        },
        "surplus_lines": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "SEARCH_ONLY",
            "surplus_is_not_admitted_authorized": True,
            "surplus_agent_is_not_insurer": True,
            "certified_reinsurers_xls_rows": 19,
            "certified_reinsurers_are_not_surplus_lines_eligible_list": True,
            "certified_reinsurers_naic_absent": True,
            "search_only_is_not_zero": True,
        },
        "identity": {
            "preferred_insurer": "NAIC Company Code when source-native",
            "preferred_agency": "NPN when source-native on the mailing-list export",
            "preferred_producer": "NPN when source-native",
            "ohio_license_is_not_npn_unless_source_equates": True,
            "naic_is_not_npn": True,
            "company_is_not_agency": True,
            "person_is_not_agency": True,
            "name_only": "UNSAFE",
        },
        "attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "REVIEW_REQUIRED": 0,
            "research_association_is_not_profile_attachment": True,
        },
        "claim_eligibility": {"broadened": False},
        "expansion_ledger": {
            "OH_AUTHORIZED_COMPANY_ROWS": EXPECTED_AUTH_ROWS,
            "OH_AUTHORIZED_DISTINCT_NAIC_CODES": EXPECTED_AUTH_NAIC,
            "OH_AUTHORIZED_ROWS_MISSING_NAIC": 0,
            "OH_DOMESTIC_COMPANY_ROWS": EXPECTED_DOMESTIC,
            "OH_DOMESTIC_DISTINCT_NAIC_CODES": EXPECTED_DOMESTIC,
            "OH_MAJOR_LINES_BE_RESIDENT_NPN": EXPECTED_BE_RESIDENT,
            "OH_MAJOR_LINES_BE_NONRESIDENT_NPN": EXPECTED_BE_NONRESIDENT,
            "OH_MAJOR_LINES_BE_UNION_NPN": EXPECTED_BE_UNION,
            "OH_LIFE_BE_UNION_NPN": EXPECTED_LIFE_UNION,
            "OH_AH_BE_UNION_NPN": EXPECTED_AH_UNION,
            "OH_ODI_JOURNAL_STATUS": "BOUNDED_METADATA_CATALOG_INCOMPLETE_RETRIEVAL_WARNED",
            "OH_ODI_ADMIN_ACTION_ROWS": EXPECTED_JOURNAL_ROWS,
            "OH_ODI_ADMIN_ACTION_DISTINCT_DOCUMENT_IDS": EXPECTED_JOURNAL_ROWS,
            "OH_ODI_ADMIN_ACTION_UNIQUE_MATTERS": None,
            "OH_ODI_AGENT_ACTION_ROWS": EXPECTED_JOURNAL_PERSON,
            "OH_ODI_AGENCY_ACTION_ROWS": None,
            "OH_ODI_COMPANY_ACTION_ROWS": None,
            "OH_ODI_OTHER_ACTION_ROWS": 0,
            "OH_ODI_EXACT_ID_ROWS": EXPECTED_JOURNAL_EXACT_ID,
            "OH_ODI_EXACT_PROFILE_ATTACHMENTS": 0,
            "OH_FINANCIAL_DATA_YEAR": None,
            "OH_FINANCIAL_DATA_ROWS": None,
            "OH_FINANCIAL_DATA_DISTINCT_COMPANIES": None,
            "OH_FINANCIAL_DATA_DISTINCT_NAIC_CODES": None,
            "OH_FINANCIAL_DATA_ROWS_MISSING_NAIC": None,
            "NET_NEW_STATE_RESEARCH_IDENTITIES": 0,
            "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
            "NET_NEW_PUBLIC_INSURANCE_PROFILES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "GRAPH_WRITES": 0,
            "CLAIM_ELIGIBILITY_BROADENED": False,
        },
        "adverse_ledger": {
            "ADVERSE_SOURCES_FOUND": ["ODI Administrative Actions Journal"],
            "ADVERSE_SOURCES_ACQUIRED": ["ODI Administrative Actions Journal (bounded 12-month metadata)"],
            "ADVERSE_ROWS_ACQUIRED": None,
            "UNIQUE_REGULATORY_MATTERS": None,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "REVIEW_REQUIRED": 0,
            "UNRESOLVED": 0,
            "INTERNAL_ONLY": 0,
            "PUBLICATION_PENDING": 0,
            "PUBLIC_READY_PROFILES": 0,
            "PUBLICLY_RENDERED_PROFILES": 0,
            "BUSINESS_RESPONSE_READY": 0,
            "SEARCH_SUPPORTED": True,
            "REMAINING_ADVERSE_GAPS": [
                "Journal incompleteness warning",
                "CE noncompliance excluded",
                "Complaints intake-only",
                "Exam catalogs search-only",
                "Receivership catalog search-only",
            ],
            "WITHHELD_REASON_COUNTS": {},
            "do_not_sum_journal_complaints_exams_receivership": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if args.check and ART.exists():
        existing = json.loads(ART.read_text(encoding="utf-8"))
        generated_at = existing.get("generated_at") or generated_at
    body = build_body(generated_at)
    body["fingerprint"] = sha(strip_generation(body))
    serialized = json.dumps(body, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        current = ART.read_text(encoding="utf-8")
        if current.replace("\r\n", "\n") != serialized.replace("\r\n", "\n"):
            # Allow generated_at drift on --check by comparing semantic hash only.
            cur = json.loads(current)
            if cur.get("fingerprint") != body["fingerprint"] or sha(strip_generation(cur)) != body["fingerprint"]:
                raise SystemExit("Ohio snapshot drifted")
        print("oh snapshot check pass", body["fingerprint"])
        return
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_text(serialized, encoding="utf-8")
    print(body["fingerprint"])


if __name__ == "__main__":
    main()
