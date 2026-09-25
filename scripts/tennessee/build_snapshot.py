#!/usr/bin/env python3
"""TN-INS-001: build the accepted Tennessee insurance snapshot from committed TDCI extracts.

Stdlib only. Inputs are the committed extracts in data/tennessee/tn-ins-001/ (written from the raw
captures by extract_tdci.py), the national legal-insurer identity index and the national metric
census. `--check` rebuilds every output and fails on any drift; CI runs it without raw captures.

Rules: NAIC is the only company identity key and NAIC 99999 is a placeholder, not an identity.
Company types and status reasons stay source-native and are never added into one total. Company
actions, examinations and producer discipline print no NAIC and stay standalone. No graph writes.
"""
from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/tennessee/tn-ins-001"
LIB = ROOT / "lib/tennessee-intelligence"
SPINE = ROOT / "data/reports/ins-insurer-006-identity-index.json"
CENSUS = ROOT / "data/home/insurance-metric-census-r2-04.json"
OUT_SNAPSHOT = LIB / "accepted-snapshot.json"

VERSION = "insurance-tn-state-intel-v1"
SNAPSHOT_AS_OF = "2026-09-25"
PLACEHOLDER_NAIC = "99999"
EXPECTED = {"raw_rows": 2116, "distinct_naic": 2029, "exact_matches": 2022, "placeholder_rows": 72}
HUB_PATHS = ["/hubs/tennessee", "/hubs/tennessee/nashville", "/hubs/tennessee/memphis", "/hubs/tennessee/knoxville",
             "/hubs/tennessee/chattanooga"]
HUB_FILES = ["nashville", "memphis", "knoxville", "chattanooga"]


def need(cond: bool, message: str) -> None:
    if not cond:
        sys.exit(f"TN-INS-001 build: {message}")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha_obj(obj: object) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def excel_serial(raw: str) -> str | None:
    if not raw.strip():
        return None
    need(raw.strip().isdigit(), f"STATUS_DATE {raw!r} is not an Excel serial day")
    return (date(1899, 12, 30) + timedelta(days=int(raw))).isoformat()


def ordered(counter: Counter) -> dict:
    return dict(sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])))


