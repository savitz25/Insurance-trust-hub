#!/usr/bin/env python3
"""NY-INS-001A grain tests."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
snap = json.loads((ROOT / "lib/new-york-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
FP = "d4832c3c41c0390d6ffa15755142c6d669e49e6fb0db858f55f761ea894b212e"


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"FAIL {msg}")


def sha(obj: object) -> str:
    body = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


check(snap["version"] == "insurance-ny-state-intel-v1", "version")
check(snap["fingerprint"] == FP, "fingerprint")
check(sha({k: v for k, v in snap.items() if k != "fingerprint"}) == FP, "fingerprint twice")
check(snap["company_directory"]["directory_rows"] == 1054, "1054 rows")
check(snap["company_directory"]["distinct_naic"] == 1054, "1054 naic")
check(snap["company_directory"]["rows_without_naic"] == 0, "0 without naic")
check(snap["company_directory"]["row_is_not_current_authorization"] is True, "dir != auth")
check(snap["company_directory"]["row_is_not_unique_insurer"] is True, "row != unique")
check(snap["company_directory"]["naic_is_not_group"] is True, "naic != group")
check(snap["company_directory"]["company_is_not_agency"] is True, "company != agency")
check(snap["current_authorization"]["count"] is None, "no authorized count")
check(snap["enforcement_actions"]["observation_rows"] == 147, "147 actions")
check(snap["enforcement_actions"]["action_is_not_conviction"] is True, "conviction")
check(snap["enforcement_actions"]["naic_attached"] is False, "enf unattached")
check(snap["auto_complaints"]["observation_rows"] == 128, "128 auto")
check(snap["auto_complaints"]["latest_year"] == "2024", "auto year")
check(snap["auto_complaints"]["dfs_rank_is_not_trusthub_rank"] is True, "dfs rank")
check(snap["auto_complaints"]["ratio_is_not_trust_score"] is True, "ratio")
check(snap["auto_complaints"]["complaint_is_not_violation"] is True, "complaint")
check(snap["health_complaints"]["observation_rows"] is None, "no health total")
check(snap["health_complaints"]["health_is_not_auto"] is True, "health != auto")
check(snap["producer_roster"]["count"] is None, "producer none")
check(snap["agency_roster"]["count"] is None, "agency none")
check(snap["market_conduct"]["examination_is_not_violation"] is True, "exam")
check(snap["identity"]["name_only"] == "UNSAFE", "name-only")
check(snap["naic_crosswalk"]["company_directory"]["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == 1051, "1051")
check(snap["naic_crosswalk"]["company_directory"]["UNMATCHED_NAIC"] == 3, "3 unmatched")
check(snap["naic_crosswalk"]["read_only"] is True, "readonly")
check(snap["expansion_ledger"]["NY_DFS_COMPANY_DIRECTORY_ROWS"] == 1054, "ledger rows")
check(snap["expansion_ledger"]["NY_DFS_DISTINCT_NAIC_IDS"] == 1054, "ledger naic")
check(snap["expansion_ledger"]["NY_DFS_ENFORCEMENT_ACTION_ROWS"] == 147, "ledger enf")
check(snap["expansion_ledger"]["NY_AUTO_COMPLAINT_OBSERVATION_ROWS"] == 128, "ledger auto")
check(snap["expansion_ledger"]["NY_HEALTH_COMPLAINT_OBSERVATION_ROWS"] is None, "ledger health")
check(snap["expansion_ledger"]["NET_NEW_CANONICAL_LEGAL_INSURERS"] == 0, "no new insurers")
check(snap["expansion_ledger"]["NET_NEW_PUBLIC_PROFILES"] == 0, "no profiles")
check(snap["expansion_ledger"]["EXISTING_ORGANIZATIONS_ENRICHED"] == 0, "no enrichment")
check(snap["no_new_york_local_pages"] is True, "no local")
check(snap["no_trust_score"] is True, "no trust score")
check(snap["no_paid_ranking"] is True, "no paid ranking")
check(snap["grain_classification"]["company_directory"] == "VISIBLE_PUBLIC_METRIC", "dir class")
check(snap["grain_classification"]["enforcement_actions"] == "VISIBLE_PUBLIC_METRIC", "enf class")
check(snap["grain_classification"]["auto_complaints"] == "VISIBLE_PUBLIC_METRIC", "auto class")
check(snap["claim_eligibility"]["broadened"] is False, "claim")
mut = copy.deepcopy(snap)
mut["company_directory"]["directory_rows"] = 2138
check(sha({k: v for k, v in mut.items() if k != "fingerprint"}) != FP, "mutation directory")
mut2 = copy.deepcopy(snap)
mut2["current_authorization"]["count"] = 1054
check(sha({k: v for k, v in mut2.items() if k != "fingerprint"}) != FP, "mutation auth")
print("ny-ins-001-tests.py pass")
