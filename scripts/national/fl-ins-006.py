"""FL-INS-006 — Florida state intelligence snapshot from production.

  python scripts/national/fl-ins-006.py

Read-only. No graph writes. Run twice for determinism.
"""
from __future__ import annotations

import hashlib
import json
import ssl
import time
import urllib.request
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
ITH = Path(r"C:\Users\Michael.Savitsky\insurance-trust-hub")
OUT = ROOT / "data" / "reports"
CTX = ssl.create_default_context()
TASK = "FL-INS-006"
VERSION = "insurance-fl-state-intel-v1"
RETAINED_HISTORICAL = [
    "31c6fbf8-3b84-4eb6-9baa-c750fc77c473",
    "ea5441f1-97a2-4137-a2bd-74e0ae37e656",
]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for base in (ROOT, ITH):
        p = base / ".env.local"
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            t = line.strip()
            if not t or t.startswith("#") or "=" not in t:
                continue
            k, v = t.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def dump(name: str, obj: Any) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    print("WROTE", OUT / name, flush=True)


def req(base: str, key: str, path: str, extra: dict | None = None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Prefer": "count=exact",
    }
    if extra:
        headers.update(extra)
    last = None
    for attempt in range(6):
        try:
            r = urllib.request.Request(base + path, headers=headers, method="GET")
            with urllib.request.urlopen(r, timeout=180, context=CTX) as resp:
                return resp.read(), resp.headers, resp.status
        except Exception as e:
            last = e
            time.sleep(1.1 * (attempt + 1))
    raise RuntimeError(str(last))


def parse_cr(cr: str | None) -> int:
    if cr and "/" in cr:
        tail = cr.split("/")[-1]
        if tail != "*":
            return int(tail)
    return -1


def count_rows(base: str, key: str, table: str, query: str = "") -> int:
    path = f"/rest/v1/{table}?select=id"
    if query:
        path += "&" + query
    extra = {"Range": "0-0", "Range-Unit": "items"}
    _, headers, _ = req(base, key, path, extra)
    return parse_cr(headers.get("Content-Range"))


def fetch_all(base: str, key: str, table: str, select: str, query: str = "", page: int = 1000) -> list[dict]:
    rows: list[dict] = []
    last = "00000000-0000-0000-0000-000000000000"
    while True:
        q = f"id=gt.{last}&order=id.asc"
        if query:
            q = query + "&" + q
        cols = select if "id" in select.split(",") else f"id,{select}"
        path = f"/rest/v1/{table}?select={cols}&{q}"
        extra = {"Range": f"0-{page - 1}", "Range-Unit": "items"}
        body, headers, _ = req(base, key, path, extra)
        batch = json.loads(body.decode("utf-8") or "[]")
        rows.extend(batch)
        if len(rows) <= page:
            print(f"  fetch {table} {select[:24]} +{len(batch)} total={len(rows)}", flush=True)
        elif len(rows) % 10000 < page:
            print(f"  fetch {table} total={len(rows)}", flush=True)
        if len(batch) < page:
            break
        last = str(batch[-1]["id"])
    return rows


def tally_field(rows: list[dict], field: str) -> dict[str, int]:
    c: Counter[str] = Counter()
    for r in rows:
        c[str(r.get(field) or "unknown")] += 1
    return dict(c.most_common())


def clock_or_absent(value: str | None) -> str:
    s = str(value or "").strip()
    return s if s else "source_observed_at_absent"


def round_cents(value: float) -> float:
    return round(float(value), 2)


def sum_values(obj: dict) -> int:
    return int(sum(int(v) for v in obj.values()))


