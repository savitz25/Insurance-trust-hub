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
check(snap["fingerprint"] == "d4314962fa54b866ffb1111ad4d60aba5dd9a25269734af04ff4b874cf08de58", "fingerprint")
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
print("va-ins-001-tests.py pass")