def licensed(extract: dict, spine: dict[str, str]) -> tuple[dict, dict, dict]:
    cols = extract["columns"]
    rows = [dict(zip(cols, r)) for r in extract["rows"]]
    blank = [r for r in rows if not any(v.strip() for v in r.values())]
    listed = [r for r in rows if r not in blank]
    with_naic = [r for r in listed if r["NAIC_COCODE"].strip()]
    need(all(len(r["NAIC_COCODE"].strip()) == 5 and r["NAIC_COCODE"].strip().isdigit() for r in with_naic), "NAIC shape")
    placeholder = [r for r in with_naic if r["NAIC_COCODE"].strip() == PLACEHOLDER_NAIC]
    exact = [r for r in with_naic if r["NAIC_COCODE"].strip() != PLACEHOLDER_NAIC]
    by_naic: dict[str, list[dict]] = {}
    for r in exact:
        by_naic.setdefault(r["NAIC_COCODE"].strip(), []).append(r)
    two = {k: v for k, v in by_naic.items() if len(v) > 1}
    need(all(len(v) == 2 for v in two.values()), "an NAIC appears more than twice")
    pairs = Counter(" + ".join(sorted(x["COMPANY_TYPE"] for x in v)) for v in two.values())
    types = Counter(r["COMPANY_TYPE"] for r in listed)
    type_status = {t: ordered(Counter(r["STATUS_REASON"] for r in listed if r["COMPANY_TYPE"] == t)) for t in sorted(types)}
    distinct_by_type = {t: len({r["NAIC_COCODE"].strip() for r in exact if r["COMPANY_TYPE"] == t}) for t in sorted(types)}
    dated = [r for r in listed if r["STATUS_DATE"].strip()]
    tn_dom = [r for r in listed if r["DOMICILE_STATE"] == "TN"]
    matched = sorted(k for k in by_naic if k in spine)
    unmatched = sorted(k for k in by_naic if k not in spine)

    identities = []
    for naic in sorted(by_naic):
        group = by_naic[naic]
        names = []
        for r in group:
            if r["COMPANY_NAME"] not in names:
                names.append(r["COMPANY_NAME"])
        identities.append({
            "naic": naic,
            "name": names[0],
            **({"other_names": names[1:]} if len(names) > 1 else {}),
            "listings": [{"type": r["COMPANY_TYPE"], "status": r["STATUS_REASON"],
                          "status_date_as_published": r["STATUS_DATE"] or None, "status_date": excel_serial(r["STATUS_DATE"])} for r in group],
            "domicile": sorted({r["DOMICILE_STATE"] for r in group})[0] if len({r["DOMICILE_STATE"] for r in group}) == 1 else "/".join(sorted({r["DOMICILE_STATE"] for r in group})),
            "mailing_state": group[0]["MAO_STATE_ABBR"] or None,
            "in_national_identity_index": naic in spine,
        })
    research_rows = [{"name": r["COMPANY_NAME"], "naic_as_published": r["NAIC_COCODE"], "type": r["COMPANY_TYPE"], "status": r["STATUS_REASON"],
                      "domicile": r["DOMICILE_STATE"] or None} for r in placeholder]
    companies = {
        "version": VERSION,
        "source": extract["source"],
        "source_as_of": extract["source_as_of"],
        "identities": identities,
        "placeholder_naic_rows": research_rows,
    }
    section = {
        "source": extract["source"],
        "data_endpoint": extract["data_endpoint"],
        "list_statement": extract["list_statement"],
        "source_as_of": extract["source_as_of"],
        "raw_rows": len(rows),
        "blank_rows": len(blank),
        "listed_rows": len(listed),
        "rows_with_naic": len(with_naic),
        "rows_without_naic": len(listed) - len(with_naic),
        "placeholder_naic": PLACEHOLDER_NAIC,
        "placeholder_rows": len(placeholder),
        "placeholder_rows_by_type": ordered(Counter(r["COMPANY_TYPE"] for r in placeholder)),
        "placeholder_rows_by_status": ordered(Counter(r["STATUS_REASON"] for r in placeholder)),
        "rows_with_exact_naic": len(exact),
        "distinct_naic": len(by_naic),
        "naic_on_two_rows": len(two),
        "naic_on_two_rows_type_pairs": ordered(pairs),
        "company_types": ordered(types),
        "distinct_naic_by_type": distinct_by_type,
        "status_reasons": ordered(Counter(r["STATUS_REASON"] for r in listed)),
        "status_reasons_by_type": type_status,
        "status_dated_rows": len(dated),
        "status_dated_rows_by_status": ordered(Counter(r["STATUS_REASON"] for r in dated)),
        "status_date_format": "Excel serial day number as published; ISO dates are derived (1899-12-30 epoch) and labelled as derived",
        "status_date_range_derived": [min(excel_serial(r["STATUS_DATE"]) for r in dated), max(excel_serial(r["STATUS_DATE"]) for r in dated)],
        "domicile_rows": ordered(Counter(r["DOMICILE_STATE"] for r in listed)),
        "tennessee_domiciled_rows": len(tn_dom),
        "tennessee_domiciled_distinct_naic": len({r["NAIC_COCODE"] for r in tn_dom if r["NAIC_COCODE"] != PLACEHOLDER_NAIC}),
        "tennessee_domiciled_rows_by_type": ordered(Counter(r["COMPANY_TYPE"] for r in tn_dom)),
        "foreign_or_alien_domiciled_rows": len(listed) - len(tn_dom),
        "withheld_columns": extract["withheld_columns"],
        "semantics": {
            "rows_are_not_insurers": True,
            "company_types_are_not_additive": True,
            "domicile_is_not_tennessee_authority": True,
            "tennessee_domicile_is_not_an_authority_class": True,
            "mailing_state_is_not_domicile": True,
            "surplus_lines_eligible_is_not_admitted": True,
            "reinsurer_recognition_is_not_a_direct_writing_license": True,
            "risk_retention_group_registration_is_not_a_license": True,
            "placeholder_naic_is_not_an_identity": True,
            "listing_is_not_a_quote_or_product_offer": True,
        },
    }
    crosswalk = {
        "SOURCE_DISTINCT_NAIC": len(by_naic),
        "EXACT_EXISTING_LEGAL_INSURER_MATCHES": len(matched),
        "UNMATCHED_NAIC": len(unmatched),
        "unmatched": [{"naic": k, "types": sorted({r["COMPANY_TYPE"] for r in by_naic[k]})} for k in unmatched],
        "placeholder_rows_excluded": len(placeholder),
        "exact_match_is_not_profile_attachment": True,
        "graph_write": False,
    }
    return section, crosswalk, companies


