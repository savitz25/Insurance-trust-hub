"""Build CA-INS-001 public snapshot and copy compact enforcement inventory."""
from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "ca-ins-001"
REP = json.loads((ART / "acquisition-report.json").read_text(encoding="utf-8"))
LIB = ROOT / "lib" / "california-intelligence"
PUBLIC_ENF = ROOT / "public" / "california-dmhc-enforcement.json"
VERSION = "insurance-ca-state-intel-v1"


def dump(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def fingerprint(obj: dict) -> str:
    body = {k: v for k, v in obj.items() if k not in ("fingerprint", "generated_at")}
    return hashlib.sha256(dump(body).encode("utf-8")).hexdigest()


def main() -> None:
    LIB.mkdir(parents=True, exist_ok=True)
    PUBLIC_ENF.parent.mkdir(parents=True, exist_ok=True)
    compact_src = ART / "dmhc-enforcement-compact.json"
    shutil.copyfile(compact_src, PUBLIC_ENF)

    e = REP["enforcement"]
    imr = REP["imr"]
    cdi = REP["cdi_health"]
    fair = REP["fair_plan"]
    companies = cdi["rows"]

    action_counts = e["action_counts"]
    findings = [
        {
            "id": "dmhc-action-mix",
            "text": (
                f"DMHC Office of Enforcement published {e['rows']:,} enforcement-action rows "
                f"from {e['date_min']} through {e['date_max']}. Source-native classes include "
                f"Letter of Agreement {action_counts.get('Letter of Agreement', 0):,}, "
                f"Settlement Agreement {action_counts.get('Settlement Agreement', 0):,}, "
                f"Cease and Desist Order {action_counts.get('Cease and Desist Order', 0):,}, "
                f"and Accusation {action_counts.get('Accusation', 0):,}, plus every other official class in the file. "
                f"Those {e['rows']:,} rows name {e['distinct_organization_names']:,} distinct organization-name strings. "
                "A letter of agreement is not a settlement. An accusation is not a final finding. "
                "A cease-and-desist order is not a revocation. An enforcement occurrence is not a unique company. "
                "This is not an insurer ranking."
            ),
        },
        {
            "id": "imr-volume",
            "text": (
                f"DMHC Independent Medical Review determinations total {imr['rows']:,} rows "
                f"(datastore as of 2026-06-01). Overturned decision of health plan: "
                f"{imr['determination_counts'].get('Overturned Decision of Health Plan', 0):,}. "
                f"Upheld decision of health plan: "
                f"{imr['determination_counts'].get('Upheld Decision of Health Plan', 0):,}. "
                "An IMR case is not a complaint. An IMR decision is not enforcement. "
                "An IMR outcome is not a plan quality score. IMR volume is not market share. "
                "This extract has no plan identifier and no enrollment denominator, so plan-level IMR rates are not published."
            ),
        },
        {
            "id": "cdi-health-list",
            "text": (
                f"CDI's dated health-insurer list names {cdi['row_count']} companies licensed to provide "
                f"health insurance coverage as of {cdi['source_as_of']}. "
                f"{cdi['phone_count']} have a published business phone and {cdi['website_count']} have a website. "
                "Licensed is not currently selling. This list is not the complete admitted-carrier universe "
                "and is not the DMHC Knox-Keene plan roster."
            ),
        },
        {
            "id": "fair-plan-residual",
            "text": (
                "CDI's January 2025 fact sheet on residential policies reports "
                f"{fair['new_and_renewed_policies_2023']['fair_plan']:,} FAIR Plan new-and-renewed policies in 2023 "
                f"versus {fair['new_and_renewed_policies_2023']['voluntary_market']:,} in the voluntary market "
                f"({fair['fair_plan_share_of_residential_new_renewed_2023']*100:.1f}% of that residential new-and-renewed mix). "
                "FAIR Plan is residual-market infrastructure, not the typical California insurance market, "
                "not an insurer of choice, and not a safety score."
            ),
        },
    ]

    snapshot = {
        "version": VERSION,
        "as_of": "2026-06-01",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "publication": {
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/california",
            "path": "/california",
            "sitemap": True,
        },
        "hero": {
            "universe_value": e["rows"],
            "universe_label": "DMHC enforcement rows",
            "universe_hint": "Knox-Keene / DMHC actions, not all California insurers and not a unique-company census.",
            "current_value": imr["rows"],
            "current_label": "DMHC IMR determinations",
            "current_hint": "IMR is not a complaint and not enforcement. No plan-level rates.",
            "observations_value": cdi["row_count"],
            "observations_label": "CDI dated health-insurer list",
            "observations_hint": "Companies on CDI's dated health-insurer list. Not the complete admitted universe.",
            "geography_value": "California",
            "geography_label": "statewide sources",
            "geography_hint": "No California county insurance pages. Mailing geography is not a service area.",
            "as_of_value": "2026-06-01",
            "as_of_label": "DMHC CHHS datasets",
            "as_of_hint": f"CDI health list as of {cdi['source_as_of']}. FAIR Plan fact sheet January 2025 (2023 experience).",
        },
        "regulators": {
            "cdi": {
                "name": "California Department of Insurance",
                "short": "CDI",
                "url": "https://www.insurance.ca.gov/",
                "covers": "Admitted insurers, producers, property/casualty residual-market oversight context, complaint study, rate filings.",
            },
            "dmhc": {
                "name": "Department of Managed Health Care",
                "short": "DMHC",
                "url": "https://www.dmhc.ca.gov/",
                "covers": "Knox-Keene health care service plans, DMHC enforcement, Independent Medical Review.",
            },
            "dmhc_is_not_cdi": True,
            "dmhc_plan_is_not_all_california_insurers": True,
            "cdi_license_is_not_knox_keene": True,
            "cdi_lookup_is_not_bulk_universe": True,
        },
        "enforcement": {
            "agency": e["agency"],
            "source": e["source"],
            "source_as_of": "2026-06-01",
            "rows": e["rows"],
            "grain": e["grain"],
            "action_counts": action_counts,
            "organization_type_counts": e["organization_type_counts"],
            "distinct_organization_names": e["distinct_organization_names"],
            "date_min": e["date_min"],
            "date_max": e["date_max"],
            "year_counts": e["year_counts"],
            "penalty_rows": e["penalty_rows"],
            "rows_with_link": e["rows_with_link"],
            "document_availability": "INDEX_ONLY",
            "identity_key": None,
            "identity_bar": "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH",
            "profile_links": 0,
            "letter_of_agreement_is_not_settlement": True,
            "accusation_is_not_final_finding": True,
            "cease_and_desist_is_not_revocation": True,
            "occurrence_is_not_unique_company": True,
            "no_enforcement_ranking": True,
            "inventory_path": "/california-dmhc-enforcement.json",
        },
        "imr": {
            "agency": imr["agency"],
            "source": imr["source"],
            "source_as_of": "2026-06-01",
            "rows": imr["rows"],
            "grain": imr["grain"],
            "year_counts": imr["year_counts"],
            "determination_counts": imr["determination_counts"],
            "type_counts": imr["type_counts"],
            "diagnosis_category_counts": imr["diagnosis_category_counts"],
            "imr_type_counts": imr["imr_type_counts"],
            "has_plan_identifier": False,
            "imr_is_not_complaint": True,
            "imr_is_not_enforcement": True,
            "imr_is_not_quality_score": True,
            "imr_volume_is_not_market_share": True,
            "no_plan_rates": True,
        },
        "cdi_health_list": {
            "agency": cdi["agency"],
            "source": cdi["source"],
            "source_as_of": cdi["source_as_of"],
            "label": cdi["label"],
            "row_count": cdi["row_count"],
            "phone_count": cdi["phone_count"],
            "website_count": cdi["website_count"],
            "email_count": 0,
            "companies": companies,
            "licensed_is_not_currently_selling": True,
            "not_complete_admitted_universe": True,
            "not_all_property_casualty": True,
            "not_dmhc_knox_keene": True,
            "phone_eligibility": "PUBLIC_ELIGIBLE",
            "website_eligibility": "PUBLIC_ELIGIBLE",
            "email_policy": "NOT_IN_SOURCE",
        },
        "cdi_admitted": {
            "coverage": "SOURCE_NOT_ACQUIRED",
            "access": "OPEN_SEARCH_ONLY",
            "complete_count": None,
            "missing_is_not_zero": True,
            "lookup_url": "https://www.insurance.ca.gov/01-consumers/120-company/lookup/index.cfm",
        },
        "producer": {
            "coverage": "SOURCE_AVAILABLE_BY_PAID_LIST / SEARCH_ONLY",
            "purchased": False,
            "scraped": False,
            "page_blocker": False,
            "complete_count": None,
            "national_npn_is_not_california_license": True,
            "source": "https://www.insurance.ca.gov/0200-industry/0130-mailing-lists/",
        },
        "contacts": {
            "cdi_health_list_rows": cdi["row_count"],
            "business_phone_public_eligible": cdi["phone_count"],
            "website_public_eligible": cdi["website_count"],
            "public_email": 0,
            "officer_personal_contacts_published": False,
        },
        "fair_plan": fair,
        "wildfire_market": REP["wildfire_market"],
        "complaints": REP["complaints"],
        "rate_filings": REP["rate_filings"],
        "federal_national": {
            "naic_identity_available_in_graph": True,
            "naic_is_not_california_authorization": True,
            "cms_marketplace_is_not_cdi_or_dmhc_license": True,
            "exact_naic_from_california_source": 0,
            "note": "Existing national/legal-insurer identities are not labeled California-authorized without a California source NAIC or official crosswalk.",
        },
        "findings": findings,
        "evidence_depth": [
            {
                "family": "DMHC enforcement",
                "source": e["source"],
                "agency": "DMHC",
                "as_of": "2026-06-01",
                "grain": "enforcement action row",
                "rows": e["rows"],
                "identity_key": "none (OrganizationName only)",
                "contact_coverage": "none",
                "access_class": "OPEN_API_DATASTORE",
                "publication_status": "PUBLISHED_STATE_EVENT",
                "limitations": "No plan ID/NAIC. Name-only is UNSAFE for adverse profile attach.",
            },
            {
                "family": "DMHC IMR",
                "source": imr["source"],
                "agency": "DMHC",
                "as_of": "2026-06-01",
                "grain": "IMR determination",
                "rows": imr["rows"],
                "identity_key": "none",
                "contact_coverage": "none",
                "access_class": "OPEN_API_DATASTORE",
                "publication_status": "PUBLISHED_AGGREGATES",
                "limitations": "No plan identifier. Findings text not republished. No enrollment denominator.",
            },
            {
                "family": "CDI health-insurer list",
                "source": cdi["source"],
                "agency": "CDI",
                "as_of": cdi["source_as_of"],
                "grain": "dated health-insurer list row",
                "rows": cdi["row_count"],
                "identity_key": "company name on CDI list",
                "contact_coverage": f"{cdi['phone_count']} phones / {cdi['website_count']} websites",
                "access_class": "OPEN_HTML_TABLE",
                "publication_status": "PUBLISHED_LIST",
                "limitations": "Not complete admitted universe. Licensed ≠ currently selling.",
            },
            {
                "family": "CDI company lookup",
                "source": "https://www.insurance.ca.gov/01-consumers/120-company/lookup/index.cfm",
                "agency": "CDI",
                "as_of": "2026-09-03",
                "grain": "admitted company profile",
                "rows": None,
                "identity_key": "CDI company profile (search)",
                "contact_coverage": "SEARCH_ONLY",
                "access_class": "OPEN_SEARCH_ONLY",
                "publication_status": "COVERAGE_GAP",
                "limitations": "No free bulk roster. Absence is not zero companies.",
            },
            {
                "family": "CDI producer source",
                "source": "https://www.insurance.ca.gov/0200-industry/0130-mailing-lists/",
                "agency": "CDI",
                "as_of": "2026-09-03",
                "grain": "licensed producer / mailing list",
                "rows": None,
                "identity_key": "CDI license / NPN if purchased",
                "contact_coverage": "PAID",
                "access_class": "SOURCE_AVAILABLE_BY_PAID_LIST / SEARCH_ONLY",
                "publication_status": "COVERAGE_GAP",
                "limitations": "Not purchased. Not scraped. National NPN ≠ California license.",
            },
            {
                "family": "FAIR Plan",
                "source": fair["source"],
                "agency": "CDI",
                "as_of": fair["source_as_of"],
                "grain": "statewide residential new-and-renewed policy counts",
                "rows": None,
                "identity_key": "n/a (market aggregate)",
                "contact_coverage": "n/a",
                "access_class": "OPEN_PDF",
                "publication_status": "PUBLISHED_STATE_AGGREGATE",
                "limitations": "Residual market. Not typical market. ZIP files not ingested as county pages.",
            },
            {
                "family": "property/wildfire market source",
                "source": REP["wildfire_market"]["source"],
                "agency": "CDI",
                "as_of": "2025-01",
                "grain": "statewide residential market publications",
                "rows": None,
                "identity_key": "n/a",
                "contact_coverage": "n/a",
                "access_class": "OPEN_STATE_PUBLICATION",
                "publication_status": "PUBLISHED_CONTEXT",
                "limitations": "No property-level wildfire score. No premium prediction.",
            },
            {
                "family": "complaint evidence",
                "source": REP["complaints"]["source"],
                "agency": "CDI",
                "as_of": "2024 calendar / 2025 study",
                "grain": "regulator complaint study + commissioner-report totals",
                "rows": None,
                "identity_key": "not attached",
                "contact_coverage": "n/a",
                "access_class": "OPEN_OFFICIAL_STUDY",
                "publication_status": "PUBLISHED_STATE_TOTALS_ONLY",
                "limitations": "CDI ranks 50 large companies; TrustHub does not republish that ranking. Complaint ≠ violation. IMR ≠ complaint.",
            },
            {
                "family": "rate filing evidence",
                "source": REP["rate_filings"]["source"],
                "agency": "CDI",
                "as_of": "2026-09-03",
                "grain": "rate filing search",
                "rows": None,
                "identity_key": "filing number (search)",
                "contact_coverage": "n/a",
                "access_class": "OPEN_SEARCH_ONLY",
                "publication_status": "COVERAGE_GAP",
                "limitations": "No bulk dump. Rate filing ≠ consumer premium. No SERFF scrape.",
            },
            {
                "family": "federal/national overlay",
                "source": "InsuranceTrustHub national/legal-insurer graph",
                "agency": "NAIC / CMS (existing)",
                "as_of": "existing graph",
                "grain": "national legal-insurer / NAIC identity",
                "rows": None,
                "identity_key": "NAIC CoCode where already stored nationally",
                "contact_coverage": "existing",
                "access_class": "EXISTING_GRAPH",
                "publication_status": "NOT_USED_AS_CA_AUTHORIZATION",
                "limitations": "NAIC identity ≠ California authorization.",
            },
        ],
        "coverage_gaps": [
            {"id": "admitted-universe", "label": "Complete CDI admitted/company denominator", "state": "SOURCE_NOT_ACQUIRED"},
            {"id": "producer", "label": "Complete producer denominator", "state": "SOURCE_AVAILABLE_BY_PAID_LIST / SEARCH_ONLY"},
            {"id": "agency-broker", "label": "Full agency/broker universe", "state": "SOURCE_NOT_ACQUIRED"},
            {"id": "appointments", "label": "Full California appointments", "state": "SOURCE_NOT_ACQUIRED"},
            {"id": "authorization-subtypes", "label": "Complete California authorization subtype coverage", "state": "SOURCE_NOT_ACQUIRED"},
            {"id": "fair-plan-inforce", "label": "FAIR Plan in-force/TIV/premium by ZIP", "state": "NOT_INGESTED"},
            {"id": "rate-bulk", "label": "Rate/filing bulk", "state": "OPEN_SEARCH_ONLY"},
            {"id": "imr-enrollment", "label": "Plan enrollment denominators for IMR/enforcement rates", "state": "NOT_IN_SOURCE"},
            {"id": "dmhc-plan-id", "label": "Unresolved DMHC entity identity (no exact plan key)", "state": "NAME_ONLY_UNSAFE_FOR_ADVERSE_ATTACH"},
        ],
        "semantics": [
            "DMHC != CDI",
            "DMHC PLAN != ALL CALIFORNIA INSURERS",
            "CDI HEALTH LIST != COMPLETE ADMITTED UNIVERSE",
            "LICENSED != CURRENTLY SELLING",
            "IMR != COMPLAINT",
            "IMR != ENFORCEMENT",
            "COMPLAINT != VIOLATION",
            "ACCUSATION != FINAL FINDING",
            "LETTER OF AGREEMENT != SETTLEMENT",
            "CEASE & DESIST != REVOCATION",
            "RAW ENFORCEMENT COUNT != QUALITY",
            "FAIR PLAN != ENTIRE PROPERTY MARKET",
            "RATE FILING != CONSUMER PREMIUM",
            "NAIC IDENTITY != CALIFORNIA AUTHORIZATION",
            "SEARCH-ONLY SOURCE ABSENCE != ZERO",
            "MISSING != ZERO",
            "NO TRUST SCORE",
            "NO PAID RANKING",
        ],
        "verify": {
            "dmhc_enforcement": "https://www.dmhc.ca.gov/LawsRegulations/EnforcementActions.aspx",
            "dmhc_imr": "https://www.dmhc.ca.gov/FileaComplaint/IndependentMedicalReviewIMR.aspx",
            "cdi_health_list": cdi["source"],
            "cdi_company_lookup": "https://www.insurance.ca.gov/01-consumers/120-company/lookup/index.cfm",
            "cdi_complaint_study": "https://www.insurance.ca.gov/01-consumers/120-company/03-concmplt/",
        },
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_review_schema": True,
        "no_aggregate_rating": True,
        "no_california_county_pages": True,
    }
    snapshot["fingerprint"] = fingerprint(snapshot)
    out = LIB / "accepted-snapshot.json"
    out.write_text(json.dumps(snapshot, indent=2, sort_keys=True, ensure_ascii=True) + "\n", encoding="utf-8")
    (ART / "hash-manifest.json").write_text(
        json.dumps(
            {
                "ticket": "CA-INS-001",
                "snapshot_fingerprint": snapshot["fingerprint"],
                "enforcement_rows": e["rows"],
                "imr_rows": imr["rows"],
                "cdi_health_rows": cdi["row_count"],
                "inventory_bytes": PUBLIC_ENF.stat().st_size,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("snapshot", out)
    print("fingerprint", snapshot["fingerprint"])
    print("inventory", PUBLIC_ENF, PUBLIC_ENF.stat().st_size)


if __name__ == "__main__":
    main()