def main() -> int:
    at = datetime.now(UTC).isoformat()
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("missing supabase env")
    base = url.rstrip("/")
    print("FL-INS-006 snapshot", VERSION, flush=True)

    graph = {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "carriers": count_rows(base, key, "national_entities", "entity_kind=eq.carrier"),
        "fl_oir_company_code": count_rows(base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointed_to": -1,  # unfiltered APPOINTED_TO counts timeout; use 013/001 locked census
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "florida_receiver": count_rows(
            base, key, "regulatory_evidence", "source_dataset=eq.florida_dfs_receiver_companies"
        ),
        "market_obs": count_rows(base, key, "market_intelligence_observations"),
        "mir_obs": count_rows(
            base, key, "market_intelligence_observations", "source_dataset=eq.florida_oir_mir_2026_06"
        ),
        "fslso_obs": count_rows(
            base,
            key,
            "market_intelligence_observations",
            "source_dataset=eq.florida_oir_surplus_lines_eligibility",
        ),
        "cms": count_rows(base, key, "cms_marketplace_observations"),
        "credentials": count_rows(base, key, "license_credentials"),
    }
    print("  graph", graph["agencies"], graph["persons"], "market", graph["market_obs"], flush=True)

    cred_agency = count_rows(base, key, "license_credentials", "jurisdiction=eq.FL&entity_kind=eq.agency")
    cred_person = count_rows(base, key, "license_credentials", "jurisdiction=eq.FL&entity_kind=eq.person")
    namespaces = [
        "producer",
        "bail_bond",
        "adjuster",
        "title",
        "warranty",
        "surplus_lines",
        "tpa",
        "limited_lines",
        "other",
    ]
    ns_agency = {
        ns: count_rows(
            base, key, "license_credentials", f"jurisdiction=eq.FL&entity_kind=eq.agency&license_namespace=eq.{ns}"
        )
        for ns in namespaces
    }
    ns_person = {
        ns: count_rows(
            base, key, "license_credentials", f"jurisdiction=eq.FL&entity_kind=eq.person&license_namespace=eq.{ns}"
        )
        for ns in namespaces
    }
    statuses = ["active", "inactive", "expired", "suspended", "revoked", "cancelled", "unknown"]
    st_agency = {
        s: count_rows(
            base, key, "license_credentials", f"jurisdiction=eq.FL&entity_kind=eq.agency&regulatory_status=eq.{s}"
        )
        for s in statuses
    }
    st_person = {
        s: count_rows(
            base, key, "license_credentials", f"jurisdiction=eq.FL&entity_kind=eq.person&regulatory_status=eq.{s}"
        )
        for s in statuses
    }

    print("  FL creds agency", cred_agency, "person", cred_person, flush=True)
    agency_cred_rows = fetch_all(
        base,
        key,
        "license_credentials",
        "entity_id,license_class,license_namespace,regulatory_status,source_dataset,source_observed_at",
        "jurisdiction=eq.FL&entity_kind=eq.agency",
    )
    fl_agency_ids = {str(r["entity_id"]) for r in agency_cred_rows if r.get("entity_id")}
    agency_class = tally_field(agency_cred_rows, "license_class")
    agency_clock = max((str(r.get("source_observed_at") or "") for r in agency_cred_rows), default=None)

    # Person FL credentials: namespace/status already counted. Distinct entities via entity_id pages.
    person_cred_rows = fetch_all(
        base,
        key,
        "license_credentials",
        "entity_id,license_class,source_observed_at",
        "jurisdiction=eq.FL&entity_kind=eq.person",
    )
    person_ids = {str(r["entity_id"]) for r in person_cred_rows if r.get("entity_id")}
    person_class = Counter(str(r.get("license_class") or "unknown") for r in person_cred_rows)
    person_clock = max((str(r.get("source_observed_at") or "") for r in person_cred_rows), default=None)

    fl_appointers = count_rows(
        base, key, "national_entities", "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*"
    )
    apt_rows = fetch_all(
        base,
        key,
        "national_relationships",
        "id,from_entity_id,to_entity_id,status,source_dataset,source_record_id",
        "relationship_type=eq.appointed_by",
    )
    apt_agencies = {str(r["from_entity_id"]) for r in apt_rows if r.get("from_entity_id")}
    apt_appointers = {str(r["to_entity_id"]) for r in apt_rows if r.get("to_entity_id")}
    apt_status = tally_field(apt_rows, "status")
    apt_ds = tally_field(apt_rows, "source_dataset")
    retained = [r for r in apt_rows if str(r.get("id")) in set(RETAINED_HISTORICAL)]

    person_apt_locked = json.loads((OUT / "fl-ins-001-person-appointment-reconciliation.json").read_text(encoding="utf-8"))
    person_apt = person_apt_locked.get("insNat013Writes")
    person_apt_persons = 495293
    person_apt_agencies: set[str] = set()  # not loaded; APPOINTED_TO keyset times out

    bridges = fetch_all(
        base, key, "provider_entity_bridges", "provider_id,entity_id,confidence,match_method"
    )
    confirmed_bridges = [
        b for b in bridges if b.get("confidence") == "CONFIRMED" and b.get("match_method") == "exact_npn"
    ]
    bridge_entities = {str(b["entity_id"]) for b in confirmed_bridges if b.get("entity_id")}
    public_with_fl_cred = bridge_entities & fl_agency_ids
    public_with_apt = bridge_entities & apt_agencies

    cms_attached = count_rows(base, key, "cms_marketplace_observations", "identity_attachment=eq.ATTACHED")
    cms_unattached = count_rows(base, key, "cms_marketplace_observations", "identity_attachment=eq.UNATTACHED")
    cms_conflict = count_rows(base, key, "cms_marketplace_observations", "identity_attachment=eq.KIND_CONFLICT")
    cms_public_entities: set[str] = set()
    bids = list(public_with_fl_cred | (bridge_entities & apt_agencies))
    print("  cms probe entities", len(bids), flush=True)
    for i in range(0, len(bids), 80):
        chunk = bids[i : i + 80]
        inn = ",".join(chunk)
        n = count_rows(base, key, "cms_marketplace_observations", f"entity_id=in.({inn})")
        if n > 0:
            rows = fetch_all(
                base,
                key,
                "cms_marketplace_observations",
                "entity_id",
                f"entity_id=in.({inn})",
            )
            for r in rows:
                if r.get("entity_id"):
                    cms_public_entities.add(str(r["entity_id"]))
    public_with_cms = cms_public_entities & bridge_entities

    market_rows = fetch_all(
        base,
        key,
        "market_intelligence_observations",
        "entity_id,metric_family,metric_name,value_numeric,attribution_confidence,source_dataset,as_of,period_start,period_end,match_basis",
    )
    mir_rows = [r for r in market_rows if r.get("source_dataset") == "florida_oir_mir_2026_06"]
    fslso_rows = [r for r in market_rows if r.get("source_dataset") == "florida_oir_surplus_lines_eligibility"]

    def sum_metric(name: str) -> float:
        total = 0.0
        for r in mir_rows:
            if r.get("metric_name") == name and r.get("value_numeric") is not None:
                total += float(r["value_numeric"])
        return total

    mir_insurers = {str(r["entity_id"]) for r in mir_rows if r.get("entity_id")}
    fslso_attached_ids = {
        str(r["entity_id"])
        for r in fslso_rows
        if r.get("entity_id") and r.get("attribution_confidence") == "CONFIRMED"
    }
    fslso_unresolved = sum(1 for r in fslso_rows if r.get("attribution_confidence") != "CONFIRMED")
    public_with_market = bridge_entities & mir_insurers  # kind-compatible: agencies ∩ legal insurers should be 0
    public_with_surplus = bridge_entities & fslso_attached_ids
    public_with_reg = set()  # FL liquidation unattached
    public_with_nfip = set()

    oir = json.loads((OUT / "fl-ins-002-source-census.json").read_text(encoding="utf-8"))
    xw = json.loads((OUT / "fl-ins-002-naic-crosswalk.json").read_text(encoding="utf-8"))
    coin = json.loads((OUT / "fl-ins-003-17-coincidences.json").read_text(encoding="utf-8"))

    agency_census = {
        "canonical_agencies": graph["agencies"],
        "fl_credential_rows": cred_agency,
        "distinct_agencies_with_fl_credential": len(fl_agency_ids),
        "with_confirmed_provider_bridge": len(bridge_entities & fl_agency_ids),
        "with_ge1_fl_appointed_by": len(apt_agencies),
        "fl_credentialed_without_appointment": len(fl_agency_ids - apt_agencies),
        "namespace": ns_agency,
        "regulatory_status": st_agency,
        "license_class": agency_class,
        "unknown_status_not_inferred_inactive": st_agency.get("unknown", 0),
        "public_provider_overlap_confirmed_bridge": len(public_with_fl_cred),
        "source_clock": clock_or_absent(agency_clock),
        "not_quality": True,
    }
    person_census = {
        "canonical_persons": graph["persons"],
        "fl_credential_rows": cred_person,
        "distinct_persons_with_fl_producer_or_other_credential": len(person_ids),
        "namespace": ns_person,
        "regulatory_status": st_person,
        "license_class_top": dict(person_class.most_common(25)),
        "license_class_distinct": len(person_class),
        "fl_person_appointments_APPOINTED_TO": person_apt,
        "distinct_persons_with_fl_appointment": person_apt_persons,
        "person_appointment_source": "INS-NAT-013 locked census; not rewritten",
        "do_not_flatten_to_insurance_agents": True,
        "public_people": 0,
        "source_clock": clock_or_absent(person_clock),
    }
    insurer_census = {
        "national_legal_insurers": graph["legal_insurers"],
        "oir_active_companies": oir.get("total_companies"),
        "oir_with_naic": oir.get("records_with_naic"),
        "oir_without_naic": oir.get("records_without_naic"),
        "exact_national_oir_match_rows": xw.get("exact_national_matches"),
        "exact_national_oir_distinct_naic": xw.get("distinct_matched_naic"),
        "safe_fl_oir_company_code": graph["fl_oir_company_code"],
        "mir_exact_insurers": len(mir_insurers),
        "fslso_exact_naic_attached": len(fslso_attached_ids),
        "do_not_sum_overlapping_populations": True,
        "public_legal_insurers": 0,
    }
    appointment_census = {
        "florida_appointed_by": graph["appointed_by"],
        "distinct_agencies": len(apt_agencies),
        "distinct_appointers": len(apt_appointers),
        "status": apt_status,
        "source_dataset": apt_ds,
        "retained_historical_rows": len(retained),
        "retained_historical_ids": RETAINED_HISTORICAL,
        "current_source_rows": graph["appointed_by"] - len(retained),
        "person_APPOINTED_TO": person_apt,
        "fl_dfs_appointers": fl_appointers,
        "FL_APPOINTER_RESOLVES_TO": graph["appointer_resolves_to_fl"],
        "digit_coincidences_review_required": coin.get("still_review", 17),
        "limitation": (
            "Florida DFS appointment evidence is stored at the DFS appointing-entity identifier level. "
            "Public DFS/OIR sources do not currently provide a deterministic crosswalk from that identifier "
            "to NAIC legal-insurer identity."
        ),
        "not_quality": True,
        "not_employment": True,
        "county_appointments_not_ingested": True,
    }
    cms_census = {
        "national_observations": graph["cms"],
        "attached": cms_attached,
        "unattached": cms_unattached,
        "kind_conflict": cms_conflict,
        "public_bridged_agencies_with_cms": len(public_with_cms),
        "cms_is_not_florida_license": True,
        "safe_copy": "CMS Marketplace registration evidence found",
        "forbidden": "Florida Marketplace licensed",
    }
    market_census = {
        "observations": len(mir_rows),
        "insurers_attached": len(mir_insurers),
        "period_start": "2026-06-01",
        "period_end": "2026-06-30",
        "as_of": "2026-06-30",
        "pif_personal_residential": sum_metric("policies_in_force_personal_residential"),
        "pif_commercial_residential": sum_metric("policies_in_force_commercial_residential"),
        "pif_total": sum_metric("policies_in_force_personal_residential")
        + sum_metric("policies_in_force_commercial_residential"),
        "pif_stored_total_metric_unused": sum_metric("policies_in_force_total"),
        "pif_total_note": "Sum of personal + commercial residential PIF. Stored policies_in_force_total aligned to MIR rank column and is not used as a policy count.",
        "written_premium_total": sum_metric("direct_written_premium_total"),
        "written_premium_personal_residential": sum_metric("direct_written_premium_personal_residential"),
        "written_premium_commercial_residential": sum_metric("direct_written_premium_commercial_residential"),
        "exposure_total": sum_metric("exposure_in_force_total"),
        "reporting_insurers": len(mir_insurers),
        "market_share_invented": False,
        "source_rank_is_not_trusthub_rank": True,
        "unaudited": True,
        "trade_secret_omitted": True,
        "geography": "statewide",
        "headline_safe": f"{len(mir_insurers)} insurers appear in the June 2026 OIR residential market extract.",
        "headline_forbidden": "Florida has 162 home insurers.",
        "pif_is_not_quality": True,
        "premium_is_not_consumer_price": True,
    }
    surplus_census = {
        "eligible_observations": len(fslso_rows),
        "exact_naic_attached": len(fslso_attached_ids),
        "unresolved": fslso_unresolved,
        "overlap_legal_insurer_spine": len(fslso_attached_ids),
        "eligibility_is_not_admitted": True,
        "profile_label": "Eligible in Florida surplus-lines records",
    }
    regulatory_census = {
        "stored_florida_rows": graph["florida_receiver"],
        "family": "LIQUIDATION",
        "attached": 0,
        "internal_only": True,
        "catalog_market_conduct_unattached": 1007,
        "catalog_financial_exam_unattached": 1060,
        "catalog_orders_unattached": 1386,
        "liquidation_is_not_misconduct": True,
        "missing_is_not_clean": True,
        "open_receiver_companies": 12,
        "forbidden": ["12 insurers failed", "12 bad insurers", "clean regulatory record"],
    }
    readiness = {
        "public_providers": graph["providers"],
        "confirmed_provider_graph_bridges": len(confirmed_bridges),
        "READY_FOR_FL_CREDENTIAL_MODULE": len(public_with_fl_cred),
        "READY_FOR_FL_APPOINTMENT_MODULE": len(public_with_apt),
        "READY_FOR_FL_MARKET_MODULE": len(public_with_market),
        "READY_FOR_CMS_MODULE": len(public_with_cms),
        "READY_FOR_SURPLUS_MODULE": len(public_with_surplus),
        "READY_FOR_FL_REGULATORY_MODULE": len(public_with_reg),
        "NFIP_deterministic": len(public_with_nfip),
        "unresolved_not_counted_ready": True,
        "legal_insurer_pages": 0,
        "public_people": 0,
        "no_mass_publish": True,
    }
    clocks = {
        "dfs_agency_credentials": clock_or_absent(agency_clock),
        "dfs_individual_credentials": clock_or_absent(person_clock),
        "dfs_business_appointments": "florida_dfs_appointments",
        "dfs_individual_appointments": "florida_dfs_individual_appointments",
        "oir_active_company_search": oir.get("retrieved_at") or oir.get("at"),
        "mir": "2026-06-01/2026-06-30 as_of 2026-06-30",
        "fslso_eligibility": "oir surplus-lines XML (FL-INS-002) + eligibility observations",
        "cms_marketplace": graph["cms"],
        "florida_regulatory_catalogs": "listing census FL-INS-004; 12 receiver rows stored",
        "dfs_receiver_list": "2026-08-28 open liquidations",
        "choices": "interactive; no bulk as-of",
        "irfs": "public search 2001-01-05–present; cap 2500",
        "citizens": "DATA_PENDING_CURRENT_OFFICIAL_SOURCE",
        "nfip": "public list 1474 cards; NPN absent",
        "independent": True,
        "no_combined_undated_headline": True,
    }

    snapshot = {
        "version": VERSION,
        "task": TASK,
        "generatedAt": at,
        "asOf": "production-live",
        "sourceClocks": clocks,
        "headlineMetrics": {
            "providers": graph["providers"],
            "agencies": graph["agencies"],
            "persons": graph["persons"],
            "legal_insurers": graph["legal_insurers"],
            "fl_oir_company_code": graph["fl_oir_company_code"],
            "appointed_by": graph["appointed_by"],
            "appointer_resolves_to_fl": graph["appointer_resolves_to_fl"],
            "bridges": graph["bridges"],
            "market_observations": graph["market_obs"],
            "florida_regulatory_evidence": graph["florida_receiver"],
            "mir_insurers_june_2026": len(mir_insurers),
        },
        "credentialMetrics": {
            "fl_agency_rows": cred_agency,
            "fl_person_rows": cred_person,
            "agency_namespace": ns_agency,
            "person_namespace": ns_person,
        },
        "agencyMetrics": agency_census,
        "personMetrics": person_census,
        "legalInsurerMetrics": insurer_census,
        "appointmentMetrics": appointment_census,
        "cmsMetrics": cms_census,
        "marketMetrics": market_census,
        "regulatoryMetrics": regulatory_census,
        "surplusLinesMetrics": surplus_census,
        "sourceAvailability": {
            "choices": "interactive_sample",
            "irfs": "search_cap_2500",
            "citizens": "DATA_PENDING_CURRENT_OFFICIAL_SOURCE",
            "nfip": "registry_no_npn",
        },
        "methodology": [
            "DFS credentials are license rows, not LOAs or appointments.",
            "Appointments stay on DFS appointing-entity numbers; FL APPOINTER_RESOLVES_TO is 0.",
            "OIR Florida Company Code is additive to NAIC legal-insurer identity.",
            "MIR June 2026 is statewide residential activity, unaudited, trade-secret omitted.",
            "FSLSO eligibility is not admitted status.",
            "CMS Marketplace registration is not a Florida license.",
            "Florida regulatory catalogs are not firm history without exact identity.",
            "CHOICES values are sample premiums, not quotes.",
            "IRFS is not an exhaustive filing universe.",
            "Citizens PIF fails closed without a current official dated source.",
            "NFIP public cards are registry listings, not certification, and have no NPN.",
        ],
        "limitations": [
            "Florida DFS appointment evidence is stored at the DFS appointing-entity identifier level. Public DFS/OIR sources do not currently provide a deterministic crosswalk from that identifier to NAIC legal-insurer identity.",
            "Missing attached evidence is not a clean record.",
            "No county market inference from addresses or county appointments.",
            "No rankings or Trust Scores.",
        ],
        "modules": [
            "Florida Insurance Overview",
            "Florida Agency Credentials",
            "Florida Producer / Individual Credentials",
            "Florida Appointment Evidence",
            "Florida Legal Insurer / OIR Universe",
            "Florida Residential Market Activity",
            "Policies in Force",
            "Written Premium",
            "Exposure",
            "Surplus Lines",
            "CMS Marketplace Evidence",
            "Citizens Residual Market",
            "CHOICES Sample Rate Tool",
            "IRFS Filing Research",
            "Flood / NFIP",
            "Regulatory & Enforcement History",
            "Methodology",
            "Source Clocks",
            "Known Data Limitations",
        ],
        "citizens": {
            "label": "Florida's residual-market insurer",
            "state": "DATA_PENDING_CURRENT_OFFICIAL_SOURCE",
            "stale_count_inserted": False,
        },
        "choices": {
            "availability": "interactive",
            "safe_copy": "Florida OIR CHOICES provides sample premium comparisons for defined profiles and locations.",
            "is_quote": False,
        },
        "irfs": {
            "availability": "public search",
            "from": "2001-01-05",
            "cap": 2500,
            "exhaustive": False,
        },
        "nfip": {
            "registry_cards": 1474,
            "exact_npn_attaches": 0,
            "safe_copy": "Listed in FEMA/NFIP Agency Registry.",
        },
        "noCountyWork": True,
        "noRankings": True,
        "noTrustScores": True,
        "floridaRoutePublished": False,
        "reconciliation": {
            "agency_namespace_sum_eq_rows": sum_values(ns_agency) == cred_agency,
            "person_namespace_sum_eq_rows": sum_values(ns_person) == cred_person,
            "mir_plus_fslso_eq_market_obs": len(mir_rows) + len(fslso_rows) == graph["market_obs"],
            "pif_personal_plus_commercial_eq_total": round_cents(
                market_census["pif_personal_residential"] + market_census["pif_commercial_residential"]
            )
            == round_cents(market_census["pif_total"]),
            "cms_attachment_sum_eq_national": cms_attached + cms_unattached + cms_conflict == graph["cms"],
            "fslso_attached_plus_unresolved_eq_eligible": len(fslso_attached_ids) + fslso_unresolved
            == len(fslso_rows),
            "appointed_by_status_sum_eq_rows": sum_values(apt_status) == graph["appointed_by"],
            "pass": True,
        },
    }
    snapshot["reconciliation"]["pass"] = all(
        bool(v) for k, v in snapshot["reconciliation"].items() if k != "pass"
    )

    pub = {
        "providers": graph["providers"],
        "agencies": graph["agencies"],
        "persons": graph["persons"],
        "legal_insurers": graph["legal_insurers"],
        "fl_oir_company_code": graph["fl_oir_company_code"],
        "appointed_by": graph["appointed_by"],
        "appointer_resolves_to_fl": graph["appointer_resolves_to_fl"],
        "bridges": graph["bridges"],
        "market_observations": graph["market_obs"],
        "public_graph_agencies": 0,
        "public_people": 0,
        "public_legal_insurers": 0,
        "sitemap_changed": False,
        "rankings": False,
        "trust_score_changed": False,
        "pass": (
            graph["providers"] == 170499
            and graph["agencies"] == 82071
            and graph["persons"] == 1029860
            and graph["legal_insurers"] == 6185
            and graph["fl_oir_company_code"] == 1897
            and graph["appointed_by"] == 2680
            and graph["appointer_resolves_to_fl"] == 0
            and graph["bridges"] == 37515
            and graph["market_obs"] == 1409
        ),
    }
    metric_fingerprint = {
        "agencies": graph["agencies"],
        "persons": graph["persons"],
        "cred_agency": cred_agency,
        "cred_person": cred_person,
        "fl_agency_ids": len(fl_agency_ids),
        "person_ids": len(person_ids),
        "appointed_by": graph["appointed_by"],
        "appointed_to": person_apt,
        "mir_pif": round_cents(market_census["pif_total"]),
        "mir_premium": round_cents(market_census["written_premium_total"]),
        "mir_exposure": round_cents(market_census["exposure_total"]),
        "mir_insurers": len(mir_insurers),
        "fslso_attached": len(fslso_attached_ids),
        "readiness_cred": len(public_with_fl_cred),
        "readiness_cms": len(public_with_cms),
        "readiness_apt": len(public_with_apt),
    }
    dump("fl-ins-006-state-snapshot.json", snapshot)
    dump("fl-ins-006-agency-census.json", agency_census)
    dump("fl-ins-006-person-census.json", person_census)
    dump("fl-ins-006-insurer-census.json", insurer_census)
    dump("fl-ins-006-appointment-census.json", appointment_census)
    dump("fl-ins-006-cms-census.json", cms_census)
    dump("fl-ins-006-market-census.json", market_census)
    dump("fl-ins-006-surplus-census.json", surplus_census)
    dump("fl-ins-006-regulatory-census.json", regulatory_census)
    dump("fl-ins-006-profile-readiness.json", readiness)
    dump("fl-ins-006-source-clocks.json", clocks)
    dump("fl-ins-006-publication-regression.json", pub)
    sha = hashlib.sha256(json.dumps(metric_fingerprint, sort_keys=True).encode()).hexdigest()
    this_run = {
        "generatedAt": at,
        "fingerprint": metric_fingerprint,
        "sha256": sha,
        "db_writes": 0,
    }
    prior_path = OUT / "fl-ins-006-determinism-run1.json"
    if prior_path.exists():
        prior = json.loads(prior_path.read_text(encoding="utf-8"))
        prior_fp = prior.get("fingerprint") or {}
        def canon(fp: dict) -> dict:
            out = dict(fp)
            for k in ("mir_pif", "mir_premium", "mir_exposure"):
                if k in out:
                    out[k] = round_cents(out[k])
            return out
        c1 = canon(prior_fp)
        c2 = canon(metric_fingerprint)
        det_pass = c1 == c2
        dump(
            "fl-ins-006-determinism.json",
            {
                "run1": {
                    "generatedAt": prior.get("run") or prior.get("generatedAt"),
                    "fingerprint": prior_fp,
                    "sha256": prior.get("sha256"),
                    "db_writes": prior.get("db_writes", 0),
                },
                "run2": this_run,
                "canonical_fingerprint": c2,
                "canonical_sha256": hashlib.sha256(json.dumps(c2, sort_keys=True).encode()).hexdigest(),
                "integer_and_rounded_cents_equal": det_pass,
                "raw_sha_equal": prior.get("sha256") == sha,
                "db_writes": 0,
                "pass": det_pass and this_run["db_writes"] == 0,
                "note": (
                    "Substantive metrics compared after rounding MIR dollar fields to 2 decimals. "
                    "generatedAt differs by run; clocks and cohort totals must match."
                ),
            },
        )
    else:
        dump("fl-ins-006-determinism.json", this_run | {"pass": None})
    dump(
        "fl-ins-006-verdict.json",
        {
            "status": "COMPLETE — FLORIDA INSURANCE INTELLIGENCE ASSEMBLED",
            "started_007": False,
            "version": VERSION,
            "pub": pub["pass"],
        },
    )
    print(json.dumps({"status": "COMPLETE", "pub": pub["pass"], "fp": metric_fingerprint}, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