def monthly(extract: dict, tn_naic: set[str], spine: dict[str, str]) -> tuple[dict, dict]:
    events = []
    for key, sec in extract["sections"].items():
        cols = sec["columns"]
        naic_cols = [i for i, c in enumerate(cols) if "NAIC" in c]
        for row in sec["rows"]:
            ids = [row[i].replace("*", "").strip() for i in naic_cols]
            events.append({
                "section": key,
                "values": dict(zip(cols, row)),
                "naic": [i for i in ids if len(i) == 5 and i.isdigit()],
                "other_identifiers": [i for i in ids if i and not (len(i) == 5 and i.isdigit())],
                "new_since_last_update": any("*" in c for c in row),
            })
    naic_events = [e for e in events if e["naic"]]
    section = {
        "source": extract["source"],
        "source_as_of": extract["source_as_of"],
        "asterisk_statement": extract["asterisk_statement"],
        "page_last_updated_statement": extract["page_last_updated_statement"],
        "event_rows_by_section": {k: len(v["rows"]) for k, v in extract["sections"].items()},
        "suspensions_published_none": extract["sections"]["suspensions"]["published_none_row"],
        "event_rows": len(events),
        "naic_keyed_event_rows": len(naic_events),
        "event_rows_with_other_identifier_only": sum(1 for e in events if not e["naic"] and e["other_identifiers"]),
        "event_naic_codes": len({n for e in naic_events for n in e["naic"]}),
        "event_naic_on_current_licensed_list": len({n for e in naic_events for n in e["naic"] if n in tn_naic}),
        "event_naic_in_national_identity_index": len({n for e in naic_events for n in e["naic"] if n in spine}),
        "new_since_last_update_rows": sum(1 for e in events if e["new_since_last_update"]),
        "event_is_not_a_company": True,
        "not_a_second_company_census": True,
        "exact_naic_only": True,
    }
    return section, {"version": VERSION, "source": extract["source"], "source_as_of": extract["source_as_of"], "events": events}


def actions(extract: dict) -> dict:
    lines = extract["lines"]
    dated = [l for l in lines if l["dates"]]
    years = Counter(int(d[:4]) for l in lines for d in l["dates"])
    latest_year = max(years)
    docs = [d for l in lines for d in l["documents"]]
    recent = [{"caption_as_listed": l["caption_as_listed"], "dates": [d for d in l["dates"] if d.startswith(str(latest_year))],
               "signed_version_on_request": l["signed_version_on_request"]}
              for l in lines if any(d.startswith(str(latest_year)) for d in l["dates"])]
    need(all(r["caption_as_listed"] for r in recent), "a latest-year caption was withheld")
    return {
        "source": extract["source"],
        "list_date": None,
        "index_lines": len(lines),
        "top_level_entries": sum(1 for l in lines if l["depth"] == 1),
        "linked_documents": len(docs),
        "pdf_documents": sum(1 for d in docs if d["pdf"]),
        "lines_with_dates": len(dated),
        "lines_marked_multiple_dates": sum(1 for l in lines if l["multiple_dates_as_listed"]),
        "dated_mentions_by_year": {str(k): v for k, v in sorted(years.items())},
        "earliest_date": min(d for l in lines for d in l["dates"]),
        "latest_date": max(d for l in lines for d in l["dates"]),
        "latest_year": latest_year,
        "latest_year_entries": recent,
        "captions_published": sum(1 for l in lines if l["caption_as_listed"]),
        "captions_withheld": sum(1 for l in lines if not l["caption_as_listed"]),
        "captions_withheld_by_reason": ordered(Counter(l["caption_withheld_reason"] for l in lines if l["caption_withheld_reason"])),
        "document_links_withheld": True,
        "action_type_column": "NOT_PRINTED",
        "terms_as_listed": ordered(Counter(t for l in lines for t in l["terms_as_listed"])),
        "signed_version_on_request_lines": sum(1 for l in lines if l["signed_version_on_request"]),
        "exact_attachments": {"EXACT_NAIC_ATTACHMENTS": 0, "EXACT_OTHER_IDENTIFIER_ATTACHMENTS": 0, "NAME_ONLY_ATTACHMENTS": "UNSUPPORTED"},
        "standalone_events": True,
        "not_every_entry_is_punitive": True,
        "entry_is_not_a_finding_unless_the_order_says_so": True,
    }


