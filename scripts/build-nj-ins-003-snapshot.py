#!/usr/bin/env python3
"""NJ-INS-003 — build the public New Jersey insurance snapshot from audited 001/002 artifacts.

Does not scrape. Does not republish CRIB rows. Does not invent enrollment totals
that are absent from committed summaries. Missing evidence blocks that metric.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUM001 = json.loads((ROOT / "data/reports/nj-ins-001-summary.json").read_text(encoding="utf-8"))
SUM002 = json.loads((ROOT / "data/reports/nj-ins-002-summary.json").read_text(encoding="utf-8"))
OUT_DIR = ROOT / "lib" / "new-jersey-intelligence"
REPORTS = ROOT / "data" / "reports"


def dump(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def fingerprint(obj: dict) -> str:
    body = {k: v for k, v in obj.items() if k != "fingerprint"}
    return hashlib.sha256(dump(body).encode("utf-8")).hexdigest()


def coverage_rows() -> list[dict]:
    rows = []
    for row in SUM001.get("coverage") or []:
        rows.append(
            {
                "family": row["family"],
                "year": row.get("year"),
                "coverage_state": row["coverage_state"],
                "url": row.get("url"),
            }
        )
    for row in SUM002.get("coverage") or []:
        rows.append(
            {
                "family": row["family"],
                "year": None,
                "coverage_state": row["coverage_state"],
                "url": row.get("url"),
                "years": row.get("years"),
            }
        )
    rows.append(
        {
            "family": "NJ_DOBI_CARRIER_AUTHORIZATION",
            "year": None,
            "coverage_state": "ACQUIRED_CURRENT_SNAPSHOT",
            "url": "https://www.nj.gov/dobi/data/inscomp.htm",
        }
    )
    rows.append(
        {
            "family": "NJ_DOBI_SURPLUS_LINES_ELIGIBLE",
            "year": None,
            "coverage_state": "SOURCE_NOT_ACQUIRED",
            "url": "https://www.nj.gov/dobi/data/sl_whitelist260720.pdf",
            "notes": "Official surplus-lines eligible list exists. It was not ingested as a public census. Missing is not zero eligible companies.",
        }
    )
    rows.append(
        {
            "family": "NJ_DOBI_MARKET_CONDUCT_EXAMINATION",
            "year": None,
            "coverage_state": "ACQUIRED_CURRENT_SNAPSHOT",
            "url": "https://www.nj.gov/dobi/division_consumers/insurance/marketconductexams.htm",
        }
    )
    rows.append(
        {
            "family": "NJ_DOBI_FINANCIAL_EXAMINATION",
            "year": None,
            "coverage_state": "ACQUIRED_CURRENT_SNAPSHOT",
            "url": "https://www.nj.gov/dobi/division_insurance/finexam_reports.htm",
        }
    )
    rows.append(
        {
            "family": "NJ_DOBI_AUTO_COMPLAINT",
            "year": None,
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY",
            "url": "https://www.nj.gov/dobi/division_consumers/insurance/auto.htm",
            "years": [2023, 2024],
        }
    )
    rows.append(
        {
            "family": "NJ_DOBI_REHABILITATION_LIQUIDATION",
            "year": None,
            "coverage_state": "ACQUIRED_CURRENT_SNAPSHOT",
            "url": "https://www.nj.gov/dobi/division_insurance/finesolv.htm",
        }
    )
    rows.append(
        {
            "family": "NJ_IHC_RATE_CHANGE",
            "year": None,
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY",
            "url": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/index.html",
            "years": SUM002["ihc"]["rate_change_years"],
        }
    )
    rows.append(
        {
            "family": "NJ_SEH_RATE_CHANGE",
            "year": None,
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY",
            "url": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/index.html",
            "years": SUM002["seh"]["rate_change_years"],
        }
    )
    rows.append(
        {
            "family": "NJ_GET_COVERED_PARTICIPATION",
            "year": None,
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY",
            "url": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/index.html",
            "years": SUM002["get_covered"]["plan_years"],
            "notes": "Participation is taken from official IHC asterisk markers, not the Get Covered NJ marketing homepage.",
        }
    )
    return rows


def build() -> dict:
    e = SUM001["enforcement"]
    acq = SUM001["acquisition"]
    ident = SUM001["identity"]
    carriers = SUM001["carriers"]
    mc = SUM001["market_conduct"]
    fin = SUM001["financial_exams"]
    auto = SUM001["auto_complaints"]
    rehab = SUM001["rehab"]
    ihc = SUM002["ihc"]
    seh = SUM002["seh"]
    gcnj = SUM002["get_covered"]
    crib = SUM002["crib"]
    serff = SUM002["serff"]

    doi_2008 = next(
        r
        for r in SUM001["coverage"]
        if r["family"] == "NJ_DOBI_DOI_ENFORCEMENT" and r.get("year") == 2008
    )

    snapshot = {
        "ticket": "NJ-INS-003",
        "version": "insurance-nj-state-intel-v1",
        "generated_at": SUM001["generated_at"],
        "as_of": "2026-09-02",
        "source_as_of": {
            "nj_ins_001": SUM001["generated_at"],
            "nj_ins_002": SUM002["generated_at"],
        },
        "publication": {
            "route": "/new-jersey",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/new-jersey",
            "sitemap": True,
            "county_routes": False,
            "rankings": False,
            "trust_scores": False,
            "complaint_leaderboard": False,
            "public_person_expansion": False,
            "crib_republication": False,
            "existing_nj_agency_hubs_preserved": True,
            "florida_canonical_unchanged": True,
        },
        "hero": {
            "universe_value": carriers["source_rows"],
            "universe_label": "admitted legal insurers with exact NAIC",
            "universe_hint": "NJDOBI Licensed Insurance Carriers census. Admitted is not surplus-lines eligible. This is not a count of companies serving every New Jersey consumer.",
            "current_value": e["events"],
            "current_label": "enforcement events",
            "current_hint": "Index events in the acquired DOI + BFD corpus. Not every action ever issued. Missing years are not zero.",
            "observations_value": acq["document_links"],
            "observations_label": "document links",
            "observations_hint": "Document-link grain. Not unique hashes and not unique orders.",
            "geography_value": "statewide",
            "geography_label": "New Jersey",
            "geography_hint": "Statewide official sources. This page does not create county routes or infer service area from domicile.",
            "as_of_value": "2026-09-02",
            "as_of_label": "snapshot date",
            "as_of_hint": "As-of is the audited artifact date, not a live database clock.",
        },
        "findings": [
            {
                "id": "admitted-census",
                "text": (
                    f"NJDOBI's licensed-carrier census in the acquired snapshot lists "
                    f"{carriers['source_rows']:,} admitted legal insurers, each with an exact NAIC company code. "
                    "That census is not a surplus-lines eligible list and is not a count of companies serving every New Jersey consumer."
                ),
            },
            {
                "id": "enforcement-grains",
                "text": (
                    f"The acquired NJDOBI enforcement corpus contains {e['events']:,} events and "
                    f"{e['unique_orders']:,} unique orders. Those grains are not interchangeable with "
                    f"{acq['document_links']:,} document links or {acq['unique_hashes']:,} unique hashes."
                ),
            },
            {
                "id": "health-residual-coverage",
                "text": "Individual Health Coverage and Small Employer Health are separate programs. Get Covered NJ participation is an official asterisk observation, not an endorsement. Residual-market programs (NJIUA/FAIR, PAIP, SAIP, CAIP) are not voluntary insurers.",
            },
            {
                "id": "blocked-restricted",
                "text": "SERFF Filing Access returned HTTP 403, so this page does not report a filing count. NJCRIB Plan Risk was acquired under terms that forbid redistribution and database supplementation, so employer/producer/carrier rows are withheld.",
            },
        ],
        "authorization": {
            "admitted": carriers["source_rows"],
            "exact_naic": carriers["exact_naic"],
            "classes": carriers["classes"],
            "surplus_lines_eligible": None,
            "surplus_lines_coverage_state": "SOURCE_NOT_ACQUIRED",
            "surplus_lines_url": "https://www.nj.gov/dobi/data/sl_whitelist260720.pdf",
            "source_url": "https://www.nj.gov/dobi/data/inscomp.htm",
            "grain": "legal_entity",
            "license_is_not_appointment": True,
            "group_is_not_company": True,
            "admitted_is_not_surplus": True,
            "producer_is_not_insurer": True,
            "caveat": "Admitted-insurer rows are legal entities with NAIC company codes. They are not appointments, not producer licenses, and not surplus-lines eligible companies. A missing surplus-lines census is not zero eligible companies.",
        },
        "enforcement": {
            "evidence_rows_note": "Ticket expected ~4,055 evidence rows. Public counts use the audited 001/001C grains below rather than an invented combined total.",
            "events": e["events"],
            "unique_orders": e["unique_orders"],
            "class_counts": e["class_counts"],
            "status_counts": e["status_counts"],
            "penalties": e["penalties"],
            "restitution": e["restitution"],
            "fraud_surcharge": e["fraud_surcharge"],
            "multi_party": e["multi_party"],
            "action_class_counts": e["action_class_counts"],
            "classification_method_counts": e["classification_method_counts"],
            "bfd": e["bfd"],
            "respondents": SUM001["respondents"],
            "identity": ident,
            "index_occurrence_is_not_event": True,
            "event_is_not_document": True,
            "document_is_not_hash": True,
            "instrument_is_not_sanction": True,
            "absence_is_not_clean_history": True,
            "individual_not_copied_to_agency": True,
            "unresolved_not_profile_attached": True,
            "no_enforcement_ranking": True,
            "doi_2008_coverage_state": doi_2008["coverage_state"],
            "doi_2008_url": doi_2008["url"],
            "source_url_doi": "https://www.nj.gov/dobi/division_insurance/insfines26.htm",
            "source_url_bfd": "https://www.nj.gov/dobi/division_insurance/bfd/enforcement.htm",
            "caveat": "An enforcement event is not a document. A consent order is an instrument, not a quality score. Bureau of Fraud Deterrence consent records are classified from official page headings. Unresolved and individual respondents are not attached to public profiles. Missing 2008 DOI pages are SOURCE_NOT_ACQUIRED, not zero actions.",
        },
        "document_depth": {
            "document_links": acq["document_links"],
            "available_hash_verified": acq["status_counts"]["EXISTING_HASH_VERIFIED"],
            "unavailable": acq["unavailable"],
            "index_only": acq["index_only"],
            "unique_hashes": acq["unique_hashes"],
            "duplicate_content_groups": acq["duplicate_content_groups"],
            "text_extracted": acq["text_extracted"],
            "image_only": acq["image_only"],
            "other_extraction_failures": acq["other_extraction_failures"],
            "status_counts": acq["status_counts"],
            "occurrence_vs_canonical": acq["occurrence_vs_canonical"],
            "caveat": "Index-only rows are not missing-as-zero documents. Image-only PDFs were not bulk-OCR’d.",
        },
        "market_conduct": {
            "reports": mc["reports"],
            "exact_naic": 0,
            "name_only_unresolved": mc["name_only_unresolved"],
            "multi_entity_review": mc["multi_entity_review"],
            "converted_to_enforcement": mc["converted_to_enforcement"],
            "exam_score": None,
            "withheld_from_profiles": True,
            "source_url": "https://www.nj.gov/dobi/division_consumers/insurance/marketconductexams.htm",
            "caveat": "A market-conduct examination is not an enforcement action and is not a financial examination. Name-only and multi-entity reports stay unresolved or review-required. They are not attached to public insurer profiles. No exam score is published.",
        },
        "financial_exams": {
            "reports": fin["reports"],
            "exact_naic": fin["exact_naic"],
            "unresolved": fin["unresolved"],
            "converted_to_enforcement": fin["converted_to_enforcement"],
            "exam_score": None,
            "source_url": "https://www.nj.gov/dobi/division_insurance/finexam_reports.htm",
            "caveat": "A financial examination may attach only on an exact NAIC match to an already-published legal-insurer profile. It is not a solvency rating, not enforcement, and not a market-conduct report. Unresolved identities are withheld.",
        },
        "auto_complaints": {
            "rows": auto["rows"],
            "years": auto["years"],
            "group_grain_rows": auto["group_grain_rows"],
            "company_grain_rows": auto["company_grain_rows"],
            "leaderboard_created": auto["leaderboard_created"],
            "copied_to_legal_entities": auto["copied_to_legal_entities"],
            "eligibility_threshold_vehicles": 10000,
            "methodology": "Official auto consumer information report: valid complaints per 1,000 insured autos; index 1.00 = average. Ratios are for companies or groups with at least 10,000 insured autos.",
            "complaint_is_not_violation": True,
            "valid_complaint_is_not_all_complaints": True,
            "group_is_not_copied_to_subsidiary": True,
            "no_complaint_ranking": True,
            "source_url": "https://www.nj.gov/dobi/division_consumers/insurance/auto.htm",
            "caveat": "A valid complaint is not a violation. A group row stays at group grain and is not copied onto a legal subsidiary. Incomplete historical years are not a finding of zero complaints.",
        },
        "ihc": {
            "program": "Individual Health Coverage",
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY",
            "latest_period": "2026 Q1",
            "latest_period_grain": "official enrollment-index quarter; covered-lives totals are not in the committed public snapshot",
            "rate_change_years": ihc["rate_change_years"],
            "rate_change_observations": ihc["rate_change_observations"],
            "carriers": ihc["carriers"],
            "marketplace_asterisk_carriers": ihc["marketplace_asterisk_carriers"],
            "off_marketplace_enrollment_rows": ihc["off_marketplace_enrollment_rows"],
            "plan_counts": ihc["plan_counts"],
            "exact_naic": ihc["exact_naic"],
            "review_required": ihc["review_required"],
            "unresolved": ihc["unresolved"],
            "enrollment_total": None,
            "missing_quarter_is_not_zero": True,
            "average_rate_change_is_not_consumer_premium": True,
            "ihc_is_not_seh": True,
            "source_url": "https://www.nj.gov/dobi/division_insurance/ihcseh/ihcsehenroll.html",
            "rate_source_url": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/index.html",
            "caveat": "IHC is not SEH. An official average rate change is not every consumer’s premium. Brand-grain carrier names are not NAIC legal entities. Missing quarters are not zero enrollment.",
        },
        "seh": {
            "program": "Small Employer Health",
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY",
            "latest_period": "2026 Q1",
            "rate_change_years": seh["rate_change_years"],
            "carriers": seh["carriers"],
            "loss_ratio_years": seh["loss_ratio_years"],
            "loss_ratio_rows": seh["loss_ratio_rows"],
            "exact_naic": seh["exact_naic"],
            "enrollment_total": None,
            "loss_ratio_is_not_score": True,
            "ihc_is_not_seh": True,
            "source_url": "https://www.nj.gov/dobi/division_insurance/ihcseh/ihcsehenroll.html",
            "caveat": "SEH is not IHC. Statutory loss ratio is not a quality score and is not federal MLR. Brand-grain names are not NAIC legal entities.",
        },
        "get_covered": {
            "plan_years": gcnj["plan_years"],
            "participating": gcnj["participating"],
            "not_asterisked_ihc_writers": gcnj["not_asterisked_ihc_writers"],
            "marketplace_is_not_endorsement": True,
            "source": "Official IHC average-rate-change asterisk, not the Get Covered NJ marketing homepage",
            "source_url": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/index.html",
            "caveat": "Marketplace participation is not an endorsement, ranking, or proof of current enrollment.",
        },
        "residuals": {
            "programs": [
                {
                    "code": "NJIUA_FAIR",
                    "name": "New Jersey Insurance Underwriting Association (FAIR Plan)",
                    "not_a_voluntary_insurer": True,
                    "not_a_legal_carrier": True,
                    "not_a_quality_flag": True,
                },
                {
                    "code": "PAIP",
                    "name": "New Jersey Personal Auto Insurance Plan (PAIP)",
                    "oversees": "SAIP",
                    "not_a_voluntary_insurer": True,
                    "not_caip": True,
                    "not_a_quality_flag": True,
                },
                {
                    "code": "SAIP",
                    "name": "Special Automobile Insurance Plan (SAIP)",
                    "separate_from": "PAIP",
                    "not_a_carrier": True,
                    "not_a_quality_flag": True,
                    "source_note": "Official PAIP narrative states PAIP oversees SAIP. No dedicated SAIP program page was published on the residual-market index.",
                },
                {
                    "code": "CAIP",
                    "name": "New Jersey Commercial Automobile Insurance Plan (CAIP)",
                    "separate_from": "PAIP",
                    "not_a_voluntary_insurer": True,
                    "not_a_quality_flag": True,
                },
            ],
            "ranking": False,
            "source_url": "https://www.nj.gov/dobi/division_insurance/propcas.htm",
            "caveat": "Residual placement is not a quality or wrongdoing flag. NJIUA is not a voluntary insurer. PAIP is not CAIP. SAIP is not an insurer.",
        },
        "crib": {
            "access_classification": crib["access"]["access_classification"],
            "coverage_state": crib["access"]["coverage_state"],
            "publication_allowed": False,
            "redistribution_forbidden": True,
            "database_supplementation_restricted": True,
            "commit_raw_file": False,
            "login_bypass": False,
            "rows_rendered": 0,
            "downloadable_dataset": False,
            "employer_profiles_created": False,
            "published": "coverage statement and terms determination only",
            "withheld": [
                "employer names",
                "producer names",
                "carrier relationships",
                "modification factors",
                "Plan Risk rows",
                "county distributions",
                "downloadable transformed dataset",
                "raw DAT file",
            ],
            "source_url": "https://www.njcrib.com/FileDownload/PlanRiskDAT",
            "terms_url": "https://www.njcrib.com/",
            "caveat": "Plan Risk is downloadable without login, but NJCRIB terms forbid copying/redistribution and using content to supplement a database. Those terms are absolute. Restricted rows are not rendered.",
        },
        "serff": {
            "access_classification": serff["access_classification"],
            "coverage_state": serff["coverage_state"],
            "http_status": serff["http_status"],
            "filings_displayed": None,
            "filed_is_not_approved": True,
            "bypass": False,
            "source_url": "https://filingaccess.serff.com/sfa/home/NJ",
            "caveat": "A blocked source is not zero filings. This page does not display a SERFF filing count. Filed is not approved.",
        },
        "rehab": {
            "entities": rehab["entities"],
            "liquidation": rehab["liquidation"],
            "rehabilitation": rehab["rehabilitation"],
            "inferred_insolvency": rehab["inferred_insolvency"],
            "names_published": False,
            "identity_status": "UNRESOLVED",
            "source_url": "https://www.nj.gov/dobi/division_insurance/finesolv.htm",
            "caveat": "Status is only what NJDOBI publishes on the official rehabilitation/liquidation page. Names in that listing were not committed as an exact-NAIC attach index, so they are not copied onto public insurer profiles. Insolvency is not inferred from other families.",
        },
        "profile_modules": {
            "exact_naic_admitted": carriers["exact_naic"],
            "exact_naic_enforcement": ident["exact_naic"],
            "exact_naic_financial_exam": fin["exact_naic"],
            "market_conduct_unresolved": mc["name_only_unresolved"],
            "market_conduct_review": mc["multi_entity_review"],
            "ihc_seh_exact_naic": 0,
            "public_profile_links_rendered": 0,
            "public_profile_links_reason": "NJ exact-NAIC ledgers are not committed as a public attach index. Existing 26 legal-insurer profiles are unchanged. Exact NAIC financial exams may attach later when the identifier is on an already-published profile. Review-required, unresolved, name-only, synthetic, and individual evidence is withheld.",
            "withheld_review_unresolved": ident["match_status_counts"]["REVIEW_REQUIRED"]
            + ident["match_status_counts"]["UNRESOLVED"]
            + ident["match_status_counts"]["UNSAFE_REJECTED"],
            "internal_only_individuals": ident["match_status_counts"]["INTERNAL_ONLY_INDIVIDUAL"],
            "no_public_person_profile": True,
            "bail_firewall_preserved": True,
        },
        "existing_nj_agency_hubs": [
            "/hubs/new-jersey",
            "/hubs/new-jersey/north-new-jersey",
            "/hubs/new-jersey/central-new-jersey",
            "/hubs/new-jersey/south-new-jersey",
        ],
        "coverage_gaps": [
            {
                "id": "doi-2008",
                "label": "DOI enforcement 2008",
                "state": "SOURCE_NOT_ACQUIRED",
                "meaning": "Missing year is not zero enforcement actions.",
            },
            {
                "id": "surplus-lines",
                "label": "Surplus-lines eligible census",
                "state": "SOURCE_NOT_ACQUIRED",
                "meaning": "Admitted census is not a surplus-lines count. Missing is not zero eligible companies.",
            },
            {
                "id": "serff",
                "label": "SERFF Filing Access",
                "state": "SOURCE_ACCESS_BLOCKED",
                "meaning": "Blocked access is not zero filings.",
            },
            {
                "id": "crib",
                "label": "NJCRIB Plan Risk republication",
                "state": "PUBLIC_WITH_TERMS",
                "meaning": "Acquired internally; withheld from public metrics under source terms.",
            },
            {
                "id": "ihc-enrollment-total",
                "label": "IHC covered-lives statewide total",
                "state": "NOT_IN_COMMITTED_PUBLIC_SNAPSHOT",
                "meaning": "Missing total is not zero enrollment.",
            },
            {
                "id": "seh-enrollment-total",
                "label": "SEH enrollment statewide total",
                "state": "NOT_IN_COMMITTED_PUBLIC_SNAPSHOT",
                "meaning": "Missing total is not zero enrollment.",
            },
            {
                "id": "auto-history",
                "label": "Auto complaint years before 2023",
                "state": "SOURCE_NOT_ACQUIRED",
                "meaning": "Partial history is not a clean complaint record.",
            },
            {
                "id": "market-conduct-identity",
                "label": "Market-conduct exact NAIC",
                "state": "UNRESOLVED_OR_REVIEW_REQUIRED",
                "meaning": "Ambiguous reports are withheld from profiles.",
            },
            {
                "id": "authorization-subtypes",
                "label": "HMO / title / captive / RRG completeness",
                "state": "NOT_CLAIMED",
                "meaning": "The admitted census is not a complete subtype universe.",
            },
        ],
        "what_changed": [
            {
                "observation": "DOI 2008 enforcement index remains SOURCE_NOT_ACQUIRED (HTTP 404 on the official year page).",
                "family": "NJ_DOBI_DOI_ENFORCEMENT",
            },
            {
                "observation": "BFD 2018–2026 consent records in the acquired corpus classify as CONSENT_ORDER from official page headings (remaining OTHER = 0).",
                "family": "NJ_DOBI_BFD_ENFORCEMENT",
            },
            {
                "observation": "IHC/SEH average-rate-change tables cover plan years 2020–2026; the 2026.html year page 404s while 2026 lives on the index.",
                "family": "NJ_IHC_RATE_CHANGE",
            },
            {
                "observation": "SERFF Filing Access home returned HTTP 403. No filing corpus was acquired.",
                "family": "NJ_SERFF_FILING",
            },
            {
                "observation": "NJCRIB Plan Risk DAT is downloadable without login but terms forbid redistribution and database supplementation.",
                "family": "NJ_CRIB_PLAN_RISK",
            },
        ],
        "evidence_depth": [
            {"grain": "enforcement events", "count": e["events"]},
            {"grain": "unique orders", "count": e["unique_orders"]},
            {"grain": "document links", "count": acq["document_links"]},
            {"grain": "unique hashes", "count": acq["unique_hashes"]},
            {"grain": "hash-verified documents", "count": acq["status_counts"]["EXISTING_HASH_VERIFIED"]},
            {"grain": "index-only rows", "count": acq["index_only"]},
            {"grain": "source-unavailable documents", "count": acq["unavailable"]},
            {"grain": "text-extracted PDFs", "count": acq["text_extracted"]},
            {"grain": "image-only PDFs", "count": acq["image_only"]},
        ],
        "source_families": [
            "NJ_DOBI_DOI_ENFORCEMENT",
            "NJ_DOBI_BFD_ENFORCEMENT",
            "NJ_DOBI_CARRIER_AUTHORIZATION",
            "NJ_DOBI_MARKET_CONDUCT_EXAMINATION",
            "NJ_DOBI_FINANCIAL_EXAMINATION",
            "NJ_DOBI_AUTO_COMPLAINT",
            "NJ_DOBI_REHABILITATION_LIQUIDATION",
            "NJ_IHC_ENROLLMENT",
            "NJ_SEH_ENROLLMENT",
            "NJ_IHC_RATE_CHANGE",
            "NJ_SEH_RATE_CHANGE",
            "NJ_GET_COVERED_PARTICIPATION",
            "NJ_RESIDUAL_NJIUA_FAIR",
            "NJ_RESIDUAL_PAIP",
            "NJ_RESIDUAL_SAIP",
            "NJ_RESIDUAL_CAIP",
            "NJ_CRIB_PLAN_RISK",
            "NJ_SERFF_FILING",
        ],
        "coverage": coverage_rows(),
        "invariants": {
            **SUM001["invariants"],
            **SUM002["invariants"],
            "complaint_ne_violation": True,
            "exam_ne_enforcement": True,
            "market_conduct_ne_financial": True,
            "absence_ne_clean": True,
            "no_ranking": True,
            "no_trust_score": True,
            "no_county_routes": True,
            "blocked_source_ne_zero": True,
        },
        "database": {"available": False, "used_for_page": False},
    }
    snapshot["fingerprint"] = fingerprint(snapshot)
    return snapshot


def main() -> None:
    snapshot = build()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    accepted = OUT_DIR / "accepted-snapshot.json"
    accepted.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    summary = {
        "ticket": "NJ-INS-003",
        "generated_at": snapshot["generated_at"],
        "fingerprint": snapshot["fingerprint"],
        "as_of": snapshot["as_of"],
        "route": "/new-jersey",
        "indexable": True,
        "admitted": snapshot["authorization"]["admitted"],
        "enforcement_events": snapshot["enforcement"]["events"],
        "crib_publication_allowed": False,
        "serff_filings_displayed": None,
        "county_routes": False,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "nj-ins-003-summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print("wrote", accepted)
    print("fingerprint", snapshot["fingerprint"])


if __name__ == "__main__":
    main()
