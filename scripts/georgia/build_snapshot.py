#!/usr/bin/env python3
"""Freeze the GA-INS-001 public snapshot. No roster invention. No PDF date extraction."""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "lib/georgia-intelligence/accepted-snapshot.json"


def dumps(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


check = "--check" in sys.argv
if check:
    existing = json.loads(OUT.read_text(encoding="utf-8"))
    generated = existing["generated_at"]
else:
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
body = {
    "version": "insurance-ga-state-intel-v1",
    "ticket": "GA-INS-001",
    "generated_at": generated,
    "snapshotAsOf": "2026-09-23",
    "retrievedAt": "2026-09-23T23:15:00Z",
    "no_trust_score": True,
    "no_paid_ranking": True,
    "no_georgia_local_routes": True,
    "publication": {
        "path": "/georgia",
        "canonical": "https://www.insurancetrusthub.com/georgia",
        "robots": "index,follow",
        "h1": "Georgia Insurance Market & Regulatory Intelligence",
    },
    "regulator": {
        "agency": "Georgia Office of the Commissioner of Insurance and Safety Fire",
        "short": "OCI",
        "licensing_system": "Sircon for Georgia",
        "lookup_url": "https://oci.georgia.gov/insurance-resources/agent-individual-agency-company-search",
        "sircon_url": "https://www.sircon.com/landingPages/states/georgia/content.jsp",
        "agency_licensing_url": "https://oci.georgia.gov/agents-agency-licensing/agency-licensing-renewals",
        "company_licensing_url": "https://oci.georgia.gov/regulatory-filings/company-licensing-renewals",
        "receiverships_url": "https://oci.georgia.gov/receiverships",
        "complaints_url": "https://oci.georgia.gov/file-consumer-insurance-complaint",
        "hb410_url": "https://www.legis.ga.gov/legislation/70251",
    },
    "agency_structure": {
        "hb410_signed": "2025-05-14",
        "branch_licensing": "ELIMINATED",
        "current_business_entity": "principal agency",
        "historical_branch_evidence": "RETAINED_NOT_A_CURRENT_CENSUS",
        "do_not_publish_current_branch_census": True,
        "source": "https://oci.georgia.gov/agents-agency-licensing/agency-licensing-renewals",
    },
    "populations": {
        "agency_roster": "NOT_ACQUIRED",
        "producer_roster": "NOT_ACQUIRED",
        "company_roster": "NOT_ACQUIRED",
        "verification": "KNOWN",
        "existing_atlanta_hub_copy_is_not_oci_census": True,
        "search_only_is_not_zero": True,
    },
    "receiverships": {
        "index_scope": "OCI list of companies subject to receivership action since September 2010",
        "index_retrieved_at": "2026-09-23T23:15:00Z",
        "index_entities": 7,
        "later_announcements": 2,
        "exact_naic_attachments": 0,
        "exact_agency_attachments": 0,
        "order_dates_for_index_pdfs": "NOT_ACQUIRED",
        "events": [
            {
                "name": "Georgia Mutual Liquidation, A Stock Company",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/georgia-mutual-liquidation-stock-company",
            },
            {
                "name": "Georgia Restaurant Mutual Captive Insurance Company",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/georgia-restaurant-mutual-captive-insurance-company",
            },
            {
                "name": "Georgia Timber Harvesters' Mutual Captive Insurance Company",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/georgia-timber-harvesters-mutual-captive-insurance-company",
            },
            {
                "name": "Physicians' Alliance Health Plan Trust",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/physicians-alliance-health-plan-trust",
            },
            {
                "name": "Planters & Peoples Mutual Fire Association of Fulton County",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/planters-peoples-mutual-fire-association-fulton-county",
            },
            {
                "name": "Roofing and Sheet Metal Contractors Association of Georgia Workers Compensation Trust Fund",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/roofing-and-sheet-metal-contractors-association-georgia-workers-compensation-trust-fund",
            },
            {
                "name": "Southern Casualty Insurance Company",
                "grain": "insurer",
                "list": "receivership_index",
                "action": "liquidation",
                "order_date": None,
                "source": "https://oci.georgia.gov/southern-casualty-insurance-company",
            },
            {
                "name": "Friday Health Plans of Georgia, Inc.",
                "grain": "insurer",
                "list": "later_announcement",
                "action": "receivership_announcement",
                "supervision_date": "2023-03-08",
                "announced": "2023-05-31",
                "order_date": None,
                "source": "https://oci.georgia.gov/press-releases/2023-05-31/important-announcement-regarding-friday-health-plans-georgia-inc",
            },
            {
                "name": "Sonder Health Plans, Inc.",
                "grain": "insurer",
                "list": "later_announcement",
                "action": "receivership",
                "supervision_date": "2025-04-11",
                "order_date": "2025-08-13",
                "announced": "2025-08-15",
                "source": "https://oci.georgia.gov/press-releases/2025-08-15/important-announcement-regarding-sonder-health-plans-inc",
            },
        ],
    },
    "mental_health_parity": {
        "coverage": "AGGREGATE_ANNOUNCEMENT_ONLY",
        "announced": "2026-01-12",
        "examinations_described": 22,
        "fines_described": "nearly $25 million",
        "company_level_orders": "NOT_ACQUIRED",
        "exact_naic_attachments": 0,
        "source": "https://oci.georgia.gov/press-releases/2026-01-12/commissioner-king-issues-nearly-25-million-fines-mental-health-parity",
    },
    "complaints": {
        "intake": "KNOWN",
        "public_dataset": "NOT_ACQUIRED",
        "count": None,
        "source": "https://oci.georgia.gov/file-consumer-insurance-complaint",
    },
    "capabilities": {
        "agency_roster": "NOT_ACQUIRED",
        "producer_roster": "NOT_ACQUIRED",
        "company_roster": "NOT_ACQUIRED",
        "license_verification": "KNOWN",
        "principal_agency_structure": "KNOWN",
        "historical_branch_census": "UNSUPPORTED",
        "receivership_index": "PARTIAL",
        "mental_health_parity_company_orders": "NOT_ACQUIRED",
        "complaint_intake": "KNOWN",
        "complaint_dataset": "NOT_ACQUIRED",
        "serff": "NOT_ACQUIRED",
        "paid_nipr_sircon_roster": "NOT_ACQUIRED",
    },
    "expansion_ledger": {
        "GRAPH_WRITES": 0,
        "NET_NEW_PUBLIC_PROFILES": 0,
        "CLAIM_ELIGIBILITY_BROADENED": False,
    },
}
expected = hashlib.sha256(
    dumps({k: v for k, v in body.items() if k not in {"generated_at", "fingerprint"}}).encode()
).hexdigest()
body["fingerprint"] = expected
if check:
    if existing.get("fingerprint") != expected:
        raise SystemExit(f"fingerprint drift {existing.get('fingerprint')} != {expected}")
    comparable = {k: v for k, v in existing.items() if k != "generated_at"}
    fresh = {k: v for k, v in body.items() if k != "generated_at"}
    if comparable != fresh:
        raise SystemExit("snapshot body drift")
    print(expected)
else:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print(expected)