def exams(extract: dict) -> dict:
    listings = extract["listings"]
    docs = [d for x in listings for d in x["documents"]]
    posted_years = Counter(p[:4] for x in listings for p in x["posted"])
    latest = max(p for x in listings for p in x["posted"])[:4]
    recent = [{"company_as_listed": x["company_as_listed"], "exam_as_of_year": x["exam_as_of_year"], "posted": x["posted"],
               "documents": [{"kind": d["kind"], "url": d["url"]} for d in x["documents"]]}
              for x in listings if any(p.startswith(latest) for p in x["posted"])]
    return {
        "source": extract["source"],
        "listings": len(listings),
        "documents": len(docs),
        "documents_by_kind": ordered(Counter(d["kind"] for d in docs)),
        "exam_as_of_years": [min(x["exam_as_of_year"] for x in listings), max(x["exam_as_of_year"] for x in listings)],
        "listings_by_exam_as_of_year": {str(k): v for k, v in sorted(Counter(x["exam_as_of_year"] for x in listings).items())},
        "listings_without_posting_date": sum(1 for x in listings if not x["posted"]),
        "posted_by_year": dict(sorted(posted_years.items())),
        "latest_posting_year": int(latest),
        "latest_posting_year_listings": recent,
        "pdfs_parsed": False,
        "exact_naic_attachments": 0,
        "name_only_attachment": "UNSUPPORTED",
        "examination_is_not_a_score": True,
    }


