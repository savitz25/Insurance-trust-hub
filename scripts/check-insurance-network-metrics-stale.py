"""Fail closed if insurance-network-metrics-v1 is stale versus snapshots or live graph.

File coupling always runs. Live database comparison runs when SUPABASE_URL
and SUPABASE_SERVICE_ROLE_KEY are set. Does not print secrets. Does not write the manifest.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
METRICS_PATH = ROOT / "data" / "home" / "insurance-network-metrics-v1.json"
TX_PATH = ROOT / "lib" / "texas-intelligence" / "accepted-snapshot.json"
FL_PATH = ROOT / "data" / "reports" / "fl-ins-006-state-snapshot.json"
NJ_PATH = ROOT / "lib" / "new-jersey-intelligence" / "accepted-snapshot.json"
CA_PATH = ROOT / "lib" / "california-intelligence" / "accepted-snapshot.json"
FL_MC = ROOT / "data" / "reports" / "fl-ins-004-market-exam-census.json"
FL_FIN = ROOT / "data" / "reports" / "fl-ins-004-financial-exam-census.json"
CENSUS = ROOT / "data" / "reports" / "ins-nat-final-006-census.json"


def load_env() -> None:
    for name in (".env.local",):
        env_path = ROOT / name
        if env_path.exists():
            _parse_env(env_path)
    extra = Path(r"C:\Users\makei\insurance-trust-hub\.env.local")
    if extra.exists():
        _parse_env(extra)


def _parse_env(env_path: Path) -> None:
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def metric_value(metrics: dict[str, Any], key: str) -> int | None:
    for item in metrics["metrics"]:
        if item["key"] == key:
            return item["value"]
    raise SystemExit(f"Missing metric {key}")


def check_files() -> dict[str, Any]:
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    tx = json.loads(TX_PATH.read_text(encoding="utf-8"))
    fl = json.loads(FL_PATH.read_text(encoding="utf-8"))
    nj = json.loads(NJ_PATH.read_text(encoding="utf-8"))
    ca = json.loads(CA_PATH.read_text(encoding="utf-8"))
    fl_mc = json.loads(FL_MC.read_text(encoding="utf-8"))
    fl_fin = json.loads(FL_FIN.read_text(encoding="utf-8"))
    census = json.loads(CENSUS.read_text(encoding="utf-8"))
    errors: list[str] = []
    if metrics.get("schemaVersion") != "insurance-network-metrics-v1":
        errors.append(f"schemaVersion {metrics.get('schemaVersion')}")
    if metrics.get("texas", {}).get("snapshotFingerprint") != tx.get("fingerprint"):
        errors.append("Texas snapshot fingerprint drifted; regenerate insurance-network-metrics-v1")
    if metrics.get("newJersey", {}).get("snapshotFingerprint") != nj.get("fingerprint"):
        errors.append("New Jersey snapshot fingerprint drifted; regenerate insurance-network-metrics-v1")
    if metrics.get("california", {}).get("snapshotFingerprint") != ca.get("fingerprint"):
        errors.append("California snapshot fingerprint drifted; regenerate insurance-network-metrics-v1")
    if metric_value(metrics, "appointments") != tx["appointments"]["rows"]:
        errors.append("Texas appointments drifted")
    if metric_value(metrics, "consumer_complaint_observations") != tx["complaints"]["rows"]:
        errors.append("Texas complaints drifted")
    if metric_value(metrics, "rate_filing_observations") != tx["rate_filings"]["rows"]:
        errors.append("Texas rate filings drifted")
    if metric_value(metrics, "market_conduct_examinations") != fl_mc["reports"]:
        errors.append("Florida market-conduct listings drifted")
    if metric_value(metrics, "florida_financial_examinations") != fl_fin["reports"]:
        errors.append("Florida financial-exam listings drifted")
    if metrics["florida"]["agenciesWithFlCredential"] != fl["agencyMetrics"]["distinct_agencies_with_fl_credential"]:
        errors.append("Florida credentialed agencies drifted")
    if metric_value(metrics, "texas_authorized_companies") is not None:
        errors.append("Texas authorized companies must remain NOT_ACQUIRED / null")
    if metric_value(metrics, "ca_admitted_insurer_universe") is not None:
        errors.append("California admitted universe must remain NOT_ACQUIRED / null")
    if metrics["rejectedTotals"]["combinedInsuranceCompanies"]["status"] != "REJECTED":
        errors.append("combined insurance companies must remain REJECTED")
    if set(metrics["publication"]["publishedStateIntelligencePaths"]) != {
        "/florida",
        "/texas",
        "/new-jersey",
        "/california",
    }:
        errors.append("published state intelligence paths drifted")
    if census["entities"]["agency"] != metrics["nationalGraph"]["agencies"] and os.environ.get("REQUIRE_LIVE_CENSUS_MATCH") == "1":
        errors.append("checked-in census agencies drifted from manifest")
    if errors:
        raise SystemExit("STALE/INVALID insurance-network-metrics-v1:\n- " + "\n- ".join(errors))
    return {"metrics": metrics, "census": census}


def rest_count(base: str, key: str, table: str, query: str = "") -> int:
    url = f"{base}/rest/v1/{table}?select=id"
    if query:
        url += f"&{query}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Prefer": "count=exact",
            "Range": "0-0",
            "Range-Unit": "items",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            tail = (resp.headers.get("content-range") or "").split("/")[-1]
            return int(tail) if tail and tail != "*" else 0
    except urllib.error.HTTPError as exc:
        tail = (exc.headers.get("content-range") or "").split("/")[-1]
        if tail and tail != "*":
            return int(tail)
        raise


def check_live(metrics: dict[str, Any]) -> None:
    base = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not base or not key:
        print("live check skipped: SUPABASE_URL / service role not set", flush=True)
        return
    expected = {
        "agencies": ("national_entities", "entity_kind=eq.agency", metrics["nationalGraph"]["agencies"]),
        "persons": ("national_entities", "entity_kind=eq.person", metrics["nationalGraph"]["persons"]),
        "legalInsurers": ("national_entities", "entity_kind=eq.legal_insurer", metrics["nationalGraph"]["legalInsurers"]),
        "cms": ("cms_marketplace_observations", "", metrics["nationalGraph"]["cmsMarketplaceObservations"]),
        "directory": ("providers", "", metrics["nationalGraph"]["publicDirectoryListings"]),
        "appointedBy": ("national_relationships", "relationship_type=eq.appointed_by", metrics["nationalGraph"]["appointedBy"]),
        "regulatoryEvidence": ("regulatory_evidence", "", metrics["nationalGraph"]["regulatoryEvidence"]),
    }
    errors: list[str] = []
    for name, (table, query, published) in expected.items():
        actual = rest_count(base, key, table, query)
        if actual != published:
            errors.append(f"live {name}={actual} != published {published}")
    if errors:
        raise SystemExit(
            "STALE insurance-network-metrics-v1 versus production graph:\n- "
            + "\n- ".join(errors)
            + "\nRegenerate with node --import tsx scripts/build_network_metrics_v1.mjs"
        )
    print("live production comparison ok", flush=True)


def main() -> int:
    load_env()
    files = check_files()
    print("file coupling ok", flush=True)
    check_live(files["metrics"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
