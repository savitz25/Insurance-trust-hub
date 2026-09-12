#!/usr/bin/env python3
"""IL-INS-001 — Illinois insurance snapshot from committed IDOI artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORDERS = ROOT / "data/illinois/il-ins-001/raw/directors-orders.json"
ART = ROOT / "lib/illinois-intelligence/accepted-snapshot.json"

EXPECTED_ORDERS = 2896
GENERATION_KEYS = frozenset({"generated_at", "fingerprint"})


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(obj: object) -> str:
    return hashlib.sha256(dumps(obj).encode("utf-8")).hexdigest()


def semantic(obj: dict) -> dict:
    return {k: v for k, v in obj.items() if k not in GENERATION_KEYS}


def build_body(generated_at: str) -> dict:
    orders = json.loads(ORDERS.read_text(encoding="utf-8"))
    if orders["observation_rows"] != EXPECTED_ORDERS:
        raise SystemExit(f"order rows drifted {orders['observation_rows']}")
    if orders["distinct_ids"] != EXPECTED_ORDERS:
        raise SystemExit("distinct order ids drifted")
    if orders["naic_token_in_name_fields"] != 0 or orders["npn_token_in_name_fields"] != 0:
        raise SystemExit("table unexpectedly contains NAIC/NPN tokens")
    types = orders["document_types"]
    years = orders["issue_years"]
    return {
        "version": "insurance-il-state-intel-v1",
        "ticket": "IL-INS-001A",
        "as_of": None,
        "source_as_of": None,
        "source_as_of_state": "UNKNOWN",
        "retrieved_at": orders["retrieved_at"],
        "generated_at": generated_at,
        "snapshot_as_of": "2026-09-12",
        "source_clock": "IDOI Director's Orders search index retrieved 2026-09-12T16:41:31Z. Issue dates are order dates, not retrieval. Company and producer lookups remain live/search-only and have no fabricated sourceAsOf.",
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_illinois_local_pages": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/illinois",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/illinois",
            "h1": "Illinois Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "Illinois Department of Insurance",
            "short": "IDOI",
            "url": "https://idoi.illinois.gov/",
            "company_lookup": "https://insurance.illinois.gov/applications/RegEntPortal/",
            "company_lookup_page": "https://idoi.illinois.gov/companies/company-lookup.html",
            "producer_howto": "https://idoi.illinois.gov/companies/agent-lookup.html",
            "sbs_lookup": "https://sbs.naic.org/solar-external-lookup/",
            "directors_orders": "https://insurance.illinois.gov/Applications/DirectorsOrders/",
            "directors_orders_page": "https://idoi.illinois.gov/companies/directors-orders.html",
            "complaints": "https://idoi.illinois.gov/consumers/file-a-complaint.html",
            "help_center": "https://idoihelpcenter.illinois.gov/s/",
            "reports": "https://idoi.illinois.gov/reports.html",
            "company_bulletins": "https://idoi.illinois.gov/companies/company-bulletins-page.html",
        },
        "hero": {
            "universe_value": None,
            "universe_label": "Current IDOI-authorized insurance companies",
            "universe_hint": "No current bulk insurer roster was acquired. Company Lookup is OPEN_SEARCH_ONLY. Search-only is not zero.",
            "actions_value": EXPECTED_ORDERS,
            "actions_label": "IDOI Director's Orders observations",
            "actions_hint": "Search-index rows from the official Directors Orders application. An order is not a conviction, not a unique company, and not a complaint.",
            "current_value": "Search only",
            "current_label": "Producer / agency bulk roster",
            "current_hint": "SBS Individual and Business Entity lookup is OPEN_SEARCH_ONLY. Individual producers are not agencies.",
            "geography_value": "Illinois",
            "as_of_value": "search-only",
            "as_of_label": "current company universe",
        },
        "company_lookup": {
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "count": None,
            "distinct_naic": None,
            "search_only_is_not_zero": True,
            "not_derived_from_orders": True,
            "not_derived_from_complaints": True,
            "not_derived_from_reports": True,
            "identity_namespace": None,
        },
        "producer_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "search_only_is_not_zero": True,
            "individual_is_not_agency": True,
        },
        "agency_roster": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "search_only_is_not_zero": True,
            "agency_is_not_insurer": True,
            "loa_depends_on_individual_licenses": True,
        },
        "directors_orders": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "source": orders["source"],
            "retrieved_at": orders["retrieved_at"],
            "html_sha256": orders["html_sha256"],
            "observation_rows": orders["observation_rows"],
            "distinct_ids": orders["distinct_ids"],
            "with_company_name": orders["with_company_name"],
            "with_person_name": orders["with_person_name"],
            "with_both_names": orders["with_both_names"],
            "document_types": types,
            "issue_years": years,
            "order_is_not_conviction": True,
            "allegation_is_not_finding": True,
            "consent_is_not_court_conviction": True,
            "denial_is_not_revocation": True,
            "fine_is_not_complaint": True,
            "name_only_is_unsafe": True,
        },
        "complaints": {
            "coverage": "OPEN_SEARCH_ONLY",
            "count": None,
            "search_only_is_not_zero": True,
            "complaint_is_not_violation": True,
            "complaint_is_not_enforcement": True,
            "orders_are_not_complaints": True,
        },
        "market_conduct": {
            "coverage": "PUBLIC_RESEARCH_PATH",
            "count": None,
            "exam_is_not_disciplinary_order": True,
        },
        "company_bulletins": {
            "coverage": "REGULATORY_CONTEXT_ONLY",
            "not_company_evidence": True,
            "not_attached_to_all_insurers": True,
        },
        "identity": {
            "preferred_insurer": "NAIC number when source-native",
            "naic_is_not_npn": True,
            "naic_is_not_producer_license": True,
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
            "IL_CURRENT_COMPANY_ROWS": None,
            "IL_CURRENT_DISTINCT_NAIC_IDS": None,
            "IL_COMPANY_LOOKUP_COVERAGE": "OPEN_SEARCH_ONLY",
            "IL_BUSINESS_ENTITY_PRODUCER_ROWS": None,
            "IL_INDIVIDUAL_PRODUCER_ROWS": None,
            "IL_DIRECTORS_ORDER_OBSERVATIONS": EXPECTED_ORDERS,
            "IL_DIRECTORS_ORDER_DISTINCT_SUBJECTS": None,
            "IL_MARKET_CONDUCT_OBSERVATIONS": None,
            "IL_COMPLAINT_ROWS": None,
            "EXACT_COMPANY_ENFORCEMENT_ASSOCIATIONS": 0,
            "EXACT_PRODUCER_ENFORCEMENT_ASSOCIATIONS": 0,
            "REVIEW_REQUIRED_ASSOCIATIONS": 0,
            "REJECTED_NAME_ONLY_ASSOCIATIONS": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "NET_NEW_STATE_RESEARCH_IDENTITIES": 0,
            "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
            "NET_NEW_PUBLIC_INSURANCE_PROFILES": 0,
            "GRAPH_WRITES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
        },
        "fingerprint": "",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--generated-at", default=None)
    args = parser.parse_args()
    fp = sha(semantic(build_body("2020-01-01T00:00:00Z")))
    fp_b = sha(semantic(build_body("2099-12-31T23:59:59Z")))
    if fp != fp_b:
        raise SystemExit("generatedAt leaked")
    if args.check:
        current = json.loads(ART.read_text(encoding="utf-8"))
        if sha(semantic(current)) != fp or current.get("fingerprint") != fp:
            raise SystemExit("fingerprint drifted")
        print(json.dumps({"check": "ok", "fingerprint": fp}, indent=2))
        return
    generated_at = args.generated_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = build_body(generated_at)
    body["fingerprint"] = fp
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"fingerprint": fp, "orders": EXPECTED_ORDERS, "generated_at": generated_at}, indent=2))


if __name__ == "__main__":
    main()
