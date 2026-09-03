#!/usr/bin/env python3
"""Build insurance-tx-state-intel-v1 accepted snapshot + compact public indexes."""
from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "tdi-raw"
ART = ROOT / "artifacts" / "tx-ins-001"
PUB = ROOT / "public"
LIB = ROOT / "lib" / "texas-intelligence"
TODAY = date(2026, 9, 3)
VERSION = "insurance-tx-state-intel-v1"


def parse_date(s: str | None) -> date | None:
    s = (s or "").strip()
    if not s:
        return None
    s = s.replace("T", " ")
    for fmt, n in (("%Y-%m-%d", 10), ("%m/%d/%Y", 10)):
        try:
            return datetime.strptime(s[:n], fmt).date()
        except ValueError:
            continue
    return None


def dump(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def main() -> int:
    acq = json.loads((ART / "acquisition-report.json").read_text(encoding="utf-8"))
    ag = acq["agencies"]
    ap = acq["agency_appointments"]

    # Compact public agency index from the large generated file if present, else rebuild.
    big = PUB / "texas-tdi-agencies.json"
    src = json.loads(big.read_text(encoding="utf-8")) if big.exists() else {"rows": []}
    compact_rows = []
    for row in src.get("rows") or []:
        compact_rows.append(
            [
                row.get("npn") or "",
                row.get("name") or "",
                row.get("city") or "",
                row.get("state") or "",
                row.get("zip") or "",
                "|".join(row.get("types") or []),
                int(row.get("appointments") or 0),
                int(row.get("licenses") or 0),
                row.get("exp_max") or "",
            ]
        )
    compact = {
        "label": "TDI insurance agencies by NPN",
        "as_of": "2026-09-03",
        "count": len(compact_rows),
        "fields": ["npn", "name", "city", "state", "zip", "types", "appointments", "licenses", "exp_max"],
        "rows": compact_rows,
        "note": "Appointment count is not quality. Phone, email, website, and street address are not in the official agency file.",
    }
    (PUB / "texas-tdi-agencies.json").write_text(json.dumps(compact, separators=(",", ":")), encoding="utf-8")
    print("compact agencies bytes", (PUB / "texas-tdi-agencies.json").stat().st_size, flush=True)

    companies = json.loads((PUB / "texas-tdi-appointment-companies.json").read_text(encoding="utf-8"))
    companies["as_of"] = "2026-09-03"
    companies["rows"] = companies["rows"][:1414]
    (PUB / "texas-tdi-appointment-companies.json").write_text(json.dumps(companies, separators=(",", ":")), encoding="utf-8")

    # Confirmed complaint / index extras already computed in prior pass.
    snap = {
        "version": VERSION,
        "ticket": "TX-INS-001",
        "as_of": "2026-09-03",
        "retrieved_at": acq.get("retrieved_at"),
        "source_clock": "TDI Open Data rowsUpdatedAt 2026-09-03",
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_texas_county_pages": True,
        "missing_is_not_zero": True,
        "person_directory_public": False,
        "person_appointments_public": False,
        "publication": {
            "path": "/texas",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/texas",
            "h1": "Texas Insurance Market & Regulatory Intelligence",
        },
        "hero": {
            "universe_value": ag["rows"],
            "universe_label": "TDI agency license rows",
            "universe_hint": "One row per agency license, not a person directory.",
            "current_value": ag["distinct_npn"],
            "current_label": "distinct agency NPN",
            "current_hint": "Exact business identity. License jurisdiction is Texas.",
            "observations_value": ap["rows"],
            "observations_label": "active agency appointments",
            "observations_hint": "Agency NPN to company NAIC. Appointment count is not quality.",
            "geography_value": "Texas",
            "geography_label": "state snapshot",
            "geography_hint": "No Texas county routes.",
            "as_of_value": "2026-09-03",
            "as_of_label": "TDI open data",
            "as_of_hint": "Official SODA clocks, not a TrustHub score.",
        },
        "regulators": {
            "tdi": {
                "name": "Texas Department of Insurance",
                "url": "https://www.tdi.texas.gov/",
                "covers": "Companies, agencies/businesses, individual agents/adjusters, appointments, surplus lines, title, complaints, and rate filings.",
            },
            "entity_classes": [
                {"class": "Insurance company / insurer", "id": "NAIC + TDI company/EID when acquired", "establishes": "Texas authorization only when a Texas company source says so", "does_not": "National NAIC identity alone is not Texas authorization"},
                {"class": "Agency / business entity", "id": "NPN + TDI agency license number", "establishes": "TDI business license to sell/service/manage insurance", "does_not": "Not an individual agent; not an insurer"},
                {"class": "Individual agent / adjuster", "id": "Person NPN", "establishes": "Person credential", "does_not": "Not a public business profile in this snapshot"},
                {"class": "Appointment", "id": "Agency NPN + NAIC", "establishes": "Active designation to represent a company", "does_not": "Not a quality signal; not proof the agency can sell every product"},
                {"class": "Surplus lines", "id": "TDI surplus license number", "establishes": "Surplus lines person or firm license status", "does_not": "Not insurer authorization; firm row is not automatically the standard agency universe"},
                {"class": "Title", "id": "TDI title agency license + underwriter + county", "establishes": "County-level title underwriter appointment", "does_not": "Not a general P&C appointment; not a county page"},
                {"class": "HMO / health entity", "id": "appears in complaint respondent role and some appointment types", "establishes": "Source-native role where present", "does_not": "Not collapsed into P&C denominators"},
            ],
            "tdi_is_not_national_naic_authorization": True,
        },
        "agencies": {
            "dataset_id": "3yqc-fcdt",
            "source_url": "https://data.texas.gov/dataset/Insurance-agencies-and-businesses-approved-to-mana/3yqc-fcdt",
            "csv_sha256": acq["downloads"]["agencies"]["sha256"],
            "bytes": acq["downloads"]["agencies"]["bytes"],
            "grain": "one row per TDI license held by an agency or business",
            "rows": 56625,
            "distinct_npn": 43597,
            "distinct_tdi_license": 48920,
            "tx_listed_state_rows": 23004,
            "tx_listed_state_npn": 16924,
            "state_field_meaning": "Listed state on the agency row (often mailing/home office). License jurisdiction is Texas TDI. state=TX is not the licensed-in-Texas universe.",
            "license_type_counts": ag["license_type_counts"],
            "org_type_counts": ag["org_type_counts"],
            "expiration_on_or_after_2026_09_03": 55334,
            "expiration_before_2026_09_03": 1291,
            "contacts": ag["contacts"],
            "identity": ["NPN", "TDI agency license number"],
            "namespaces": ["NPN:{npn}", "TX-TDI-AGENCY:{license_number}"],
            "verify_url": "https://www.tdi.texas.gov/agent/index.html",
        },
        "appointments": {
            "dataset_id": "avjc-7u2m",
            "source_url": "https://data.texas.gov/dataset/Active-insurance-company-appointments-for-agencies/avjc-7u2m",
            "csv_sha256": acq["downloads"]["agency_appointments"]["sha256"],
            "bytes": acq["downloads"]["agency_appointments"]["bytes"],
            "grain": "one active appointment between an agency/business and an insurance company",
            "rows": 622019,
            "distinct_agency_npn": 35167,
            "distinct_naic": 1414,
            "both_exact_npn_and_naic": 619830,
            "unresolved_agency": 2158,
            "unresolved_company": 32,
            "malformed_identifiers": 2189,
            "appointment_npn_in_agency_file": 35158,
            "appointment_npn_not_in_agency_file": 9,
            "type_counts": ap["appointment_type_counts"],
            "per_agency": ap["per_agency"],
            "per_company": ap["per_company"],
            "more_appointments_is_not_better": True,
            "status_semantics": ap["status_semantics"],
        },
        "authorized_companies": {
            "status": "SOURCE_NOT_ACQUIRED",
            "count": None,
            "tool_url": "https://appscenter.tdi.texas.gov/tdireports/p/externalReports",
            "note": "Interactive TDI company-licensing report. No deterministic bulk export landed. Appointment NAIC is a Texas source relationship, not the complete authorized-company universe.",
        },
        "person_licenses": {
            "dataset_id": "kxv3-diwf",
            "rows": 962001,
            "public_directory": False,
            "types_top": {row["license_type"]: int(row["n"]) for row in acq.get("person_licenses", {}).get("types") or [] if row.get("license_type")},
            "person_license_is_not_agency": True,
        },
        "person_appointments": {
            "dataset_id": "bupb-23s9",
            "rows": 4400210,
            "public_directory": False,
        },
        "relationships": {
            "dataset_id": "kvqi-vsrr",
            "rows": 132253,
            "both_npn_rows": 119652,
            "association_type_counts": acq["relationships"]["association_type_counts"],
            "public_directory": False,
            "note": "Non-appointment associations. Designated responsible licensed person is not employment proof. Aggregates only on the public page.",
        },
        "surplus": {
            "dataset_id": "7isd-ex6t",
            "rows": 18816,
            "entity_type_counts": {"INDIVIDUAL": 15047, "FIRM": 3769},
            "license_status_counts": {"Active": 10247, "Inactive": 8569},
            "surplus_license_is_not_insurer_authorization": True,
            "person_rows_not_published_as_directory": True,
            "firm_rows": 3769,
        },
        "title": {
            "dataset_id": "y9ze-ft94",
            "rows": 23115,
            "distinct_title_agency_license": 850,
            "distinct_underwriter_name": 31,
            "distinct_counties": 254,
            "grain": "active title underwriter appointment by county",
            "title_is_not_general_appointment": True,
            "no_county_pages": True,
        },
        "complaints": {
            "dataset_id": "ubdr-4uff",
            "rows": 305156,
            "received_date_min": "2011-04-28",
            "received_date_max": "2026-08-31",
            "year_counts": {
                "2011": 15, "2012": 11982, "2013": 19853, "2014": 23019, "2015": 22802,
                "2016": 27057, "2017": 25395, "2018": 28192, "2019": 20393, "2020": 13434,
                "2021": 17049, "2022": 16267, "2023": 20450, "2024": 22342, "2025": 21788, "2026": 15118,
            },
            "confirmed_yes": 56726,
            "confirmed_no": 248430,
            "respondent_type": {"Organization": 292138, "Individual": 13018},
            "respondent_role_top": {
                "Ins Co - Licensed/Active": 229381,
                "Self-Funded / Erisa": 22792,
                "Health Maintenance Org": 21724,
                "Agent": 12835,
                "Insurance Agency": 6567,
            },
            "reason_counts_top": acq["complaints"]["reason_counts_top"],
            "line_counts_top": acq["complaints"]["line_counts_top"],
            "complaint_is_not_violation": True,
            "raw_count_is_not_quality": True,
            "name_only_attach": "UNSAFE",
            "identity_for_adverse": "Respondent ID / NAIC when source-native and exact",
            "grain": "one row per person or organization named in a complaint; complaint numbers can repeat",
        },
        "complaint_index": {
            "dataset_id": "pa9u-9s9w",
            "rows": 5966,
            "distinct_naic": 1282,
            "native_label": "TDI complaint index",
            "not_trusthub_score": True,
            "years": acq["complaint_index"]["year_counts"],
            "line_counts": acq["complaint_index"]["line_counts_top"],
            "zero_index_rows": 3712,
            "greater_than_one_rows": 786,
            "fields": [
                "Organization ID",
                "Company name",
                "NAIC ID",
                "Total number of confirmed complaints",
                "Total policies",
                "Complaint Index",
                "Year of policy count",
                "Line of coverage",
            ],
            "methodology": "TDI publishes confirmed-complaint counts, in-force policy counts, and a native Complaint Index by NAIC, year, and line. Insurance Code §521.052 requires justified (confirmed) complaints expressed relative to policies in force on December 31 of the preceding year. Observed index values scale with confirmed-complaint rate versus line-year policy exposure. 0 means no confirmed complaints in that slice. This snapshot preserves TDI's field and does not rescale it into a TrustHub score.",
            "one_point_zero": "Not treated as an independently certified 'average' badge. Near-1 values sit near the implied line-year baseline; exact 1.0 is rare because the ratio is continuous.",
            "attachment": "Exact NAIC only. Name-only is UNSAFE.",
        },
        "rate_filings": {
            "dataset_id": "iubg-btfs",
            "rows": 18001,
            "distinct_company_name": 474,
            "distinct_serff": 15035,
            "status_counts": {"Closed": 17757, "Pending": 244},
            "closed_type_counts": {"Reviewed": 17009, "Withdrawn": 524, "blank_pending": 244, "Rejected": 224},
            "line_counts": acq["rate_filings"]["line_counts"],
            "received_date_min": "2009-01-01",
            "received_date_max": "2026-09-01",
            "rate_filing_is_not_consumer_premium": True,
            "requested_is_not_approved_unless_status_proves": True,
            "name_only_attach": "UNSAFE",
            "identity": "Company name is source-native; attach to NAIC only when an exact company source supplies NAIC. SERFF ID identifies a filing.",
        },
        "enforcement": {
            "status": "NO_STRUCTURED_BULK",
            "access": "OPEN_SEARCH_OR_PDF",
            "rows": None,
            "note": "Bounded catalog pass found no machine-readable TDI disciplinary-order roster on data.texas.gov. Did not scrape search portals or harvest PDFs.",
        },
        "residual_property": {
            "twia": {
                "name": "Texas Windstorm Insurance Association",
                "url": "https://www.twia.org/",
                "status": "OFFICIAL_PROGRAM_NOT_BULK_ROSTER",
            },
            "fair_plan": {
                "status": "NOT_A_CALIFORNIA_FAIR_PLAN_EQUIVALENT_IN_TDI_SODA",
            },
            "no_property_risk_score": True,
            "no_county_insurance_pages": True,
        },
        "findings": [
            {
                "id": "F1",
                "text": "TDI's official agency file has 56,625 license rows and 43,597 distinct agency NPN identities. That is a business-license universe, not a person directory and not a combined 'Texas insurance providers' count.",
            },
            {
                "id": "F2",
                "text": "The official active agency-appointment file has 622,019 rows linking 35,167 agency NPN values to 1,414 NAIC company codes. 619,830 rows have both an exact numeric NPN and an exact NAIC. Appointment count is not quality.",
            },
            {
                "id": "F3",
                "text": "TDI publishes 305,156 complaint-name rows (2011-04-28 through 2026-08-31) and a 5,966-row complaint-index file with NAIC, confirmed complaints, policy counts, year, and line. A complaint is not a violation. The TDI complaint index is not a TrustHub score.",
            },
            {
                "id": "F4",
                "text": "TDI home-and-auto rate filings number 18,001 (15,035 distinct SERFF IDs). A rate filing is not a consumer premium. Closed/Reviewed is not an individual's quoted rate.",
            },
            {
                "id": "F5",
                "text": "Title appointments are a separate 23,115-row county×underwriter graph (850 title-agency licenses, 31 underwriter names, 254 counties). Surplus-lines status detail has 18,816 rows (3,769 firm / 15,047 individual). Neither is the standard agency↔company appointment universe.",
            },
        ],
        "evidence_depth": [
            {"source": "TDI agencies", "dataset_id": "3yqc-fcdt", "as_of": "2026-09-03", "grain": "agency license row", "rows": 56625, "identity_key": "NPN + TDI license", "class": "business", "public": True, "limitations": "No phone/email/street. state=TX is listed state, not the licensed universe."},
            {"source": "Agency appointments", "dataset_id": "avjc-7u2m", "as_of": "2026-09-03", "grain": "active agency-company appointment", "rows": 622019, "identity_key": "NPN + NAIC", "class": "business relationship", "public": True, "limitations": "Active-only. Appointment count is not quality."},
            {"source": "Authorized companies", "dataset_id": None, "as_of": None, "grain": "company authorization", "rows": None, "identity_key": "NAIC + TDI EID", "class": "company", "public": False, "limitations": "SOURCE_NOT_ACQUIRED. Interactive report tool."},
            {"source": "Person licenses", "dataset_id": "kxv3-diwf", "as_of": "2026-09-03", "grain": "person license row", "rows": 962001, "identity_key": "person NPN", "class": "person", "public": False, "limitations": "Intentionally unpublished directory."},
            {"source": "Person appointments", "dataset_id": "bupb-23s9", "as_of": "2026-09-03", "grain": "person-company appointment", "rows": 4400210, "identity_key": "person NPN + NAIC", "class": "person", "public": False, "limitations": "Intentionally unpublished graph."},
            {"source": "Relationships", "dataset_id": "kvqi-vsrr", "as_of": "2026-09-03", "grain": "non-appointment association", "rows": 132253, "identity_key": "NPN/EIN/NAIC", "class": "mixed", "public": False, "limitations": "Aggregates only. Not employment proof."},
            {"source": "Surplus lines", "dataset_id": "7isd-ex6t", "as_of": "2026-09-03", "grain": "surplus license status", "rows": 18816, "identity_key": "TDI surplus license", "class": "mixed person/firm", "public": True, "limitations": "Firm vs individual kept separate. Not insurer authorization."},
            {"source": "Title appointments", "dataset_id": "y9ze-ft94", "as_of": "2026-09-03", "grain": "title agency × underwriter × county", "rows": 23115, "identity_key": "TDI title license", "class": "business", "public": True, "limitations": "Not a county page. Not general P&C appointments."},
            {"source": "Complaints", "dataset_id": "ubdr-4uff", "as_of": "2026-09-03", "grain": "named party on a complaint", "rows": 305156, "identity_key": "Respondent ID when exact", "class": "mixed", "public": True, "limitations": "Complaint ≠ violation. Name-only attach UNSAFE."},
            {"source": "Complaint index", "dataset_id": "pa9u-9s9w", "as_of": "2026-09-03", "grain": "company × year × line statistic", "rows": 5966, "identity_key": "NAIC ID", "class": "company", "public": True, "limitations": "TDI index, not a TrustHub score."},
            {"source": "Rate filings", "dataset_id": "iubg-btfs", "as_of": "2026-09-03", "grain": "home/auto rate filing", "rows": 18001, "identity_key": "SERFF ID; NAIC only if exact", "class": "company filing", "public": True, "limitations": "Not a consumer premium."},
            {"source": "Enforcement", "dataset_id": None, "as_of": None, "grain": "order/action", "rows": None, "identity_key": "NPN/NAIC/TDI license", "class": "mixed", "public": False, "limitations": "No structured bulk found."},
            {"source": "Property/residual", "dataset_id": None, "as_of": None, "grain": "program", "rows": None, "identity_key": None, "class": "market", "public": False, "limitations": "TWIA is an official program without a bulk roster in this snapshot."},
        ],
        "trace": {
            "agency_rows": {"source": "3yqc-fcdt", "value": 56625, "grain": "license row", "clock": "2026-09-03", "filters": "none", "limitations": "Multiple licenses per NPN."},
            "distinct_npn": {"source": "3yqc-fcdt", "value": 43597, "grain": "NPN", "clock": "2026-09-03", "filters": "nonempty NPN", "limitations": "Exact business identity."},
            "agency_appointments": {"source": "avjc-7u2m", "value": 622019, "grain": "active appointment", "clock": "2026-09-03", "filters": "active dataset", "limitations": "Not quality."},
            "distinct_companies": {"source": "avjc-7u2m", "value": 1414, "grain": "NAIC", "clock": "2026-09-03", "filters": "numeric NAIC", "limitations": "Not complete authorized-company universe."},
            "complaints": {"source": "ubdr-4uff", "value": 305156, "grain": "named-party row", "clock": "2026-09-03", "filters": "none", "limitations": "Complaint numbers repeat; complaint ≠ violation."},
            "complaint_index": {"source": "pa9u-9s9w", "value": 5966, "grain": "NAIC × year × line", "clock": "2026-09-03", "filters": "none", "limitations": "TDI index, not TrustHub score."},
            "rate_filings": {"source": "iubg-btfs", "value": 18001, "grain": "filing", "clock": "2026-09-03", "filters": "home and auto", "limitations": "Not consumer premium."},
        },
        "gaps": [
            "Complete TDI authorized-company export was not acquired.",
            "Agency business phone, email, website, and street address are not in the official agency SODA file.",
            "No structured TDI disciplinary-order bulk file was found.",
            "Appointment type is not a full product-level authority matrix.",
            "Company exposure denominators exist in the TDI complaint index; they are not a TrustHub denominator.",
            "Person-level market counts are intentionally unpublished as a directory.",
        ],
        "identity_rules": {
            "EXACT": ["NPN", "NAIC", "TDI source license number"],
            "HIGH_CONFIDENCE": "exact legal business name + exact government business address for non-adverse descriptive linkage only",
            "REVIEW_REQUIRED": ["name + city", "DBA mismatch"],
            "UNSAFE": ["name only", "phone only"],
            "adverse_requires_exact": True,
        },
        "guardrails": [
            "AGENCY != INDIVIDUAL AGENT",
            "APPOINTMENT != LICENSE",
            "APPOINTMENT COUNT != QUALITY",
            "MORE COMPANIES != BETTER AGENCY",
            "NAIC IDENTITY != TEXAS AUTHORIZATION WITHOUT TEXAS EVIDENCE",
            "COMPLAINT != VIOLATION",
            "TDI COMPLAINT INDEX != TRUSTHUB SCORE",
            "RATE FILING != CONSUMER PREMIUM",
            "SURPLUS-LINES LICENSE != INSURER AUTHORIZATION",
            "TITLE APPOINTMENT != GENERAL INSURANCE APPOINTMENT",
            "PERSON LICENSE != BUSINESS AGENCY",
            "MISSING != ZERO",
            "NO TRUST SCORE",
            "NO PAID RANKING",
        ],
    }

    canonical = json.dumps({k: v for k, v in snap.items() if k != "fingerprint"}, sort_keys=True, separators=(",", ":")).encode("utf-8")
    snap["fingerprint"] = hashlib.sha256(canonical).hexdigest()
    dump(LIB / "accepted-snapshot.json", snap)
    dump(ART / "hash-manifest.json", {
        "snapshot_fingerprint": snap["fingerprint"],
        "agencies_csv_sha256": acq["downloads"]["agencies"]["sha256"],
        "appointments_csv_sha256": acq["downloads"]["agency_appointments"]["sha256"],
        "complaints_csv_sha256": acq["downloads"]["complaints"]["sha256"],
        "complaint_index_csv_sha256": acq["downloads"]["complaint_index"]["sha256"],
        "rate_filings_csv_sha256": acq["downloads"]["rate_filings"]["sha256"],
        "public_agencies_bytes": (PUB / "texas-tdi-agencies.json").stat().st_size,
        "public_companies_bytes": (PUB / "texas-tdi-appointment-companies.json").stat().st_size,
    })
    print("fingerprint", snap["fingerprint"], flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