def main() -> None:
    check = "--check" in sys.argv
    sources = read_json(SRC / "sources.json")
    lic_x = read_json(SRC / "licensed-companies.json")
    mon_x = read_json(SRC / "monthly-update.json")
    act_x = read_json(SRC / "company-actions-index.json")
    exa_x = read_json(SRC / "company-examinations-index.json")
    pro_x = read_json(SRC / "producer-discipline-census.json")
    con_x = read_json(SRC / "consumer-and-licensing-pages.json")
    spine = {str(r["naic_cocode"]).zfill(5): r["legal_name"] for r in read_json(SPINE)["insurers"]}
    census = read_json(CENSUS)
    for extract in (lic_x, mon_x, act_x, exa_x, pro_x, con_x):
        need(extract["version"] == VERSION, "extract version")

    lic, xw, companies = licensed(lic_x, spine)
    need(lic["raw_rows"] == EXPECTED["raw_rows"] and lic["distinct_naic"] == EXPECTED["distinct_naic"], "licensed-company grain moved; review")
    need(xw["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == EXPECTED["exact_matches"] and lic["placeholder_rows"] == EXPECTED["placeholder_rows"], "crosswalk moved; review")
    tn_naic = {i["naic"] for i in companies["identities"]}
    mon, events = monthly(mon_x, tn_naic, spine)
    act = actions(act_x)
    exa = exams(exa_x)
    hub_records = sum((ROOT / f"lib/hubs/data/{h}-agents.ts").read_text(encoding="utf-8").count("\n    id: '") for h in HUB_FILES)
    credential_states = sorted(census["nationalGraph"]["credentialsByJurisdiction"])

    s = sources
    body = {
        "version": VERSION,
        "ticket": "TN-INS-001",
        "snapshot_as_of": SNAPSHOT_AS_OF,
        "source_as_of": lic["source_as_of"],
        "retrieved_at": s["licensed_companies"]["data_endpoint"]["retrieved_at"],
        "generated_at": None,
        "publication": {"path": "/tennessee", "robots_index": True, "sitemap": True,
                        "h1": "Tennessee insurance companies and TDCI regulatory records"},
        "regulator": {
            "name": "Tennessee Department of Commerce & Insurance — Insurance Division",
            "insurance_url": s["insurance_landing"]["url"],
            "licensed_companies_url": s["licensed_companies"]["page"]["url"],
            "monthly_update_url": s["monthly_update"]["page"]["url"],
            "company_actions_url": s["company_actions"]["page"]["url"],
            "company_examinations_url": s["company_examinations"]["page"]["url"],
            "producer_discipline_url": s["producer_discipline"]["page"]["url"],
            "complaint_url": s["complaints"]["url"],
            "verify_license_url": s["license_verification"]["url"],
            "verify_license_resolves_to": s["license_verification"]["final_url"],
        },
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_tennessee_local_routes": True,
        "licensed_companies": {**lic, "retrieved_at": s["licensed_companies"]["data_endpoint"]["retrieved_at"],
                               "data_endpoint_last_modified": s["licensed_companies"]["data_endpoint"]["last_modified"]},
        "naic_crosswalk": {
            "spine": str(SPINE.relative_to(ROOT)).replace("\\", "/"),
            "spine_legal_insurers": len(spine),
            "read_only": True,
            "graph_write": False,
            "licensed_companies": xw,
        },
        "profile_attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "graph_write": False,
            "note": "Read-only exact NAIC comparison. An exact identity match is not a graph write and not a public profile attachment.",
        },
        "company_activity_updates": {**mon, "retrieved_at": s["monthly_update"]["page"]["retrieved_at"]},
        "company_actions": {**act, "retrieved_at": s["company_actions"]["page"]["retrieved_at"]},
        "company_examinations": {**exa, "retrieved_at": s["company_examinations"]["page"]["retrieved_at"]},
        "producer_discipline": {
            "source": pro_x["source"],
            "retrieved_at": s["producer_discipline"]["page"]["retrieved_at"],
            "linked_entries": pro_x["linked_entries"],
            "distinct_documents": pro_x["distinct_documents"],
            "names_published_here": False,
            "npn_or_license_number_printed": False,
            "action_date_printed_as_field": False,
            "bounded_window": "NOT_TAKEN (no date field; file-name dates are not an official field)",
            "person_grain": True,
            "attached_to_agency_or_insurer": 0,
        },
        "agency_roster": {
            "count": None,
            "coverage": "NOT_ACQUIRED / NO_FREE_BULK_FOUND",
            "verification": "KNOWN",
            "verification_path": "TDCI 'Verify an Insurance License' resolves to the NAIC public license lookup (search-only)",
            "paid_bulk_purchased": False,
            "existing_graph_credential_jurisdictions": credential_states,
            "existing_graph_tn_credentials": "NONE_LOADED",
            "existing_graph_census_retrieved_at": census["retrievedAt"],
            "existing_graph_is_not_tn_agency_census": True,
        },
        "producer_roster": {
            "count": None,
            "coverage": "NOT_ACQUIRED / NO_FREE_BULK_FOUND",
            "verification": "KNOWN",
            "public_person_profiles": 0,
            "npn_is_not_naic": True,
            "producer_is_not_agency": True,
        },
        "complaints": {
            "count": None,
            "coverage": "NOT_ACQUIRED",
            "intake": "KNOWN",
            "source": con_x["complaints"]["source"],
            "statements": con_x["complaints"]["statements"],
            "complaint_data_link_target": con_x["complaints"]["complaint_data_link_target"],
            "tn_company_level_dataset": "NOT_ACQUIRED",
            "note": con_x["complaints"]["complaint_data_link_note"],
            "complaint_is_not_enforcement": True,
            "complaint_ratio_is_not_quality_score": True,
            "years_not_combined": True,
        },
        "reinsurers_and_jurisdictions": {k: v for k, v in con_x["reinsurers_and_jurisdictions"].items()},
        "company_types_page": con_x["company_types_page"],
        "pre_existing_hubs": {
            "paths": HUB_PATHS,
            "curated_agent_records_in_code": hub_records,
            "source": "lib/hubs/data/*-agents.ts (curated research catalog, not TDCI data)",
            "used_by_this_page": False,
            "note": "Pre-existing Tennessee market hubs. They are not a TDCI license census and this sprint does not change them.",
        },
        "capabilities": {
            "licensed_company_list": "KNOWN",
            "naic_identity": "KNOWN",
            "company_type": "KNOWN",
            "status_reason_and_date": "KNOWN",
            "company_activity_updates": "KNOWN",
            "company_actions_index": "KNOWN",
            "company_examinations_index": "KNOWN",
            "producer_verification": "KNOWN",
            "agency_verification": "KNOWN",
            "producer_bulk": "NOT_ACQUIRED",
            "agency_bulk": "NOT_ACQUIRED",
            "producer_discipline_index": "PARTIAL",
            "complaint_intake": "KNOWN",
            "company_complaint_data": "NOT_ACQUIRED",
            "placeholder_naic_reinsurer_identity": "UNKNOWN",
            "name_only_adverse_join": "UNSUPPORTED",
            "combined_tennessee_insurance_total": "UNSUPPORTED",
            "local_city_routes": "UNSUPPORTED",
        },
        "rejected_totals": {
            "combined_tennessee_insurance_records": "UNSUPPORTED",
            "company_types_summed": "UNSUPPORTED",
            "licensed_rows_as_insurers": "UNSUPPORTED",
            "events_as_companies": "UNSUPPORTED",
        },
        "expansion_ledger": {
            "NET_NEW_CANONICAL_LEGAL_INSURERS": 0,
            "NET_NEW_CANONICAL_AGENCIES": 0,
            "NET_NEW_CANONICAL_PERSONS": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "GRAPH_WRITES": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "CLAIM_ELIGIBILITY_BROADENED": False,
        },
        "derived_files": {},
    }
    derived = {
        "lib/tennessee-intelligence/accepted-companies.json": companies,
        "lib/tennessee-intelligence/accepted-events.json": events,
    }
    body["derived_files"] = {path: sha_obj(obj) for path, obj in derived.items()}
    body["source_extracts"] = {name: sha_obj(read_json(SRC / name)) for name in sorted(p.name for p in SRC.glob("*.json"))}

    existing = read_json(OUT_SNAPSHOT) if OUT_SNAPSHOT.exists() else None
    body["generated_at"] = existing["generated_at"] if check and existing else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body["fingerprint"] = sha_obj({k: v for k, v in body.items() if k not in {"generated_at", "fingerprint"}})

    outputs = {"lib/tennessee-intelligence/accepted-snapshot.json": body, **derived}
    if check:
        for rel, obj in outputs.items():
            path = ROOT / rel
            need(path.exists(), f"missing {rel}")
            need(read_json(path) == obj, f"{rel} drifted; rebuild with python -X utf8 scripts/tennessee/build_snapshot.py")
        print("check", body["fingerprint"])
        return
    for rel, obj in outputs.items():
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        indent = 2 if rel.endswith("accepted-snapshot.json") else None
        text = json.dumps(obj, indent=indent, ensure_ascii=False, separators=None if indent else (",", ":"))
        path.write_text(text + "\n", encoding="utf-8", newline="\n")
    print(body["fingerprint"])


if __name__ == "__main__":
    main()
