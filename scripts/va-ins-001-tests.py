#!/usr/bin/env python3
"""VA-INS-001 grain tests."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
snap = json.loads((ROOT / "lib/virginia-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"FAIL {msg}")


check(snap["version"] == "insurance-va-state-intel-v1", "version")
check(snap["fingerprint"] == "fd4e95d83bf1d909e51ee8dc8aaab3d399861d389d81d31c8cdfa70094c613fb", "fingerprint")
check(snap["statistical_report"]["distinct_naic"] == 1546, "1546")
check(snap["statistical_report"]["not_current_authorization"] is True, "stat != auth")
check(snap["statistical_report"]["premium_is_not_quality"] is True, "premium")
check(snap["regulatory_actions"]["observation_rows"] == 124, "actions rows")
check(snap["regulatory_actions"]["distinct_cases"] == 79, "cases")
check(snap["regulatory_actions"]["action_is_not_conviction"] is True, "conviction")
check(snap["regulatory_actions"]["case_is_not_violation_count"] is True, "case != count")
check(snap["market_conduct"]["observation_rows"] == 117, "mc rows")
check(snap["market_conduct"]["examination_is_not_violation"] is True, "exam != violation")
check(snap["complaints"]["complaint_is_not_violation"] is True, "complaint")
check(snap["surplus_lines"]["surplus_is_not_admitted"] is True, "surplus")
check(snap["identity"]["name_only"] == "UNSAFE", "name-only")
check(snap["identity"]["read_only_naic_match_is_not_enrichment"] is True, "readonly")
check(snap["naic_crosswalk"]["statistical_report"]["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == 1541, "1541")
check(snap["naic_crosswalk"]["statistical_report"]["UNMATCHED_NAIC"] == 5, "5 unmatched")
check(snap["naic_crosswalk"]["market_conduct"]["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == 100, "mc 100")
check(snap["producer_roster"]["count"] is None, "producer none")
check(snap["agency_roster"]["count"] is None, "agency none")
check(snap["expansion_ledger"]["NET_NEW_CANONICAL_LEGAL_INSURERS"] == 0, "no new insurers")
check(snap["expansion_ledger"]["NET_NEW_PUBLIC_PROFILES"] == 0, "no profiles")
check(snap["period_end"] == "2025-12-31", "period")
check(snap["reported_as_of"] == "2026-06-01", "reported")
check(snap["no_virginia_county_pages"] is True, "no local")
stat_u = snap["naic_crosswalk"]["statistical_report"]["unmatched_naic"]
act_u = snap["naic_crosswalk"]["regulatory_actions"]["unmatched_naic"]
mc_u = snap["naic_crosswalk"]["market_conduct"]["unmatched_naic"]
check("15791" in stat_u, "15791 in stat unmatched")
check("15791" in act_u, "15791 in action unmatched")
check(set(act_u).issubset(set(stat_u)), "action unmatched subset of stat unmatched")
union = sorted(set(stat_u) | set(act_u) | set(mc_u))
check(union == ["15791", "16575", "73504", "85561", "95811"], "union ids")
check(len(union) == 5, "union 5")
check(len(stat_u) + len(act_u) + len(mc_u) == 6, "layer unmatched sum 6")
check(len(union) != len(stat_u) + len(act_u) + len(mc_u), "sum is not union")
led = snap["expansion_ledger"]
check(led["UNIQUE_UNMATCHED_NAIC_IDS_ACROSS_HIGH_YIELD_LAYERS"] == 5, "unique unmatched 5")
check(led["UNMATCHED_NAIC_IDS"] == 5, "UNMATCHED_NAIC_IDS is union")
check(led["LAYER_UNMATCHED_COUNT_SUM"] == 6, "layer unmatched sum")
check(led["EXACT_NAIC_MATCH_OBSERVATIONS"] == 1727, "1727 observations")
check(led["EXACT_NAIC_CROSSWALKS"] == 1727, "1727 crosswalks field")
check(led["EXACT_NAIC_CROSSWALKS_GRAIN"] == "sum_of_layer_specific_exact_match_counts", "grain")
check(led["EXACT_NAIC_CROSSWALKS_NOT_UNIQUE_NAIC_IDS"] is True, "not unique insurers")
check(led["UNMATCHED_UNION_EXCLUDES_FINANCIAL_EXAMS"] is True, "exams excluded")
check(led["NET_NEW_CANONICAL_AGENCIES"] == 0, "no agencies")
check(led["NET_NEW_CANONICAL_PERSONS"] == 0, "no persons")
check(led["EXISTING_ORGANIZATIONS_ENRICHED"] == 0, "no enrichment")
check(led["EXACT_PROFILE_ATTACHMENTS"] == 0, "no attachments")
check(snap["naic_crosswalk"]["regulatory_actions"]["UNMATCHED_NAIC"] == 1, "action unmatched 1")
check(snap["naic_crosswalk"]["regulatory_actions"]["EXACT_EXISTING_LEGAL_INSURER_MATCHES"] == 86, "86")
check(snap["naic_crosswalk"]["statistical_report"]["SOURCE_DISTINCT_NAIC"] == 1546, "1546 distinct")
check(snap["financial_exams"]["listing_rows"] == 85, "85 exams")
check(snap["financial_exams"]["distinct_naic"] == 70, "70 exam naic")
print("va-ins-001-tests.py pass")
